import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Recompute peak_velocity / peak_velocity_at / engagement_day1 / engagement_week1
// from raw video_stats history for every video in scope. Fixes two issues
// surfaced by sanity-checks:
//
//   1. Velocity poisoning. The current peak_velocity reflects pre-bucket
//      writes that lacked a min-delta floor — near-duplicate captured_at
//      values produced 100M+ views/hour absurdities. Recomputed with a
//      10-min floor, same rule the live rollup writer now uses.
//
//   2. Engagement day1/week1 were pre-filled at first sighting (rollups.js
//      INSERT bug; patched). We rebuild them by finding the stats row closest
//      to first_seen + 24h (and + 168h) — that's the actual "engagement after
//      one day" we want.
//
// One scan per video covers both. Resumable cursor on video_id. Logged to
// backfill_progress (job='recompute-summary-stats').

const MIN_VELOCITY_DELTA_HOURS = 10 / 60;   // matches rollups.js#computeVelocity
const HOUR_MS = 60 * 60 * 1000;

// "Impossible jump" heuristics — guard against YouTube API hiccup snapshots
// where a single video_stats row reports a view count wildly above reality
// (returns a stale-but-corrected value on the next tick). The 10-min floor
// doesn't help because the offending pairs are properly spaced; only the
// magnitude is wrong. Real launches top out around 5M v/hr globally.
const ABSOLUTE_VELOCITY_CEIL = 10_000_000;          // v/hr — sanity bound
const RELATIVE_DELTA_CEIL = 0.25;                   // delta as share of prev views
const RELATIVE_FILTER_MIN_VIEWS = 100_000;          // < this is fresh-launch territory where huge % growth is real

const DAY1_TARGET_H  = 24;
const WEEK1_TARGET_H = 24 * 7;
const ENGAGEMENT_TOLERANCE_H = 6;            // accept a stats row within ±6h of the target

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const AUTO_BUDGET_MS = 25_000;
const CONCURRENCY = 8;        // per-video work is independent — fan out to D1.

const Q2_FIRST_SEEN_FROM = '2026-04-01';
const Q2_FIRST_SEEN_TO   = '2026-07-01';

const JOB = 'recompute-summary-stats';

function engagement(views, likes, comments) {
  if (!views || views <= 0) return null;
  return ((likes || 0) + (comments || 0)) / views;
}

function pickClosestStat(stats, targetMs, toleranceMs) {
  // stats is captured_at ASC. Linear scan is fine — N is usually <300.
  let best = null;
  let bestDiff = Infinity;
  for (const s of stats) {
    const diff = Math.abs(Date.parse(s.captured_at) - targetMs);
    if (diff < bestDiff) { best = s; bestDiff = diff; }
  }
  if (!best || bestDiff > toleranceMs) return null;
  return best;
}

function recomputeForVideo(stats, firstSeen) {
  // stats: ordered by captured_at ASC.
  // Returns { peakVelocity, peakVelocityAt, engagementDay1, engagementWeek1 }.
  let peakVelocity = null;
  let peakVelocityAt = null;

  for (let i = 1; i < stats.length; i++) {
    const a = stats[i - 1];
    const b = stats[i];
    const hours = (Date.parse(b.captured_at) - Date.parse(a.captured_at)) / (HOUR_MS);
    if (hours < MIN_VELOCITY_DELTA_HOURS) continue;
    const delta = (b.view_count ?? 0) - (a.view_count ?? 0);
    if (delta < 0) continue;
    const v = delta / hours;
    if (v > ABSOLUTE_VELOCITY_CEIL) continue;
    if ((a.view_count ?? 0) > RELATIVE_FILTER_MIN_VIEWS && delta > a.view_count * RELATIVE_DELTA_CEIL) continue;
    if (peakVelocity === null || v > peakVelocity) {
      peakVelocity = v;
      peakVelocityAt = b.captured_at;
    }
  }

  const firstSeenMs = Date.parse(firstSeen);
  const day1Stat  = pickClosestStat(stats, firstSeenMs + DAY1_TARGET_H  * HOUR_MS, ENGAGEMENT_TOLERANCE_H * HOUR_MS);
  const week1Stat = pickClosestStat(stats, firstSeenMs + WEEK1_TARGET_H * HOUR_MS, ENGAGEMENT_TOLERANCE_H * HOUR_MS);

  const engagementDay1  = day1Stat  ? engagement(day1Stat.view_count,  day1Stat.like_count,  day1Stat.comment_count)  : null;
  const engagementWeek1 = week1Stat ? engagement(week1Stat.view_count, week1Stat.like_count, week1Stat.comment_count) : null;

  return { peakVelocity, peakVelocityAt, engagementDay1, engagementWeek1 };
}

