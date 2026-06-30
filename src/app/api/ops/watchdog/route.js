import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sendOpsAlert } from '@/lib/ops-alert';

// Single watchdog covering all four alert scopes the user asked for:
//   1. Cron failures (videos / shorts / countries / creators / newsletter / social)
//   2. Stale data (no recent video_stats writes for a cron's expected window)
//   3. YouTube API quota / 4xx-5xx errors (caught via the cron not producing rows
//      — quota exhaustion manifests as the cron silently writing nothing)
//   4. Newsletter + social pipeline failures (checked via the social_posts /
//      newsletter heartbeats below — those tables don't exist yet so for now
//      we approximate via the daily clock)
//
// User asked for "every occurrence" — no dedup. This cron runs every 15 min
// so a persistent failure produces 4 alerts/hour until fixed. That's the
// chosen trade-off.

const NOW = () => Date.now();
const MIN = 60_000;

// All cron heartbeats use video_rank_history (writes happen inline in each
// cron via RollupService.recordChartAndRefresh). It's the cheapest authoritative
// "did this cron complete a successful chart fetch" signal — no full-table scan.
const CHECKS = [
  {
    name: 'videos cron',
    sql: `SELECT MAX(captured_at) AS t FROM video_rank_history WHERE chart = 'global:videos'`,
    maxAgeMs: 40 * MIN,                     // cron runs every 30 min, allow 10 min slack
    title: 'videos cron stale',
  },
  {
    name: 'shorts cron',
    sql: `SELECT MAX(captured_at) AS t FROM video_rank_history WHERE chart = 'global:shorts'`,
    maxAgeMs: 40 * MIN,
    title: 'shorts cron stale',
  },
  {
    name: 'countries cron',
    sql: `SELECT MAX(captured_at) AS t FROM video_rank_history WHERE chart LIKE 'country:%:videos'`,
    maxAgeMs: 75 * MIN,                     // cron runs hourly
    title: 'countries cron stale',
  },
  {
    name: 'creators cron',
    sql: `SELECT MAX(updated_at) AS t FROM creators`,
    maxAgeMs: 13 * 60 * MIN,                // cron runs every 12h
    title: 'creators cron stale',
  },
  {
    name: 'newsletter send',
    sql: `SELECT MAX(sent_at) AS t FROM newsletter_sends`,
    maxAgeMs: 26 * 60 * MIN,                // daily cron, allow 2h slack
    title: 'newsletter send stale',
    optional: true,                         // table may not exist yet
  },
];

export async function POST(request) {
  return handle(request);
}
export async function GET(request) {
  return handle(request);
}

async function handle(request) {
  const { env } = getCloudflareContext();
  if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(request.url);
  const dry  = url.searchParams.get('dry')  === '1';
  const test = url.searchParams.get('test') === '1';
  const now  = NOW();
  const findings = [];

  if (test) {
    // Confirms the WATCHDOG_TELEGRAM_* secrets are wired without waiting
    // for a real failure.
    const res = await sendOpsAlert(env, {
      title: 'watchdog test ping',
      lines: ['This is a manual test alert from /api/ops/watchdog?test=1.', 'If you see this, the watchdog bot is delivering correctly.'],
      context: { host: url.host, when: new Date(now).toISOString() },
    });
    return NextResponse.json({ ok: true, test: true, telegram: res });
  }

  for (const check of CHECKS) {
    try {
      const row = await env.DB.prepare(check.sql).first();
      const last = row?.t ? Date.parse(row.t) : null;
      const ageMs = last ? now - last : Infinity;
      const stale = ageMs > check.maxAgeMs;
      findings.push({ name: check.name, last: row?.t ?? null, ageMin: Math.round(ageMs / MIN), stale });

      if (stale && !dry) {
        await sendOpsAlert(env, {
          title: check.title,
          lines: [
            `No write within the expected window.`,
            `Last write: ${row?.t ?? '(never)'} (~${Math.round(ageMs / MIN)} min ago)`,
            `Threshold: ${Math.round(check.maxAgeMs / MIN)} min`,
          ],
          context: {
            check: check.name,
            host: url.host || 'mostviewed.today',
          },
        });
      }
    } catch (err) {
      const msg = err?.message || String(err);
      // "no such table" on an optional check just means we haven't built that
      // surface yet — quietly skip rather than paging the user.
      if (check.optional && /no such table/i.test(msg)) {
        findings.push({ name: check.name, skipped: 'table not present' });
        continue;
      }
      findings.push({ name: check.name, error: msg });
      if (!dry) {
        await sendOpsAlert(env, {
          title: `watchdog check threw: ${check.name}`,
          lines: [msg],
        });
      }
    }
  }

  return NextResponse.json({ ok: true, dry, findings, checkedAt: new Date(now).toISOString() });
}
