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
      };

      const apiEndpoint = cronRoutes[event.cron];
      if (!apiEndpoint) {
        console.log('[Scheduled] No route for cron pattern:', event.cron);
        return new Response('OK', { status: 200 });
      }
      console.log(`[Scheduled] Routing ${event.cron} -> ${apiEndpoint}`);
      
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

      // Call your Next.js API endpoint
      const response = await handler.fetch(request, env, ctx);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[Scheduled] Cron job completed successfully for ${apiEndpoint}:`, result);
      } else {
        console.error(`[Scheduled] Cron job failed for ${apiEndpoint}:`, response.status, response.statusText);
      }
      
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