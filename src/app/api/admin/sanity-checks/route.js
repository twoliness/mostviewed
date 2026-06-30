import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Quick sanity-check endpoint before the Q2 report queries lean on
// peak_velocity / engagement_day1. Both come from inline rollup writes; both
// have known failure modes documented in memory.md:
//   - peak_velocity can blow up to 100M+ views/hr if pre-bucket video_stats
//     rows shared near-duplicate captured_at (memory.md "Velocity calc needs
//     a min-delta floor").
//   - engagement_day1 requires the video's first 24h of stats to sit inside
//     our collection window; videos first_seen near Q2's start may be
//     incomplete.

const Q2_START = '2026-04-01';
const Q2_END   = '2026-07-01';

// Plausible upper bound for peak views/hour. Biggest YT premieres top out
// around ~5-10M views in the first hour. Anything past this is almost
// certainly the captured_at duplicate bug.
const VELOCITY_OUTLIER_THRESHOLD = 20_000_000;

export async function GET() {
  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;

  // 1. Velocity top 20 — eyeball the head of the distribution.
  const velTopRes = await db.prepare(`
    SELECT vs.video_id, vs.peak_velocity, vs.peak_velocity_at, vs.first_seen,
           vs.current_views, v.title, v.channel_title
    FROM video_summary vs
    JOIN videos v ON v.id = vs.video_id
    WHERE vs.peak_velocity IS NOT NULL
    ORDER BY vs.peak_velocity DESC
    LIMIT 20
  `).all();

  // 2. Outlier count: how many videos have implausibly high peak_velocity.
  const outlierRes = await db.prepare(`
    SELECT COUNT(*) AS n
    FROM video_summary
    WHERE peak_velocity > ?
  `).bind(VELOCITY_OUTLIER_THRESHOLD).first();

  // 3. Velocity distribution buckets — quick histogram so we know if outliers
  //    are 5 rows or 5000.
  const velDistRes = await db.prepare(`
    SELECT
      SUM(CASE WHEN peak_velocity <  1000000   THEN 1 ELSE 0 END) AS under_1m,
      SUM(CASE WHEN peak_velocity >= 1000000   AND peak_velocity < 5000000   THEN 1 ELSE 0 END) AS m1_to_5m,
      SUM(CASE WHEN peak_velocity >= 5000000   AND peak_velocity < 20000000  THEN 1 ELSE 0 END) AS m5_to_20m,
      SUM(CASE WHEN peak_velocity >= 20000000  AND peak_velocity < 100000000 THEN 1 ELSE 0 END) AS m20_to_100m,
      SUM(CASE WHEN peak_velocity >= 100000000 THEN 1 ELSE 0 END) AS over_100m,
      COUNT(*) AS total_with_velocity
    FROM video_summary
    WHERE peak_velocity IS NOT NULL
  `).first();

  // 4. Engagement coverage across Q2.
  const engCovRes = await db.prepare(`
    SELECT
      COUNT(*) AS total_q2,
      SUM(CASE WHEN engagement_day1  IS NOT NULL THEN 1 ELSE 0 END) AS with_day1,
      SUM(CASE WHEN engagement_week1 IS NOT NULL THEN 1 ELSE 0 END) AS with_week1,
      SUM(CASE WHEN engagement_now   IS NOT NULL THEN 1 ELSE 0 END) AS with_now
    FROM video_summary
    WHERE first_seen >= ? AND first_seen < ?
  `).bind(Q2_START, Q2_END).first();

  // 5. Day-1 coverage by first_seen month — to see if early-Q2 videos are
  //    systematically missing day1 (cutoff bias).
  const engByMonthRes = await db.prepare(`
    SELECT substr(first_seen, 1, 7) AS month,
           COUNT(*) AS total,
           SUM(CASE WHEN engagement_day1 IS NOT NULL THEN 1 ELSE 0 END) AS with_day1
    FROM video_summary
    WHERE first_seen >= ? AND first_seen < ?
    GROUP BY month
    ORDER BY month
  `).bind(Q2_START, Q2_END).all();

  // 6. Sanity check: rank coverage we just backfilled.
  const rankCovRes = await db.prepare(`
    SELECT substr(captured_at, 1, 7) AS month,
           COUNT(DISTINCT captured_at) AS distinct_buckets,
           COUNT(*) AS rank_rows,
           COUNT(DISTINCT video_id) AS distinct_videos
    FROM video_rank_history
    WHERE chart = 'global:videos'
      AND captured_at >= '2026-04-01'
      AND captured_at < '2026-07-01'
    GROUP BY month
    ORDER BY month
  `).all();

  return NextResponse.json({
    velocity: {
      top20: velTopRes.results,
      outlier_threshold: VELOCITY_OUTLIER_THRESHOLD,
      outlier_count: outlierRes?.n ?? 0,
      distribution: velDistRes,
    },
    engagement_q2: {
      coverage: engCovRes,
      by_month: engByMonthRes.results,
    },
    rank_coverage_q2: {
      by_month: rankCovRes.results,
    },
    velocity_q2: await (async () => {
      const dist = await db.prepare(`
        SELECT
          SUM(CASE WHEN peak_velocity <  1000000   THEN 1 ELSE 0 END) AS under_1m,
          SUM(CASE WHEN peak_velocity >= 1000000   AND peak_velocity < 5000000   THEN 1 ELSE 0 END) AS m1_to_5m,
          SUM(CASE WHEN peak_velocity >= 5000000   AND peak_velocity < 20000000  THEN 1 ELSE 0 END) AS m5_to_20m,
          SUM(CASE WHEN peak_velocity >= 20000000  THEN 1 ELSE 0 END) AS over_20m,
          COUNT(*) AS total_with_velocity
        FROM video_summary
        WHERE peak_velocity IS NOT NULL
          AND first_seen >= ? AND first_seen < ?
      `).bind(Q2_START, Q2_END).first();
      const top = await db.prepare(`
        SELECT vs.video_id, vs.peak_velocity, vs.peak_velocity_at, vs.first_seen, v.title
        FROM video_summary vs JOIN videos v ON v.id = vs.video_id
        WHERE vs.peak_velocity IS NOT NULL
          AND vs.first_seen >= ? AND vs.first_seen < ?
        ORDER BY vs.peak_velocity DESC LIMIT 10
      `).bind(Q2_START, Q2_END).all();
      return { distribution: dist, top10: top.results };
    })(),
  });
}
