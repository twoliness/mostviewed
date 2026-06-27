import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Tier-1 historical rank reconstruction: only global:videos and global:shorts.
// We agreed to ship this alone first (~99% confidence) and decide on category /
// country tiers based on whether per-page UI ever needs them.
//
// Approach (no heavy SQL aggregation — D1 OOM'd on GROUP BY scans):
//   1. Page through distinct captured_at values cheaply via the index on
//      video_stats(captured_at).
//   2. Classify each timestamp's cron source by its minute-of-hour:
//        [0..4]   or [30..34]  -> videos cron   (global:videos = first fetch)
//        [15..19] or [45..49]  -> shorts cron   (global:shorts = first fetch)
//      countries (:05) is intentionally NOT processed.
//   3. The FIRST captured_at we observe for a given (date, hour, cron_kind)
//      tuple within a single endpoint call is treated as the global fetch.
//      Subsequent captured_ats from the same run are skipped.
//   4. For each candidate, validate (size + distinct categories + uniform is_short)
//      and INSERT OR IGNORE ranked rows into video_rank_history.
//
// Only processes pre-bucket data (captured_at < 2026-04-15).

const PRE_BUCKET_CUTOFF = '2026-04-15T00:00:00.000Z';

const DEFAULT_LIMIT = 500;     // distinct captured_at values scanned per call
const MAX_LIMIT = 3000;
const MIN_GLOBAL_SIZE = 20;
const MIN_DISTINCT_CATS = 3;   // real globals had only 4-6 distinct cats — music/gaming-dominated; 3 is enough to rule out single-category fetches (which had 1-2)

function classifyMinute(mn) {
  if (mn >= 0 && mn <= 4)   return 'videos';   // :00 cron run
  if (mn >= 30 && mn <= 34) return 'videos';   // :30 cron run
  if (mn >= 15 && mn <= 19) return 'shorts';
  if (mn >= 45 && mn <= 49) return 'shorts';
  return null;
}

// runKey scopes "first per cron run" detection. Two captured_ats in the same
// hour + same cron_kind belong to the same run.
function runKey(captured_at, cronKind) {
  // YYYY-MM-DD + hour + halfHour (so :00 and :30 are separate runs)
  const day = captured_at.slice(0, 10);
  const hr = captured_at.slice(11, 13);
  const mn = parseInt(captured_at.slice(14, 16), 10);
  const half = mn < 15 ? 'a' : (mn < 30 ? 'b' : (mn < 45 ? 'c' : 'd'));
  return `${day}T${hr}:${half}:${cronKind}`;
}

export async function GET(request) {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') || '1970-01-01T00:00:00.000Z';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const cutoff = url.searchParams.get('cutoff') || PRE_BUCKET_CUTOFF;

    const db = env.DB;

    // Pull distinct captured_at values via the index (cheap — no aggregation).
    const tsRes = await db.prepare(`
      SELECT DISTINCT captured_at
      FROM video_stats
      WHERE captured_at > ? AND captured_at < ?
      ORDER BY captured_at
      LIMIT ?
    `).bind(cursor, cutoff, limit).all();

    const tsList = (tsRes.results || []).map(r => r.captured_at);
    if (tsList.length === 0) {
      return NextResponse.json({ done: true, scanned: 0, validated: 0, rejected: 0, inserted: 0, nextCursor: cursor });
    }

    let validated = 0, rejected = 0, totalInserted = 0;
    const rejectReasons = { too_small: 0, too_few_cats: 0 };
    const seenRuns = new Set();

    for (const ts of tsList) {
      const mn = parseInt(ts.slice(14, 16), 10);
      const cronKind = classifyMinute(mn);
      if (!cronKind) continue;

      const key = runKey(ts, cronKind);
      if (seenRuns.has(key)) continue;     // not the first capture of this run; skip
      seenRuns.add(key);

      const isShortsCron = cronKind === 'shorts';
      const chart = isShortsCron ? 'global:shorts' : 'global:videos';

      // We intentionally do NOT require uniform is_short. In the earliest era
      // (pre videos/shorts cron split), the unified chart=mostPopular fetch
      // returned BOTH shorts and long-form videos in a single ranked list.
      // YouTube's rank applies to the mixed list as-is. Chart name is set by
      // which cron wrote the rows (the cron split came later).
      const check = await db.prepare(`
        SELECT COUNT(*) AS n_rows,
               COUNT(DISTINCT v.category_id) AS distinct_cats
        FROM video_stats vs
        JOIN videos v ON v.id = vs.video_id
        WHERE vs.captured_at = ?
      `).bind(ts).first();

      if (!check || check.n_rows < MIN_GLOBAL_SIZE) { rejected++; rejectReasons.too_small++; continue; }
      if (check.distinct_cats < MIN_DISTINCT_CATS)  { rejected++; rejectReasons.too_few_cats++; continue; }

      const ins = await db.prepare(`
        INSERT OR IGNORE INTO video_rank_history (video_id, captured_at, chart, rank)
        SELECT video_id, captured_at, ?, rank
        FROM (
          SELECT video_id, captured_at,
                 ROW_NUMBER() OVER (ORDER BY id ASC) AS rank
          FROM video_stats
          WHERE captured_at = ?
        )
      `).bind(chart, ts).run();

      totalInserted += ins?.meta?.changes ?? 0;
      validated++;
    }

    return NextResponse.json({
      done: tsList.length < limit,
      scanned: tsList.length,
      validated,
      rejected,
      rejectReasons,
      inserted: totalInserted,
      nextCursor: tsList[tsList.length - 1],
    });
  } catch (error) {
    console.error('[Reconstruct Ranks T1] error', error);
    return NextResponse.json({ success: false, error: error?.message || 'unknown' }, { status: 500 });
  }
}
