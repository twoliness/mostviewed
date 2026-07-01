import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// One-shot analytical endpoint for the "May 2026 Gaming Lockout" chapter
// of the Q2 report. Produces:
//   1. Reconstruct-ranks-bucketed recovery numbers for the May 17-28 window
//      (from backfill_progress, which logs every batch's cursor_in / cursor_out
//      and scanned / validated / rejected).
//   2. Top-25 non-Gaming videos that survived at the head of the chart
//      (peak_rank ≤ 40) during the window.
//
// Read-only. No writes.

const LOCKOUT_FROM = '2026-05-17T00:00:00.000Z';
const LOCKOUT_TO   = '2026-05-28T00:00:00.000Z';
const GAMING_CAT_ID = 20;

export async function GET() {
  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;

  // -- Recovery numbers -----------------------------------------------------
  // reconstruct-ranks-bucketed logs one row per batch to backfill_progress.
  // Sum scanned/validated/rejected across every batch whose cursor range
  // touched the lockout window. We break out by knob profile because we ran
  // three passes (strict, relaxed, aggressive) at different knobs.
  const batchesRes = await db.prepare(`
    SELECT cursor_in, cursor_out, scanned, validated, rejected, reject_reasons
    FROM backfill_progress
    WHERE job = 'reconstruct-ranks-bucketed'
      AND cursor_out > ?
      AND cursor_in  < ?
    ORDER BY id
  `).bind(LOCKOUT_FROM, LOCKOUT_TO).all();

  // -- Top-25 non-Gaming survivors of the lockout window --------------------
  // "Survived" = held rank ≤ 40 on global:videos at least once during the
  // window. Sort by best rank achieved, tiebreak by how many 30-min ticks
  // spent in top 40 (persistence).
  const survivorsRes = await db.prepare(`
    WITH lockout AS (
      SELECT vrh.video_id, MIN(vrh.rank) AS peak_rank,
             COUNT(*) AS ticks_in_top40,
             COUNT(DISTINCT substr(vrh.captured_at, 1, 10)) AS days_in_top40
      FROM video_rank_history vrh
      JOIN videos v ON v.id = vrh.video_id
      WHERE vrh.chart = 'global:videos'
        AND vrh.captured_at >= ?
        AND vrh.captured_at <  ?
        AND vrh.rank <= 40
        AND v.category_id != ?
      GROUP BY vrh.video_id
    )
    SELECT
      v.id, v.title, v.channel_title, v.category_id,
      l.peak_rank, l.ticks_in_top40, l.days_in_top40,
      m.view_count AS current_views
    FROM lockout l
    JOIN videos v ON v.id = l.video_id
    LEFT JOIN mv_latest_video_stats m ON m.video_id = v.id
    ORDER BY l.peak_rank ASC, l.days_in_top40 DESC, l.ticks_in_top40 DESC
    LIMIT 25
  `).bind(LOCKOUT_FROM, LOCKOUT_TO, GAMING_CAT_ID).all();

  // -- Category share summary for the lockout window ------------------------
  // For the strategist takeaway "Q2 category share is skewed by this window,"
  // compute Gaming share for two windows: the lockout itself and the rest of
  // Q2 (bucketed era only). Only chart='global:videos' rows are counted so
  // we're measuring chart-head composition, not overall video volume.
  const shareRes = await db.prepare(`
    SELECT
      SUM(CASE WHEN captured_at >= ? AND captured_at < ? THEN 1 ELSE 0 END) AS lockout_rows,
      SUM(CASE WHEN captured_at >= ? AND captured_at < ? AND v.category_id = ? THEN 1 ELSE 0 END) AS lockout_gaming_rows,
      SUM(CASE WHEN (captured_at < ? OR captured_at >= ?) THEN 1 ELSE 0 END) AS rest_rows,
      SUM(CASE WHEN (captured_at < ? OR captured_at >= ?) AND v.category_id = ? THEN 1 ELSE 0 END) AS rest_gaming_rows
    FROM video_rank_history vrh
    JOIN videos v ON v.id = vrh.video_id
    WHERE vrh.chart = 'global:videos'
      AND vrh.captured_at >= '2026-04-15T00:00:00.000Z'
      AND vrh.captured_at <  '2026-06-27T00:00:00.000Z'
      AND vrh.rank <= 40
  `).bind(
    LOCKOUT_FROM, LOCKOUT_TO,
    LOCKOUT_FROM, LOCKOUT_TO, GAMING_CAT_ID,
    LOCKOUT_FROM, LOCKOUT_TO,
    LOCKOUT_FROM, LOCKOUT_TO, GAMING_CAT_ID,
  ).first();

  return NextResponse.json({
    window: { from: LOCKOUT_FROM, to: LOCKOUT_TO },
    recovery_batches: (batchesRes.results || []).map(r => ({
      ...r,
      reject_reasons: safeJson(r.reject_reasons),
    })),
    survivors_top25: survivorsRes.results || [],
    category_share_top40: {
      lockout_rows: shareRes?.lockout_rows ?? 0,
      lockout_gaming_rows: shareRes?.lockout_gaming_rows ?? 0,
      lockout_gaming_pct: pct(shareRes?.lockout_gaming_rows, shareRes?.lockout_rows),
      rest_of_q2_rows: shareRes?.rest_rows ?? 0,
      rest_of_q2_gaming_rows: shareRes?.rest_gaming_rows ?? 0,
      rest_of_q2_gaming_pct: pct(shareRes?.rest_gaming_rows, shareRes?.rest_rows),
    },
  });
}

function pct(n, d) {
  if (!d) return null;
  return Math.round(10000 * n / d) / 100;
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return s; }
}
