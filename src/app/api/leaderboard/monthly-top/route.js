import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    const context = getCloudflareContext();
    const env = context.env;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10), 1), 100);
    const cacheKey = `/api/leaderboard/monthly-top?limit=${limit}`;
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

    const db = new DatabaseService(env.DB);
    const data = await db.getMonthlyTopVideos(limit);
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
    console.error('[API] Error fetching monthly top leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly top leaderboard data' },
      { status: 500 }
    );
  }
}
