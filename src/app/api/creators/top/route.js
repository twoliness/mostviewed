import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    console.log('[API] Fetching top creators from database');
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    
    // Get query parameters
    const url = new URL(request.url);
    const includeVideos = url.searchParams.get('include_videos') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
    const videosPerCreator = Math.min(parseInt(url.searchParams.get('videos_per_creator') || '5'), 10);
    
    // Check cache first
    const cacheKey = `/api/creators/top?include_videos=${includeVideos}&limit=${limit}&videos_per_creator=${videosPerCreator}`;
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[API] Returning cached creators data (${includeVideos ? 'with' : 'without'} videos)`);
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }
    
    // Get total creators count for logging
    const totalCreators = await db.getCreatorsCount();
    console.log(`[API] Database contains ${totalCreators} unique creators`);
    
    let data;
    if (includeVideos) {
      console.log(`[API] Fetching ${limit} creators with ${videosPerCreator} videos each`);
      data = await db.getTopCreatorsWithVideos(limit, videosPerCreator);
    } else {
      console.log(`[API] Fetching top ${limit} creators (out of ${totalCreators} total)`);
      data = await db.getTopCreators(limit);
    }
    
    console.log(`[API] Found ${data.length} top creators`);
    
    // If no data, return empty array with appropriate message
    if (data.length === 0) {
      console.log('[API] No creator data found in database');
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      });
    }
    
    const response = JSON.stringify(data);
    
    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log(`[API] Cached creators response (${data.length} creators)`);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching top creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top creators data' },
      { status: 500 }
    );
  }
}