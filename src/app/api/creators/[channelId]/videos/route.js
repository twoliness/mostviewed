import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request, { params }) {
  const { channelId } = await params;
  
  try {
    console.log(`[API] Fetching videos for creator ${channelId}`);
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    
    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    
    // Check cache first
    const cacheKey = `/api/creators/${channelId}/videos?limit=${limit}`;
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[API] Returning cached videos for creator ${channelId}`);
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }
    
    const data = await db.getCreatorVideos(channelId, limit);
    
    console.log(`[API] Found ${data.length} videos for creator ${channelId}`);
    
    const response = JSON.stringify(data);
    
    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log(`[API] Cached videos response for creator ${channelId}`);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching videos for creator ${channelId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch creator videos data' },
      { status: 500 }
    );
  }
}