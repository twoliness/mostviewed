import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    const context = getCloudflareContext();
    const env = context.env;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1), 100);
    const cacheKey = `/api/leaderboard/global?limit=${limit}`;
    const cache = env.VIDTRENDS_CACHE;

    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }
    }

    console.log(`[API] Fetching global leaderboard from database (limit: ${limit})`);
    const db = new DatabaseService(env.DB);
    const data = await db.getGlobalLeaderboard(limit);

    console.log(`[API] Found ${data.length} videos in global leaderboard`);

    // If no data, return empty array with appropriate message
    if (data.length === 0) {
      console.log('[API] No data found in database - you may need to run initial data collection');
      return NextResponse.json([]);
    }

    const response = JSON.stringify(data);
    if (cache) {
      await cache.put(cacheKey, response, { expirationTtl: 300 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching global leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
