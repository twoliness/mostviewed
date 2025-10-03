import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    const context = getCloudflareContext();
    const env = context.env;    
    // Check cache first
    const cacheKey = '/api/leaderboard/shorts';
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log('[API] Returning cached shorts leaderboard');
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    console.log('[API] Fetching shorts leaderboard from database');
    const db = new DatabaseService(env.DB);
    const data = await db.getGlobalShortsLeaderboard(10);
    
    const response = JSON.stringify(data);
    
    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log('[API] Cached shorts leaderboard response');
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching shorts leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts leaderboard data' },
      { status: 500 }
    );
  }
}