import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { BreakoutService } from '@/lib/breakout';

export async function GET(request) {
  try {
    const { env } = getCloudflareContext();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
    const status = url.searchParams.get('status') || null;

    const cacheKey = `/api/leaderboard/breakouts?limit=${limit}${status ? `&status=${status}` : ''}`;

    if (env.VIDTRENDS_CACHE && !status) {
      const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=120',
          },
        });
      }
    }

    const breakout = new BreakoutService(env.DB);
    const data = await breakout.getBreakouts({ limit, status });
    const response = JSON.stringify(data);

    if (env.VIDTRENDS_CACHE && !status) {
      await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 120 });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=240' },
    });
  } catch (error) {
    console.error('[API] Error fetching breakouts:', error);
    return NextResponse.json({ error: 'Failed to fetch breakouts' }, { status: 500 });
  }
}
