import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Backfill historical video_daily_stats from video_stats.
// Paginates by DAY (oldest first by default). Each call processes up to `days`
// consecutive days, single INSERT...SELECT per day (~3k distinct videos/day,
// ~175k stat rows/day in practice — well within D1's query budget).
//
// Usage (chained loop):
//   cursor=""   # empty = start from earliest day in video_stats
//   while :; do
//     r=$(curl -s "$URL?cursor=$cursor&days=7")
//     done=$(echo "$r" | jq -r .done); next=$(echo "$r" | jq -r .nextCursor)
//     [ "$done" = "true" ] && break; cursor=$next
//   done

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

async function foldDay(db, day) {
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

function nextDay(day) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    const db = env.DB;

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') || '';
    const days = Math.min(parseInt(url.searchParams.get('days') || DEFAULT_DAYS, 10), MAX_DAYS);
    // Optional: cap so we don't fold "today" (incomplete) or future days.
    const stopAt = url.searchParams.get('stopAt')
      || new Date().toISOString().slice(0, 10); // exclusive — never include today by default

    // Resolve starting day.
    let startDay = cursor;
    if (!startDay) {
      const first = await db.prepare(
        `SELECT MIN(DATE(captured_at)) AS day FROM video_stats`
      ).first();
      startDay = first?.day;
      if (!startDay) return NextResponse.json({ done: true, message: 'no video_stats rows' });
    }

    const processed = [];
    let day = startDay;
    for (let i = 0; i < days; i++) {
      if (day >= stopAt) break;
      const rows = await foldDay(db, day);
      processed.push({ day, rows });
      day = nextDay(day);
    }

    const done = day >= stopAt;
    return NextResponse.json({
      done,
      processed,
      totalRows: processed.reduce((s, p) => s + p.rows, 0),
      nextCursor: done ? null : day,
      stopAt,
    });
  } catch (error) {
    console.error('[Backfill Daily Stats] error', error);
    return NextResponse.json({ success: false, error: error?.message || 'unknown' }, { status: 500 });
  }
}
