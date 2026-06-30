import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Diagnostic endpoint: given a captured_at, return everything we'd need to
// understand why reconstruct-ranks-bucketed accepted or rejected that bucket.
// Read-only. No writes.

export async function GET(request) {
  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const db = env.DB;
  const url = new URL(request.url);
  const ts = url.searchParams.get('ts');
  if (!ts) return NextResponse.json({ error: 'ts query param required' }, { status: 400 });

  // Full row dump in id order.
  const rowsRes = await db.prepare(`
    SELECT vs.id, vs.video_id, v.category_id, v.is_short, v.country_code,
           vs.view_count
    FROM video_stats vs
    JOIN videos v ON v.id = vs.video_id
    WHERE vs.captured_at = ?
    ORDER BY vs.id ASC
  `).bind(ts).all();
  const rows = rowsRes.results || [];

  // Histograms.
  const byCat = new Map();
  const byIsShort = { '0': 0, '1': 0 };
  const byCountry = new Map();
  for (const r of rows) {
    byCat.set(r.category_id, (byCat.get(r.category_id) ?? 0) + 1);
    byIsShort[String(r.is_short ?? 0)]++;
    byCountry.set(r.country_code, (byCountry.get(r.country_code) ?? 0) + 1);
  }

  // id gaps — a normal cron run has a tight cluster of ids. Gaps tell us
  // whether the rows we have are one chart fetch or stragglers from many.
  const gaps = [];
  for (let i = 1; i < rows.length; i++) {
    const gap = rows[i].id - rows[i - 1].id;
    if (gap > 1) gaps.push({ at: i, prevId: rows[i - 1].id, nextId: rows[i].id, gap });
  }

  // First 40 rows verbatim — what the boundary detector saw.
  const head = rows.slice(0, 40).map(r => ({
    id: r.id, video_id: r.video_id, cat: r.category_id,
    is_short: r.is_short, country: r.country_code, views: r.view_count,
  }));

  return NextResponse.json({
    ts,
    total_rows: rows.length,
    by_category: Object.fromEntries([...byCat.entries()].sort((a, b) => b[1] - a[1])),
    distinct_categories: byCat.size,
    by_is_short: byIsShort,
    by_country: Object.fromEntries([...byCountry.entries()].sort((a, b) => b[1] - a[1])),
    id_range: rows.length ? { min: rows[0].id, max: rows[rows.length - 1].id } : null,
    big_id_gaps: gaps.slice(0, 10),
    head40: head,
  });
}
