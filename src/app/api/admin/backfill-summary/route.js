import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Backfills video_summary from existing video_stats history. Resumable via
// `cursor` (last processed video id). Designed to be called in a loop:
//
//   cursor=""
//   while :; do
//     r=$(curl -s "http://localhost:8787/api/admin/backfill-summary?cursor=$cursor&limit=500")
//     done=$(echo "$r" | jq -r .done); next=$(echo "$r" | jq -r .nextCursor)
//     [ "$done" = "true" ] && break
//     cursor=$next
//   done
//
// Backfill omits rank fields (current_rank, peak_rank, *_chart) — those have
// no historical source and start accumulating from the next cron tick.

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const D1_PARAM_LIMIT = 90; // D1 caps bound params at ~100; leave headroom.

export async function GET(request) {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const onlyMissing = url.searchParams.get('onlyMissing') !== 'false';

    const db = env.DB;

    // 1. Page through videos by id.
    const filterMissing = onlyMissing
      ? `AND NOT EXISTS (SELECT 1 FROM video_summary s WHERE s.video_id = v.id)`
      : '';
    const pageRes = await db.prepare(
      `SELECT v.id, v.channel_id, v.is_short, v.category_id
       FROM videos v
       WHERE v.id > ? ${filterMissing}
       ORDER BY v.id
       LIMIT ?`
    ).bind(cursor, limit).all();

    const videos = pageRes.results || [];
    if (videos.length === 0) {
      return NextResponse.json({ done: true, processed: 0, nextCursor: cursor });
    }

    const ids = videos.map(v => v.id);

    // 2. Aggregate per-video stats history. D1 caps bound params at ~100, so
    // we chunk the ID list and merge results in JS.
    const aggById = {};
    for (let i = 0; i < ids.length; i += D1_PARAM_LIMIT) {
      const chunk = ids.slice(i, i + D1_PARAM_LIMIT);
      const placeholders = chunk.map(() => '?').join(',');
      const chunkRes = await db.prepare(buildAggregateSql(placeholders)).bind(...chunk).all();
      for (const r of chunkRes.results || []) aggById[r.video_id] = r;
    }

    // 3. Build upserts. Skip videos with no stats rows.
    const upserts = [];
    for (const meta of videos) {
      const a = aggById[meta.id];
      if (!a) continue;

      const engagementNow = a.current_views
        ? ((a.current_likes || 0) + (a.current_comments || 0)) / a.current_views
        : null;

      upserts.push(
        db.prepare(`
          INSERT INTO video_summary (
            video_id, channel_id, is_short, category_id,
            first_seen, last_seen, days_on_chart, trending_appearances,
            current_rank, current_chart, current_views, current_likes, current_comments,
            peak_rank, peak_rank_date, peak_rank_chart,
            peak_velocity, peak_velocity_at,
            engagement_day1, engagement_week1, engagement_now,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(video_id) DO UPDATE SET
            first_seen = MIN(excluded.first_seen, video_summary.first_seen),
            last_seen  = MAX(excluded.last_seen,  video_summary.last_seen),
            days_on_chart = MAX(excluded.days_on_chart, video_summary.days_on_chart),
            trending_appearances = MAX(excluded.trending_appearances, video_summary.trending_appearances),
            current_views = excluded.current_views,
            current_likes = excluded.current_likes,
            current_comments = excluded.current_comments,
            peak_velocity = MAX(
              COALESCE(excluded.peak_velocity, 0),
              COALESCE(video_summary.peak_velocity, 0)
            ),
            peak_velocity_at = CASE
              WHEN excluded.peak_velocity IS NOT NULL
               AND (video_summary.peak_velocity IS NULL OR excluded.peak_velocity > video_summary.peak_velocity)
              THEN excluded.peak_velocity_at ELSE video_summary.peak_velocity_at END,
            engagement_now = excluded.engagement_now,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          meta.id,
          meta.channel_id,
          meta.is_short,
          meta.category_id,
          a.first_seen,
          a.last_seen,
          a.days_on_chart,
          a.trending_appearances,
          a.current_views,
          a.current_likes,
          a.current_comments,
          a.peak_velocity,
          a.peak_velocity_at,
          engagementNow, // engagement_day1 — placeholder; recomputed by daily rollup later
          engagementNow, // engagement_week1 — same
          engagementNow,
        )
      );
    }

    if (upserts.length > 0) await db.batch(upserts);

    const nextCursor = videos[videos.length - 1].id;
    return NextResponse.json({
      done: videos.length < limit,
      processed: upserts.length,
      pagedVideos: videos.length,
      nextCursor,
    });
  } catch (error) {
    console.error('[Backfill] error', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'unknown',
    }, { status: 500 });
  }
}

function buildAggregateSql(placeholders) {
  return `WITH ordered AS (
     SELECT video_id, captured_at, view_count, like_count, comment_count,
       LAG(view_count) OVER (PARTITION BY video_id ORDER BY captured_at) AS prev_views,
       LAG(captured_at) OVER (PARTITION BY video_id ORDER BY captured_at) AS prev_at,
       ROW_NUMBER() OVER (PARTITION BY video_id ORDER BY captured_at DESC) AS rn_desc,
       ROW_NUMBER() OVER (PARTITION BY video_id ORDER BY captured_at ASC)  AS rn_asc
     FROM video_stats
     WHERE video_id IN (${placeholders})
   ),
   firstrow AS (SELECT video_id, captured_at AS first_seen FROM ordered WHERE rn_asc = 1),
   lastrow  AS (
     SELECT video_id, captured_at AS last_seen, view_count AS current_views,
            like_count AS current_likes, comment_count AS current_comments
     FROM ordered WHERE rn_desc = 1
   ),
   vel AS (
     SELECT video_id,
            MAX(CASE
                  WHEN prev_views IS NOT NULL
                   AND view_count >= prev_views
                   AND (julianday(captured_at) - julianday(prev_at)) >= (10.0/1440)  -- ignore pairs <10 min apart; pre-bucketing data has near-duplicates that produce absurd velocities
                  THEN (view_count - prev_views) * 1.0
                       / ((julianday(captured_at) - julianday(prev_at)) * 24)
                END) AS peak_velocity
     FROM ordered GROUP BY video_id
   ),
   vel_when AS (
     SELECT o.video_id, MIN(o.captured_at) AS peak_velocity_at
     FROM ordered o
     JOIN vel ON vel.video_id = o.video_id
     WHERE o.prev_views IS NOT NULL
       AND o.view_count >= o.prev_views
       AND (julianday(o.captured_at) - julianday(o.prev_at)) >= (10.0/1440)
       AND ABS(
             ((o.view_count - o.prev_views) * 1.0
              / ((julianday(o.captured_at) - julianday(o.prev_at)) * 24))
             - vel.peak_velocity
           ) < 0.5
     GROUP BY o.video_id
   ),
   days AS (
     SELECT video_id, COUNT(DISTINCT DATE(captured_at)) AS days_on_chart,
                      COUNT(*) AS trending_appearances
     FROM ordered GROUP BY video_id
   )
   SELECT f.video_id, f.first_seen, l.last_seen,
          l.current_views, l.current_likes, l.current_comments,
          v.peak_velocity, vw.peak_velocity_at,
          d.days_on_chart, d.trending_appearances
   FROM firstrow f
   JOIN lastrow l USING (video_id)
   LEFT JOIN vel v USING (video_id)
   LEFT JOIN vel_when vw USING (video_id)
   JOIN days d USING (video_id)`;
}