async function runBatch({ db, cursor, limit, scopeAll }) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  let scanned = 0, updated = 0, errors = 0;
  const skips = { no_stats: 0, no_changes: 0 };
  let nextCursor = cursor;
  let done = false;
  let errorMsg = null;

  try {
    const whereScope = scopeAll
      ? `WHERE video_id > ?`
      : `WHERE video_id > ? AND first_seen >= '${Q2_FIRST_SEEN_FROM}' AND first_seen < '${Q2_FIRST_SEEN_TO}'`;

    const videosRes = await db.prepare(`
      SELECT video_id, first_seen
      FROM video_summary
      ${whereScope}
      ORDER BY video_id
      LIMIT ?
    `).bind(cursor, limit).all();

    const videos = videosRes.results || [];
    scanned = videos.length;
    done = scanned < limit;
    if (scanned > 0) nextCursor = videos[videos.length - 1].video_id;

    // Fan out CONCURRENCY videos at a time. Each one is independent — separate
    // video_stats SELECT + single UPDATE — so they don't contend on the same
    // rows. D1 happily handles the parallel reads.
    for (let i = 0; i < videos.length; i += CONCURRENCY) {
      const slice = videos.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(slice.map(async (v) => {
        const statsRes = await db.prepare(`
          SELECT captured_at, view_count, like_count, comment_count
          FROM video_stats
          WHERE video_id = ?
          ORDER BY captured_at ASC
        `).bind(v.video_id).all();
        const stats = statsRes.results || [];
        if (stats.length < 2) return { kind: 'no_stats' };

        const { peakVelocity, peakVelocityAt, engagementDay1, engagementWeek1 } =
          recomputeForVideo(stats, v.first_seen);

        await db.prepare(`
          UPDATE video_summary
          SET peak_velocity = ?,
              peak_velocity_at = ?,
              engagement_day1 = ?,
              engagement_week1 = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE video_id = ?
        `).bind(peakVelocity, peakVelocityAt, engagementDay1, engagementWeek1, v.video_id).run();
        return { kind: 'updated' };
      }));

      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.kind === 'no_stats') skips.no_stats++;
          else updated++;
        } else {
          errors++;
          console.error(`[${JOB}] worker failed:`, r.reason?.message || r.reason);
        }
      }
    }
  } catch (err) {
    errorMsg = err?.message || String(err);
  }

  const finishedAt = new Date().toISOString();
  try {
    await db.prepare(`
      INSERT INTO backfill_progress (
        job, started_at, finished_at, elapsed_ms,
        cursor_in, cursor_out, range_from, range_to,
        scanned, validated, rejected, inserted,
        reject_reasons, done, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      JOB, startedAt, finishedAt, Date.now() - t0,
      cursor, nextCursor,
      scopeAll ? null : Q2_FIRST_SEEN_FROM,
      scopeAll ? null : Q2_FIRST_SEEN_TO,
      scanned, updated, errors, 0,
      JSON.stringify(skips), done ? 1 : 0, errorMsg,
    ).run();
  } catch (logErr) {
    console.error(`[${JOB}] progress log failed`, logErr);
  }

  return { scanned, updated, errors, skips, nextCursor, done, errorMsg };
}

export async function GET(request) {
  const t0 = Date.now();
  const url = new URL(request.url);
  const cursorIn = url.searchParams.get('cursor') || '';
  const limit    = Math.min(parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10), MAX_LIMIT);
  const auto     = url.searchParams.get('auto') === '1' || url.searchParams.get('auto') === 'true';
  const scopeAll = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';

  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;

  let cursor = cursorIn;
  let batches = 0, totalScanned = 0, totalUpdated = 0, totalErrors = 0;
  const aggSkips = { no_stats: 0, no_changes: 0 };
  let lastErr = null;
  let done = false;

  do {
    const r = await runBatch({ db, cursor, limit, scopeAll });
    batches++;
    totalScanned += r.scanned;
    totalUpdated += r.updated;
    totalErrors  += r.errors;
    for (const k of Object.keys(aggSkips)) aggSkips[k] += r.skips[k] ?? 0;
    cursor = r.nextCursor;
    done = r.done;
    lastErr = r.errorMsg;
    if (lastErr) break;
    if (!auto) break;
    if (Date.now() - t0 > AUTO_BUDGET_MS) break;
  } while (!done);

  return NextResponse.json({
    job: JOB,
    auto,
    scope: scopeAll ? 'all_videos' : 'q2_first_seen',
    batches,
    done,
    scanned: totalScanned,
    updated: totalUpdated,
    errors: totalErrors,
    skips: aggSkips,
    cursorIn,
    nextCursor: cursor,
    elapsedMs: Date.now() - t0,
    error: lastErr,
  }, { status: lastErr ? 500 : 200 });
}
