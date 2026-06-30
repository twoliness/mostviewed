import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Tier-1b historical rank reconstruction for the BUCKETED era.
//
// Hole this fills:
//   pre 2026-04-15        : reconstruct-ranks (unique-ms captured_at, MIN(id) per chart) — shipped
//   2026-04-15 → 2026-06-27 : <-- this endpoint                                            — was missing
//   from   2026-06-27      : rollups.js writes rank live during each cron                  — shipped
//
// Why a separate endpoint: after 2026-04-15, captured_at is rounded to the
// 30-min bucket (db.getCaptureBucketTimestamp), so multiple charts share one
// captured_at. The old "first captured_at per cron run = global" trick
// collapses. We have to detect chart boundaries inside a single bucket.
//
// What we recover here: only chart=global:videos. The videos cron writes
// global FIRST inside its bucket, so the first contiguous chunk of rows
// (ordered by autoincrement id ASC) before category dominance kicks in is the
// global videos chart. global:shorts and country charts are NOT recovered —
// they're interleaved later in the same bucket with the country cron's mixed
// is_short output, and the signal-to-noise isn't good enough for a defensible
// rank claim. (If needed later, extend with an is_short/country_code aware
// pass; the per-bucket row pull below already includes the columns.)
//
// Boundary detection: walk rows by id ASC, maintain a sliding window of the
// last window category_ids. Global charts have ≥3 distinct categories with no
// single category dominant. Category fetches return ~50-70% of one category
// (see memory.md "YouTube API quirks"). When any category occupies ≥DOMINANCE
// share of the window, we've entered the first category fetch — cut global at
// the position the window started.
//
// Progress is logged to the backfill_progress table per call. Tail it with
// /api/admin/backfill-progress.

const WINDOW = 20;
const DOMINANCE_DEFAULT = 0.7;
const MIN_GLOBAL_SIZE_DEFAULT = 20;
const MIN_DISTINCT_CATS_DEFAULT = 3;
const MAX_GLOBAL_SIZE = 250;          // chart depth was 50→100→200 across Q2; cap defensively

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

const RANGE_FROM_DEFAULT = '2026-04-15T00:00:00.000Z';
const RANGE_TO_DEFAULT   = '2026-06-27T00:00:00.000Z';

const CHART = 'global:videos';
const JOB   = 'reconstruct-ranks-bucketed';

// Wall-clock budget for auto-loop mode. Cloudflare Workers default CPU limit
// is ~30s; leave headroom for the final progress log write.
const AUTO_BUDGET_MS = 25000;

