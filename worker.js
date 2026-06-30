// Custom worker to handle both HTTP requests and scheduled events
// @ts-ignore `.open-next/worker.js` is generated at build time
import handler from "./.open-next/worker.js";

export default {
  // Handle HTTP requests (your Next.js app)
  fetch: handler.fetch,

  // Handle scheduled events (cron triggers)
  async scheduled(event, env, ctx) {
    console.log('[Scheduled] Cron trigger fired:', event.cron);

    try {
      // Route based on the exact cron pattern that fired this event.
      // Routing on wall-clock time is unsafe: when two cron patterns share a
      // minute (e.g. "0,30 * * * *" and "0 14 * * *" both fire at 14:00), each
      // invocation would match the same branch and the job would run twice.
      const cronRoutes = {
        '0 14 * * *':    '/api/newsletter/send-daily',
        '10 */12 * * *': '/api/scheduled',
        '5 * * * *':     '/api/scheduled/countries',
        '0,30 * * * *':  '/api/scheduled/videos',
        '15,45 * * * *': '/api/scheduled/shorts',
        '25 3 * * *':    '/api/scheduled/daily-rollups',
        '2,32 * * * *':  '/api/scheduled/detect-breakouts',
        '17,47 * * * *': '/api/scheduled/refresh-breakouts',
        '20 9 * * *':    '/api/social/post',
        '0 10 * * 1':   '/api/social/weekly-charts',
        '*/15 * * * *': '/api/ops/watchdog',
      };

      const apiEndpoint = cronRoutes[event.cron];
      if (!apiEndpoint) {
        console.log('[Scheduled] No route for cron pattern:', event.cron);
        return new Response('OK', { status: 200 });
      }
      console.log(`[Scheduled] Routing ${event.cron} -> ${apiEndpoint}`);

      // Heartbeat key — strip the leading /api/ for compact storage.
      const heartbeatJob = apiEndpoint.replace(/^\/api\//, '');

      // Create a synthetic request to the appropriate API endpoint
      const url = new URL(`https://mostviewed.today${apiEndpoint}`);
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Cron/1.0',
          'X-Cron-Trigger': event.cron,
          'X-Cron-Endpoint': apiEndpoint
        }
      });

      let response;
      let runErr = null;
      try {
        response = await handler.fetch(request, env, ctx);
        if (response.ok) {
          console.log(`[Scheduled] Cron job completed for ${apiEndpoint}: ${response.status}`);
        } else {
          runErr = `${response.status} ${response.statusText}`;
          console.error(`[Scheduled] Cron job failed for ${apiEndpoint}:`, runErr);
        }
      } catch (err) {
        runErr = err?.message || String(err);
        console.error(`[Scheduled] Cron job threw for ${apiEndpoint}:`, runErr);
      }

      // Wall-clock heartbeat write — keeps the watchdog independent of the
      // bucketed video_rank_history.captured_at. Failures here are swallowed
      // so a DB hiccup doesn't mask the original cron outcome.
      if (env.DB) {
        const nowIso = new Date().toISOString();
        const ok = runErr == null;
        try {
          await env.DB.prepare(`
            INSERT INTO cron_heartbeats (job, last_run_at, last_ok_at, last_status, last_error, cron_pattern)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(job) DO UPDATE SET
              last_run_at = excluded.last_run_at,
              last_ok_at = CASE WHEN excluded.last_status = 'ok' THEN excluded.last_ok_at ELSE cron_heartbeats.last_ok_at END,
              last_status = excluded.last_status,
              last_error = excluded.last_error,
              cron_pattern = excluded.cron_pattern
          `).bind(
            heartbeatJob, nowIso, ok ? nowIso : null,
            ok ? 'ok' : 'error', runErr, event.cron
          ).run();
        } catch (hbErr) {
          console.error(`[Scheduled] heartbeat write failed for ${heartbeatJob}:`, hbErr);
        }
      }

      if (runErr && !response) throw new Error(runErr);
      return response;
    } catch (error) {
      console.error('[Scheduled] Cron job error:', error);
      throw error;
    }
  }
};

// Re-export any Durable Objects if your app uses them
// @ts-ignore `.open-next/worker.js` is generated at build time  
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";