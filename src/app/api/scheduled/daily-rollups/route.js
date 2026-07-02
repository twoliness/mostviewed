import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Daily rebuild of creator_summary, country_daily_summary, country_category_daily.
// Run via cron (~03:00 UTC) and reachable manually via POST/GET for backfill.
//
// Strategy: blow away the previous day's rows (or upsert for idempotency) and
// rebuild from video_summary + video_rank_history. Volume bounded by N creators
// + 5 countries × N days. Fast even on 200K videos because video_summary is one
// row per video.

// Daily fold: per-video aggregate of yesterday's video_stats into video_daily_stats.
// Single INSERT...SELECT per day keeps data server-side. ~3k distinct videos/day in
// practice, so even the full-day GROUP BY runs in well under the D1 query budget.
async function foldDailyStats(db, day) {
  const dayStart = `${day}T00:00:00.000Z`;
  const dayEnd = `${day}T23:59:59.999Z`;
  // peak_velocity = MAX views/hour between consecutive same-day snapshots,
  // matching computeVelocity() in src/lib/rollups.js: ≥10-min apart, non-negative dv.
  const res = await db.prepare(`
    WITH base AS (
      SELECT
        video_id,
        MIN(view_count) AS views_start,
        MAX(view_count) AS views_end,
        MAX(view_count) - MIN(view_count) AS views_delta,
        MAX(like_count) - MIN(like_count) AS likes_delta,
        MAX(comment_count) - MIN(comment_count) AS comments_delta,
        COUNT(*) AS snapshot_count,
        CASE WHEN MAX(view_count) > 0
          THEN (CAST(COALESCE(MAX(like_count),0) AS REAL)
              + CAST(COALESCE(MAX(comment_count),0) AS REAL))
              / MAX(view_count)
          ELSE NULL END AS engagement_rate
      FROM video_stats
      WHERE captured_at >= ?1 AND captured_at <= ?2
      GROUP BY video_id
    ),
    deltas AS (
      SELECT
        video_id,
        view_count - LAG(view_count) OVER w AS dv,
        (julianday(captured_at) - julianday(LAG(captured_at) OVER w)) * 24.0 AS dt_hours
      FROM video_stats
      WHERE captured_at >= ?1 AND captured_at <= ?2
      WINDOW w AS (PARTITION BY video_id ORDER BY captured_at, id)
    ),
    peak AS (
      SELECT video_id,
             MAX(CASE WHEN dt_hours >= (10.0/60.0) AND dv >= 0 THEN dv * 1.0 / dt_hours END) AS peak_velocity
      FROM deltas
      GROUP BY video_id
    )
    INSERT INTO video_daily_stats
      (video_id, day, views_start, views_end, views_delta,
       likes_delta, comments_delta, snapshot_count, engagement_rate, peak_velocity)
    SELECT base.video_id, ?3, base.views_start, base.views_end, base.views_delta,
           base.likes_delta, base.comments_delta, base.snapshot_count, base.engagement_rate,
           peak.peak_velocity
    FROM base LEFT JOIN peak USING (video_id)
    ON CONFLICT(video_id, day) DO UPDATE SET
      views_start = excluded.views_start,
      views_end = excluded.views_end,
      views_delta = excluded.views_delta,
      likes_delta = excluded.likes_delta,
      comments_delta = excluded.comments_delta,
      snapshot_count = excluded.snapshot_count,
      engagement_rate = excluded.engagement_rate,
      peak_velocity = excluded.peak_velocity
  `).bind(dayStart, dayEnd, day).run();
  return res?.meta?.changes ?? 0;
}

const CHART_PREFIX_BY_COUNTRY = {
  US: 'country:US',
  GB: 'country:GB',
  CA: 'country:CA',
  AU: 'country:AU',
  IN: 'country:IN',
};

async function rebuildCreatorSummary(db) {
  // GROUP BY channel_id. SQLite has no built-in mode/argmax, so best-peak-video
  // is resolved with a correlated subquery (cheap because indexed).
  // Single statement = single round-trip rewrite.
  await db.exec('DELETE FROM creator_summary');
  const res = await db.prepare(`
    WITH agg AS (
      SELECT
        channel_id,
        COUNT(*) AS videos_tracked,
        COALESCE(SUM(trending_appearances), 0) AS trending_appearances,
        MIN(peak_rank) AS best_peak_rank,
        AVG(days_on_chart) AS avg_days_on_chart,
        SUM(CASE WHEN last_seen >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS currently_trending_count,
        SUM(current_views) AS total_views
      FROM video_summary
      GROUP BY channel_id
    ),
    peak_counts AS (
      SELECT vs.channel_id, COUNT(*) AS best_peak_rank_count
      FROM video_summary vs
      JOIN agg ON agg.channel_id = vs.channel_id
      WHERE vs.peak_rank IS NOT NULL AND vs.peak_rank = agg.best_peak_rank
      GROUP BY vs.channel_id
    ),
    best_video AS (
      SELECT vs.channel_id, vs.video_id
      FROM video_summary vs
      JOIN agg ON agg.channel_id = vs.channel_id
      WHERE vs.peak_rank IS NOT NULL AND vs.peak_rank = agg.best_peak_rank
      GROUP BY vs.channel_id
      HAVING vs.current_views = MAX(vs.current_views)
    )
    INSERT INTO creator_summary (
      channel_id, videos_tracked, trending_appearances,
      best_peak_rank, best_peak_video_id, best_peak_rank_count,
      avg_days_on_chart, currently_trending_count, total_views, updated_at
    )
    SELECT
      agg.channel_id, agg.videos_tracked, agg.trending_appearances,
      agg.best_peak_rank, bv.video_id, COALESCE(pc.best_peak_rank_count, 0),
      agg.avg_days_on_chart, agg.currently_trending_count, agg.total_views,
      CURRENT_TIMESTAMP
    FROM agg
    LEFT JOIN best_video bv USING (channel_id)
    LEFT JOIN peak_counts pc USING (channel_id)
  `).run();
  return res?.meta?.changes ?? 0;
}