function findGlobalBoundary(rows, dominance) {
  // rows: array of { category_id, is_short } in id ASC.
  // Skip leading shorts rows defensively (shouldn't happen post cron-split).
  let start = 0;
  while (start < rows.length && rows[start].is_short === 1) start++;

  // Build initial window.
  const counts = new Map();
  let windowEnd = start;
  for (; windowEnd < rows.length && windowEnd - start < WINDOW; windowEnd++) {
    const c = rows[windowEnd].category_id;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  if (windowEnd - start < WINDOW) {
    // Bucket too small to even fill a window — take what we have.
    return { start, end: windowEnd };
  }

  while (windowEnd < rows.length && windowEnd - start < MAX_GLOBAL_SIZE) {
    let dominated = false;
    for (const n of counts.values()) {
      if (n / WINDOW >= dominance) { dominated = true; break; }
    }
    if (dominated) return { start, end: windowEnd - WINDOW };
    if (rows[windowEnd].is_short === 1) return { start, end: windowEnd };

    const out = rows[windowEnd - WINDOW].category_id;
    const oc = counts.get(out) - 1;
    if (oc === 0) counts.delete(out); else counts.set(out, oc);
    const inn = rows[windowEnd].category_id;
    counts.set(inn, (counts.get(inn) ?? 0) + 1);
    windowEnd++;
  }
  return { start, end: Math.min(start + MAX_GLOBAL_SIZE, rows.length) };
}

function validateGlobalSlice(slice, minSize, minCats) {
  if (slice.length < minSize) return { ok: false, reason: 'too_small' };
  const cats = new Set();
  for (const r of slice) cats.add(r.category_id);
  if (cats.size < minCats) return { ok: false, reason: 'too_few_cats' };
  return { ok: true };
}

async function logProgress(db, row) {
  await db.prepare(`
    INSERT INTO backfill_progress (
      job, started_at, finished_at, elapsed_ms,
      cursor_in, cursor_out, range_from, range_to,
      scanned, validated, rejected, inserted,
      reject_reasons, done, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    row.job, row.started_at, row.finished_at, row.elapsed_ms,
    row.cursor_in, row.cursor_out, row.range_from, row.range_to,
    row.scanned, row.validated, row.rejected, row.inserted,
    JSON.stringify(row.reject_reasons || {}), row.done ? 1 : 0, row.error || null
  ).run();
}

// One batch of work. Returns the same shape regardless of caller (single-call
// or auto-loop). Filters non-bucketed timestamps at the SQL level so
// ms-precision noise from stale-video refreshes etc. doesn't count toward
// the batch limit or show up as "too_small" rejections.
async function runBatch({ db, cursor, limit, rangeTo, rangeFrom, dominance, minSize, minCats }) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  let scanned = 0, validated = 0, rejected = 0, totalInserted = 0;
  const rejectReasons = { too_small: 0, too_few_cats: 0, no_rows: 0 };
  let nextCursor = cursor;
  let done = false;
  let errorMsg = null;

  try {
    // Only consider timestamps that look like bucketed chart-fetches:
    // minute is 00 or 30, seconds/ms are zero. Anything else is ms-precision
    // legacy writes (stale refreshes, off-chart trackers) that have no chart
    // ranking attached and would just be rejected as too_small.
    const tsRes = await db.prepare(`
      SELECT DISTINCT captured_at
      FROM video_stats
      WHERE captured_at > ? AND captured_at < ?
        AND (captured_at LIKE '%T__:00:00.000Z' OR captured_at LIKE '%T__:30:00.000Z')
      ORDER BY captured_at
      LIMIT ?
    `).bind(cursor, rangeTo, limit).all();

    const tsList = (tsRes.results || []).map(r => r.captured_at);
    scanned = tsList.length;
    done = scanned < limit;
    if (scanned > 0) nextCursor = tsList[tsList.length - 1];

    for (const ts of tsList) {
      const rowsRes = await db.prepare(`
        SELECT vs.video_id, v.category_id, v.is_short
        FROM video_stats vs
        JOIN videos v ON v.id = vs.video_id
        WHERE vs.captured_at = ?
        ORDER BY vs.id ASC
      `).bind(ts).all();

      const rows = rowsRes.results || [];
      if (rows.length === 0) { rejected++; rejectReasons.no_rows++; continue; }

      const { start, end } = findGlobalBoundary(rows, dominance);
      const slice = rows.slice(start, end);

      const v = validateGlobalSlice(slice, minSize, minCats);
      if (!v.ok) { rejected++; rejectReasons[v.reason]++; continue; }

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO video_rank_history (video_id, captured_at, chart, rank)
        VALUES (?, ?, ?, ?)
      `);
      const batch = slice.map((row, idx) => stmt.bind(row.video_id, ts, CHART, idx + 1));
      const results = await db.batch(batch);
      const inserted = results.reduce((sum, r) => sum + (r?.meta?.changes ?? 0), 0);
      totalInserted += inserted;
      validated++;
    }
  } catch (err) {
    errorMsg = err?.message || String(err);
  }

  const finishedAt = new Date().toISOString();
  const elapsed = Date.now() - t0;

  try {
    await logProgress(db, {
      job: JOB,
      started_at: startedAt,
      finished_at: finishedAt,
      elapsed_ms: elapsed,
      cursor_in: cursor,
      cursor_out: nextCursor,
      range_from: rangeFrom,
      range_to: rangeTo,
      scanned, validated, rejected, inserted: totalInserted,
      reject_reasons: rejectReasons,
      done,
      error: errorMsg,
    });
  } catch (logErr) {
    console.error('[reconstruct-ranks-bucketed] progress log failed', logErr);
  }

  return {
    scanned, validated, rejected, totalInserted, rejectReasons,
    nextCursor, done, errorMsg, elapsed,
  };
}

export async function GET(request) {
  const t0 = Date.now();
  const url = new URL(request.url);
  const cursorIn  = url.searchParams.get('cursor') || '2026-04-14T23:59:59.999Z';
  const limit     = Math.min(parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10), MAX_LIMIT);
  const rangeFrom = url.searchParams.get('from')  || RANGE_FROM_DEFAULT;
  const rangeTo   = url.searchParams.get('until') || RANGE_TO_DEFAULT;
  const auto      = url.searchParams.get('auto') === '1' || url.searchParams.get('auto') === 'true';
  const dominance = parseFloat(url.searchParams.get('dominance') || DOMINANCE_DEFAULT);
  const minSize   = parseInt(url.searchParams.get('minSize')  || MIN_GLOBAL_SIZE_DEFAULT, 10);
  const minCats   = parseInt(url.searchParams.get('minCats')  || MIN_DISTINCT_CATS_DEFAULT, 10);

  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;

  let cursor = cursorIn;
  let batches = 0;
  let totalScanned = 0, totalValidated = 0, totalRejected = 0, totalInserted = 0;
  const aggReject = { too_small: 0, too_few_cats: 0, no_rows: 0 };
  let lastErr = null;
  let done = false;

  do {
    const r = await runBatch({ db, cursor, limit, rangeTo, rangeFrom, dominance, minSize, minCats });
    batches++;
    totalScanned   += r.scanned;
    totalValidated += r.validated;
    totalRejected  += r.rejected;
    totalInserted  += r.totalInserted;
    for (const k of Object.keys(aggReject)) aggReject[k] += r.rejectReasons[k] ?? 0;
    cursor = r.nextCursor;
    done = r.done;
    lastErr = r.errorMsg;
    if (lastErr) break;
    if (!auto) break;
    // Stop the loop before we run out of wall-clock budget.
    if (Date.now() - t0 > AUTO_BUDGET_MS) break;
  } while (!done);

  const body = {
    job: JOB,
    chart: CHART,
    auto,
    batches,
    done,
    scanned: totalScanned,
    validated: totalValidated,
    rejected: totalRejected,
    rejectReasons: aggReject,
    inserted: totalInserted,
    cursorIn,
    nextCursor: cursor,
    rangeFrom,
    rangeTo,
    knobs: { dominance, minSize, minCats },
    elapsedMs: Date.now() - t0,
    error: lastErr,
  };
  return NextResponse.json(body, { status: lastErr ? 500 : 200 });
}
