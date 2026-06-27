import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Post-reconstruction (and post-live-tracking) sweep: lifts MIN(rank) per video
// from video_rank_history into video_summary.peak_rank fields.
//
// Why a separate job: video_summary was first populated by the backfill from
// video_stats history (which has no rank). After Tier-1 reconstruction adds
// historical rank rows, AND the live cron continues to append rank rows, we
// need a sweep that aggregates rank_history back into the summary row.
//
// Resumable via cursor (last video_id processed). Default 1000 videos per call:
//
//   cursor=""
//   while :; do
//     r=$(curl -s "$URL?cursor=$cursor&limit=1000")
//     done=$(echo "$r" | jq -r .done); next=$(echo "$r" | jq -r .nextCursor)
//     [ "$done" = "true" ] && break; cursor=$next
//   done
//
// Strategy: do the aggregation in a single CTE per batch so we get the
// peak_rank, the chart it was hit on, and the captured_at it was hit at — all
// resolved in SQL without per-row roundtrips.

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

export async function GET(request) {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10), MAX_LIMIT);
    // `onlyChanged=true` skips videos whose summary already has a peak_rank and
    // the rank_history MIN(rank) is not better. Saves writes during sweeps.
    const onlyChanged = url.searchParams.get('onlyChanged') !== 'false';

    const db = env.DB;

    // Page of video_ids that exist in video_summary, sorted by id.
    // Skip videos with no rank_history rows entirely.
    const idsRes = await db.prepare(`
      SELECT DISTINCT vs.video_id
      FROM video_summary vs
      INNER JOIN video_rank_history vrh ON vrh.video_id = vs.video_id
      WHERE vs.video_id > ?
      ORDER BY vs.video_id
      LIMIT ?
    `).bind(cursor, limit).all();

    const ids = (idsRes.results || []).map(r => r.video_id);
    if (ids.length === 0) {
      return NextResponse.json({ done: true, paged: 0, updated: 0, nextCursor: cursor });
    }

    // For each video in the batch, find its best rank (MIN), the chart that
    // produced it, and the captured_at. Tie-breaking: earliest occurrence of
    // the best rank — represents the FIRST time the video hit that peak.
    //
    // We chunk by D1's ~100 param limit and merge in JS.
    const PARAM_LIMIT = 90;
    const peakByVideo = {};
    for (let i = 0; i < ids.length; i += PARAM_LIMIT) {
      const chunk = ids.slice(i, i + PARAM_LIMIT);
      const ph = chunk.map(() => '?').join(',');
      const res = await db.prepare(`
        WITH ranked AS (
          SELECT video_id, rank, chart, captured_at,
                 ROW_NUMBER() OVER (
                   PARTITION BY video_id
                   ORDER BY rank ASC, captured_at ASC
                 ) AS rn
          FROM video_rank_history
          WHERE video_id IN (${ph})
        )
        SELECT video_id, rank AS peak_rank, chart AS peak_chart, captured_at AS peak_when
        FROM ranked WHERE rn = 1
      `).bind(...chunk).all();
      for (const r of res.results || []) peakByVideo[r.video_id] = r;
    }

    // Read current summary rows so we can skip no-op updates.
    const currByVideo = {};
    for (let i = 0; i < ids.length; i += PARAM_LIMIT) {
      const chunk = ids.slice(i, i + PARAM_LIMIT);
      const ph = chunk.map(() => '?').join(',');
      const res = await db.prepare(
        `SELECT video_id, peak_rank, peak_rank_date, peak_rank_chart FROM video_summary WHERE video_id IN (${ph})`
      ).bind(...chunk).all();
      for (const r of res.results || []) currByVideo[r.video_id] = r;
    }

    const updates = [];
    let skipped = 0;
    for (const id of ids) {
      const peak = peakByVideo[id];
      const curr = currByVideo[id];
      if (!peak) { skipped++; continue; }

      // Skip if existing peak is the same or better (lower number = better rank).
      if (onlyChanged && curr && curr.peak_rank != null && curr.peak_rank <= peak.peak_rank) {
        skipped++; continue;
      }

      updates.push(
        db.prepare(`
          UPDATE video_summary
          SET peak_rank = ?, peak_rank_date = ?, peak_rank_chart = ?, updated_at = CURRENT_TIMESTAMP
          WHERE video_id = ?
        `).bind(peak.peak_rank, peak.peak_when.slice(0, 10), peak.peak_chart, id)
      );
    }

    if (updates.length > 0) await db.batch(updates);

    return NextResponse.json({
      done: ids.length < limit,
      paged: ids.length,
      updated: updates.length,
      skipped,
      nextCursor: ids[ids.length - 1],
    });
  } catch (error) {
    console.error('[Refresh Peak Ranks] error', error);
    return NextResponse.json({ success: false, error: error?.message || 'unknown' }, { status: 500 });
  }
}
