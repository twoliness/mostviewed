import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Tail the backfill_progress log. Defaults to the 50 most recent rows across
// all jobs. Filter with ?job=reconstruct-ranks-bucketed and bound with ?limit.

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request) {
  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;

  const url = new URL(request.url);
  const job = url.searchParams.get('job');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || DEFAULT_LIMIT, 10), MAX_LIMIT);

  const where = job ? 'WHERE job = ?' : '';
  const binds = job ? [job, limit] : [limit];

  const res = await db.prepare(`
    SELECT id, job, started_at, finished_at, elapsed_ms,
           cursor_in, cursor_out, range_from, range_to,
           scanned, validated, rejected, inserted,
           reject_reasons, done, error
    FROM backfill_progress
    ${where}
    ORDER BY id DESC
    LIMIT ?
  `).bind(...binds).all();

  const rows = (res.results || []).map(r => ({
    ...r,
    reject_reasons: r.reject_reasons ? safeJson(r.reject_reasons) : null,
    done: !!r.done,
  }));

  // Quick aggregate so a single curl tells you where you are.
  const summary = rows.reduce((acc, r) => {
    acc.batches++;
    acc.scanned += r.scanned ?? 0;
    acc.validated += r.validated ?? 0;
    acc.rejected += r.rejected ?? 0;
    acc.inserted += r.inserted ?? 0;
    return acc;
  }, { batches: 0, scanned: 0, validated: 0, rejected: 0, inserted: 0 });

  return NextResponse.json({
    summary,
    latestCursor: rows[0]?.cursor_out ?? null,
    latestDone: rows[0]?.done ?? false,
    rows,
  });
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return s; }
}
