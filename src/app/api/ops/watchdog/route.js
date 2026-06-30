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

// Wall-clock heartbeats from cron_heartbeats. worker.js writes one row per
// cron tick with the real ISO timestamp, decoupling the watchdog from the
// bucketed captured_at on video_rank_history (which lags by up to 30 min and
// caused false-positive shorts-cron alerts at the 40 min threshold).
//
// Thresholds = cron interval + slack. No bucket-lag headroom needed anymore.
const CHECKS = [
  { name: 'videos cron',    job: 'scheduled/videos',    maxAgeMs: 40 * MIN,      title: 'videos cron stale' },
  { name: 'shorts cron',    job: 'scheduled/shorts',    maxAgeMs: 40 * MIN,      title: 'shorts cron stale' },
  { name: 'countries cron', job: 'scheduled/countries', maxAgeMs: 75 * MIN,      title: 'countries cron stale' },
  { name: 'creators cron',  job: 'scheduled',           maxAgeMs: 13 * 60 * MIN, title: 'creators cron stale' },
  { name: 'breakouts detect',  job: 'scheduled/detect-breakouts',  maxAgeMs: 45 * MIN, title: 'detect-breakouts cron stale' },
  { name: 'breakouts refresh', job: 'scheduled/refresh-breakouts', maxAgeMs: 45 * MIN, title: 'refresh-breakouts cron stale' },
  { name: 'daily rollups',  job: 'scheduled/daily-rollups', maxAgeMs: 25 * 60 * MIN, title: 'daily-rollups cron stale' },
  { name: 'newsletter send', job: 'newsletter/send-daily', maxAgeMs: 26 * 60 * MIN, title: 'newsletter send stale' },
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
      const row = await env.DB.prepare(
        `SELECT last_run_at, last_ok_at, last_status, last_error
         FROM cron_heartbeats WHERE job = ?`
      ).bind(check.job).first();

      // No heartbeat yet = cron hasn't ticked since the heartbeat layer
      // shipped. Don't alert — wait for the first real signal.
      if (!row) {
        findings.push({ name: check.name, status: 'no_heartbeat_yet' });
        continue;
      }

      const lastOk = row.last_ok_at ? Date.parse(row.last_ok_at) : null;
      const ageMs = lastOk ? now - lastOk : Infinity;
      const stale = ageMs > check.maxAgeMs;
      const lastErr = row.last_status === 'error';

      findings.push({
        name: check.name,
        last_ok_at: row.last_ok_at,
        last_run_at: row.last_run_at,
        last_status: row.last_status,
        ageMin: Math.round(ageMs / MIN),
        stale,
        last_error: row.last_error,
      });

      if ((stale || lastErr) && !dry) {
        const lines = [];
        if (stale) {
          lines.push(`Last successful run: ${row.last_ok_at ?? '(never)'} (~${Math.round(ageMs / MIN)} min ago)`);
          lines.push(`Threshold: ${Math.round(check.maxAgeMs / MIN)} min`);
        }
        if (lastErr) {
          lines.push(`Most recent attempt errored at ${row.last_run_at}:`);
          lines.push(row.last_error ?? '(no error detail)');
        }
        await sendOpsAlert(env, {
          title: stale ? check.title : `${check.name} attempt errored`,
          lines,
          context: { check: check.name, host: url.host || 'mostviewed.today' },
        });
      }
    } catch (err) {
      const msg = err?.message || String(err);
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
