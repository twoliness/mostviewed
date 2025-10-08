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
      // Determine which endpoint to call based on cron pattern
      let apiEndpoint;
      const currentTime = new Date();
      const currentMinute = currentTime.getUTCMinutes();
      const currentHour = currentTime.getUTCHours();

      // Check if this is creator collection (every 12 hours at :10)
      if (currentMinute === 10 && (currentHour % 12 === 0)) {
        apiEndpoint = '/api/scheduled';
        console.log('[Scheduled] Routing to creator collection endpoint');
      }
      // Check if this is trending/country collection (every hour at :05)
      else if (currentMinute === 5) {
        apiEndpoint = '/api/scheduled/countries';
        console.log('[Scheduled] Routing to trending/country collection endpoint');
      }
      // Check if this is videos collection (:00 or :30)
      else if (currentMinute === 0 || currentMinute === 30) {
        apiEndpoint = '/api/scheduled/videos';
        console.log('[Scheduled] Routing to videos collection endpoint (global + categories)');
      }
      // Check if this is shorts collection (:15 or :45)
      else if (currentMinute === 15 || currentMinute === 45) {
        apiEndpoint = '/api/scheduled/shorts';
        console.log('[Scheduled] Routing to shorts collection endpoint (global + categories)');
      }
      // Skip if we don't match any schedule
      else {
        console.log('[Scheduled] No matching cron schedule for this time');
        return new Response('OK', { status: 200 });
      }
      
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