async function rebuildCountryDay(db, country, day) {
  const chartPrefix = `${CHART_PREFIX_BY_COUNTRY[country]}%`;

  // Check whether any chart rows exist for this country+day before doing heavy work.
  const countRow = await db.prepare(`
    SELECT COUNT(DISTINCT video_id) AS n
    FROM video_rank_history
    WHERE chart LIKE ? AND DATE(captured_at) = ?
  `).bind(chartPrefix, day).first();

  const videoCount = countRow?.n ?? 0;
  if (videoCount === 0) {
    await db.prepare(`
      INSERT INTO country_daily_summary (country_code, day, videos_tracked, total_views, updated_at)
      VALUES (?, ?, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(country_code, day) DO UPDATE SET
        videos_tracked = 0, total_views = 0, top_video_id = NULL,
        top_creator_id = NULL, top_creator_video_count = NULL,
        updated_at = CURRENT_TIMESTAMP
    `).bind(country, day).run();
    return { country, day, videos: 0 };
  }

  // Use a subquery to avoid binding 100+ video IDs (D1 caps bound params at 100).
  const agg = await db.prepare(`
    WITH chart_videos AS (
      SELECT DISTINCT video_id
      FROM video_rank_history
      WHERE chart LIKE ?1 AND DATE(captured_at) = ?2
    ),
    videos_in_day AS (
      SELECT vs.video_id, vs.channel_id, vs.category_id, vs.current_views
      FROM video_summary vs
      JOIN chart_videos cv ON cv.video_id = vs.video_id
    ),
    totals AS (
      SELECT COUNT(*) AS videos_tracked, COALESCE(SUM(current_views),0) AS total_views
      FROM videos_in_day
    ),
    top_video AS (
      SELECT video_id FROM videos_in_day ORDER BY current_views DESC LIMIT 1
    ),
    top_creator AS (
      SELECT channel_id, COUNT(*) AS n FROM videos_in_day
      GROUP BY channel_id ORDER BY n DESC, SUM(current_views) DESC LIMIT 1
    )
    SELECT t.videos_tracked, t.total_views,
           (SELECT video_id FROM top_video) AS top_video_id,
           (SELECT channel_id FROM top_creator) AS top_creator_id,
           (SELECT n FROM top_creator) AS top_creator_video_count
    FROM totals t
  `).bind(chartPrefix, day).first();

  await db.prepare(`
    INSERT INTO country_daily_summary
      (country_code, day, videos_tracked, total_views, top_video_id, top_creator_id, top_creator_video_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(country_code, day) DO UPDATE SET
      videos_tracked = excluded.videos_tracked,
      total_views = excluded.total_views,
      top_video_id = excluded.top_video_id,
      top_creator_id = excluded.top_creator_id,
      top_creator_video_count = excluded.top_creator_video_count,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    country, day,
    agg.videos_tracked, agg.total_views,
    agg.top_video_id, agg.top_creator_id, agg.top_creator_video_count
  ).run();

  // Per-category totals — also use subquery, not a bound IN list.
  await db.prepare(`DELETE FROM country_category_daily WHERE country_code = ? AND day = ?`)
    .bind(country, day).run();
  const catRes = await db.prepare(`
    WITH chart_videos AS (
      SELECT DISTINCT video_id
      FROM video_rank_history
      WHERE chart LIKE ?1 AND DATE(captured_at) = ?2
    )
    SELECT vs.category_id, COALESCE(SUM(vs.current_views),0) AS total_views
    FROM video_summary vs
    JOIN chart_videos cv ON cv.video_id = vs.video_id
    WHERE vs.category_id IS NOT NULL
    GROUP BY vs.category_id
    ORDER BY total_views DESC
  `).bind(chartPrefix, day).all();

  const catStmts = (catRes.results || []).map(r =>
    db.prepare(`INSERT INTO country_category_daily (country_code, day, category_id, total_views) VALUES (?, ?, ?, ?)`)
      .bind(country, day, r.category_id, r.total_views)
  );
  if (catStmts.length) await db.batch(catStmts);

  return { country, day, videos: videoCount, categories: catStmts.length };
}

async function run(env) {
  const db = env.DB;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Cron runs at 03:25 UTC — yesterday's day is fully captured.
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const creatorRows = await rebuildCreatorSummary(db);
  const dailyStatsRows = await foldDailyStats(db, yesterday);

  const countryResults = [];
  for (const country of Object.keys(CHART_PREFIX_BY_COUNTRY)) {
    countryResults.push(await rebuildCountryDay(db, country, today));
  }

  return { creatorRows, dailyStatsRows, dailyStatsDay: yesterday, today, countries: countryResults };
}

export async function POST() {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    const result = await run(env);
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[Daily Rollups] error', error);
    return NextResponse.json({ success: false, error: error?.message || 'unknown' }, { status: 500 });
  }
}

export async function GET() { return POST(); }
