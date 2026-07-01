import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// One-shot analytical endpoint that produces every number needed for the
// Q2 2026 US Trending Playbook report chapters 1-7 (chapter 5 has its own
// endpoint). Read-only. No writes.
//
// Q2 scope: first_seen between 2026-04-15 (bucketed rank era begins) and
// 2026-06-27 (live rank capture takes over — cutoff of the backfill).

const Q2_FROM = '2026-04-15T00:00:00.000Z';
const Q2_TO   = '2026-06-27T00:00:00.000Z';
const GAMING  = 20;

// PT###M###S -> seconds (rough; ignores hours in shorts context)
function isoDurationBucket(iso) {
  if (!iso) return 'unknown';
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 'unknown';
  const h = parseInt(m[1] || '0', 10);
  const mn = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  const total = h * 3600 + mn * 60 + s;
  if (total <= 180) return 'shorts_<=3m';
  if (total <= 600) return 'short_form_3-10m';
  if (total <= 1800) return 'medium_10-30m';
  return 'long_>30m';
}

export async function GET() {
  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;

  // ---------------------------------------------------------------------------
  // Chapter 1 — Format Ledger. Median days_on_chart and peak_rank for each
  // (category, duration bucket) pair with sample size ≥ 30. We fetch the raw
  // rows and aggregate in JS because SQLite lacks native median.
  // ---------------------------------------------------------------------------
  const formatRes = await db.prepare(`
    SELECT vs.video_id, vs.category_id, v.duration,
           vs.days_on_chart, vs.peak_rank,
           vs.trending_appearances
    FROM video_summary vs
    JOIN videos v ON v.id = vs.video_id
    WHERE vs.first_seen >= ? AND vs.first_seen < ?
      AND vs.peak_rank IS NOT NULL
  `).bind(Q2_FROM, Q2_TO).all();

  const formatBuckets = new Map();
  for (const r of (formatRes.results || [])) {
    const bucket = isoDurationBucket(r.duration);
    const key = `${r.category_id}|${bucket}`;
    if (!formatBuckets.has(key)) formatBuckets.set(key, { category_id: r.category_id, duration_bucket: bucket, days: [], peaks: [], appearances: [] });
    const g = formatBuckets.get(key);
    g.days.push(r.days_on_chart);
    g.peaks.push(r.peak_rank);
    g.appearances.push(r.trending_appearances);
  }
  const median = (a) => {
    if (a.length === 0) return null;
    const s = a.slice().sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const formatLedger = [...formatBuckets.values()]
    .filter(g => g.days.length >= 30)
    .map(g => ({
      category_id: g.category_id,
      duration_bucket: g.duration_bucket,
      n: g.days.length,
      median_days_on_chart: median(g.days),
      median_peak_rank: median(g.peaks),
      median_trending_appearances: median(g.appearances),
    }))
    .sort((a, b) => a.median_peak_rank - b.median_peak_rank || b.median_days_on_chart - a.median_days_on_chart);

  // ---------------------------------------------------------------------------
  // Chapter 2 — Champions & Holders. Creators with ≥ 2 Q2 videos hitting the
  // top 25 on any global:videos chart. Rank on best-of-portfolio then depth.
  // ---------------------------------------------------------------------------
  const championsRes = await db.prepare(`
    WITH q2_top25 AS (
      SELECT vs.video_id, vs.channel_id, vs.peak_rank, vs.days_on_chart,
             vs.current_views, vs.first_seen
      FROM video_summary vs
      WHERE vs.first_seen >= ? AND vs.first_seen < ?
        AND vs.peak_rank IS NOT NULL AND vs.peak_rank <= 25
    ),
    creator_agg AS (
      SELECT channel_id,
             COUNT(*) AS videos_top25,
             MIN(peak_rank) AS best_peak,
             SUM(days_on_chart) AS total_days_on_chart,
             SUM(current_views) AS total_current_views
      FROM q2_top25
      GROUP BY channel_id
      HAVING videos_top25 >= 2
    )
    SELECT ca.channel_id,
           COALESCE(c.channel_title, MAX(v.channel_title)) AS channel_title,
           c.subscriber_count,
           ca.videos_top25,
           ca.best_peak,
           ca.total_days_on_chart,
           ca.total_current_views
    FROM creator_agg ca
    LEFT JOIN creators c ON c.channel_id = ca.channel_id
    LEFT JOIN videos v ON v.channel_id = ca.channel_id
    GROUP BY ca.channel_id
    ORDER BY ca.videos_top25 DESC, ca.best_peak ASC, ca.total_days_on_chart DESC
    LIMIT 25
  `).bind(Q2_FROM, Q2_TO).all();

  // ---------------------------------------------------------------------------
  // Chapter 3 — Fastest Breakouts. Top Q2 videos by peak_velocity (post
  // strict-heuristic recompute — 0 outliers > 20M v/hr).
  // ---------------------------------------------------------------------------
  const breakoutsRes = await db.prepare(`
    SELECT vs.video_id, vs.peak_velocity, vs.peak_velocity_at,
           vs.first_seen, vs.peak_rank, vs.days_on_chart,
           v.title, v.channel_title, v.category_id, v.duration, v.is_short
    FROM video_summary vs
    JOIN videos v ON v.id = vs.video_id
    WHERE vs.first_seen >= ? AND vs.first_seen < ?
      AND vs.peak_velocity IS NOT NULL
      AND vs.peak_velocity < 20000000
    ORDER BY vs.peak_velocity DESC
    LIMIT 25
  `).bind(Q2_FROM, Q2_TO).all();

  // ---------------------------------------------------------------------------
  // Chapter 4 — Engagement Holds. Median day1 / week1 / now engagement per
  // category, over videos with BOTH day1 and week1 non-null (~11k videos).
  // ---------------------------------------------------------------------------
  const engagementRes = await db.prepare(`
    SELECT vs.category_id, vs.engagement_day1, vs.engagement_week1, vs.engagement_now
    FROM video_summary vs
    WHERE vs.first_seen >= ? AND vs.first_seen < ?
      AND vs.engagement_day1 IS NOT NULL
      AND vs.engagement_week1 IS NOT NULL
      AND vs.engagement_now IS NOT NULL
  `).bind(Q2_FROM, Q2_TO).all();

  const engByCat = new Map();
  for (const r of (engagementRes.results || [])) {
    if (!engByCat.has(r.category_id)) engByCat.set(r.category_id, { category_id: r.category_id, day1: [], week1: [], now: [] });
    const g = engByCat.get(r.category_id);
    g.day1.push(r.engagement_day1);
    g.week1.push(r.engagement_week1);
    g.now.push(r.engagement_now);
  }
  const engagementHolds = [...engByCat.values()]
    .filter(g => g.day1.length >= 50)
    .map(g => ({
      category_id: g.category_id,
      n: g.day1.length,
      median_day1_pct: (median(g.day1) * 100).toFixed(3),
      median_week1_pct: (median(g.week1) * 100).toFixed(3),
      median_now_pct: (median(g.now) * 100).toFixed(3),
      hold_ratio_week1_to_day1: median(g.week1) / median(g.day1),
      hold_ratio_now_to_day1: median(g.now) / median(g.day1),
    }))
    .sort((a, b) => b.hold_ratio_now_to_day1 - a.hold_ratio_now_to_day1);

  // ---------------------------------------------------------------------------
  // Chapter 6 — Category Rotation. Week-by-week top-25 share by category over
  // the bucketed-era Q2 window. One row per (week_start, category_id).
  // ---------------------------------------------------------------------------
  const rotationRes = await db.prepare(`
    WITH weekly AS (
      SELECT
        DATE(vrh.captured_at, 'weekday 0', '-6 days') AS week_start,
        v.category_id,
        COUNT(*) AS rows_at_top25
      FROM video_rank_history vrh
      JOIN videos v ON v.id = vrh.video_id
      WHERE vrh.chart = 'global:videos'
        AND vrh.captured_at >= ?
        AND vrh.captured_at <  ?
        AND vrh.rank <= 25
      GROUP BY week_start, v.category_id
    )
    SELECT week_start, category_id, rows_at_top25,
           SUM(rows_at_top25) OVER (PARTITION BY week_start) AS week_total,
           1.0 * rows_at_top25 / SUM(rows_at_top25) OVER (PARTITION BY week_start) AS share
    FROM weekly
    ORDER BY week_start, share DESC
  `).bind(Q2_FROM, Q2_TO).all();

  // ---------------------------------------------------------------------------
  // Chapter 7 — Q2-close signals. Creators still climbing in the final week
  // (last_seen within 3 days of Q2 close AND days_on_chart >= 3), and the
  // late-June breakout candidates that had graduated / been promoted.
  // ---------------------------------------------------------------------------
  const closeCreatorsRes = await db.prepare(`
    SELECT vs.video_id, vs.channel_id, v.title, v.channel_title, v.category_id,
           vs.peak_rank, vs.days_on_chart, vs.current_views, vs.first_seen, vs.last_seen
    FROM video_summary vs
    JOIN videos v ON v.id = vs.video_id
    WHERE vs.last_seen >= '2026-06-24T00:00:00.000Z'
      AND vs.days_on_chart >= 3
      AND vs.peak_rank IS NOT NULL AND vs.peak_rank <= 25
    ORDER BY vs.days_on_chart DESC, vs.peak_rank ASC
    LIMIT 25
  `).all();

  let breakoutCandidatesRes = { results: [] };
  try {
    breakoutCandidatesRes = await db.prepare(`
      SELECT bc.video_id, bc.source_chart, bc.source_rank,
             bc.age_hours_at_detection, bc.velocity_at_detection,
             bc.current_velocity, bc.peak_velocity, bc.score,
             bc.status, bc.detected_at,
             v.title, v.channel_title, v.category_id
      FROM breakout_candidates bc
      JOIN videos v ON v.id = bc.video_id
      WHERE bc.detected_at >= '2026-06-25T00:00:00.000Z'
      ORDER BY bc.score DESC
      LIMIT 25
    `).all();
  } catch { /* table optional */ }

  // ---------------------------------------------------------------------------
  // Aggregate stats for the report intro / methodology.
  // ---------------------------------------------------------------------------
  const aggregateRes = await db.prepare(`
    SELECT
      COUNT(*) AS q2_videos,
      COUNT(DISTINCT channel_id) AS q2_channels,
      SUM(days_on_chart) AS q2_video_chart_days,
      COUNT(CASE WHEN is_short = 1 THEN 1 END) AS q2_shorts,
      COUNT(CASE WHEN is_short = 0 THEN 1 END) AS q2_videos_long
    FROM video_summary
    WHERE first_seen >= ? AND first_seen < ?
  `).bind(Q2_FROM, Q2_TO).first();

  const rankRowsRes = await db.prepare(`
    SELECT COUNT(*) AS rank_rows
    FROM video_rank_history
    WHERE chart = 'global:videos'
      AND captured_at >= ? AND captured_at < ?
  `).bind(Q2_FROM, Q2_TO).first();

  return NextResponse.json({
    window: { from: Q2_FROM, to: Q2_TO, note: 'Bucketed rank era. Excludes pre-Apr-15 unbucketed captures and post-Jun-27 live-capture rows.' },
    aggregate: {
      ...aggregateRes,
      rank_rows_global_videos: rankRowsRes?.rank_rows ?? 0,
    },
    chapter1_format_ledger: formatLedger,
    chapter2_champions: championsRes.results || [],
    chapter3_breakouts: breakoutsRes.results || [],
    chapter4_engagement_holds: engagementHolds,
    chapter6_category_rotation: rotationRes.results || [],
    chapter7_close_creators: closeCreatorsRes.results || [],
    chapter7_breakout_candidates: breakoutCandidatesRes.results || [],
  });
}
