import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request, { params }) {
  const { channelId } = await params;
  
  try {
    console.log(`[API] Fetching creator details for ${channelId}`);
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    
    // Get query parameters
    const url = new URL(request.url);
    const includeVideos = url.searchParams.get('include_videos') === 'true';
    const videosLimit = Math.min(parseInt(url.searchParams.get('videos_limit') || '10'), 50);
    
    // Check cache first
    const cacheKey = `/api/creators/${channelId}?include_videos=${includeVideos}&videos_limit=${videosLimit}`;
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[API] Returning cached creator details for ${channelId}`);
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }
    
    // Get creator from the top creators list (this gives us aggregated stats)
    const topCreators = await db.getTopCreators(100); // Get more to find our creator
    const creator = topCreators.find(c => c.channel_id === channelId);
    
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }
    
    let result = creator;
    
    if (includeVideos) {
      const videos = await db.getCreatorVideos(channelId, videosLimit);
      result = {
        ...creator,
        videos: videos
      };
    }
    
    console.log(`[API] Found creator details for ${channelId} with ${includeVideos ? result.videos?.length || 0 : 0} videos`);
    
    const response = JSON.stringify(result);
    
    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log(`[API] Cached creator details for ${channelId}`);
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching creator details for ${channelId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch creator details' },
      { status: 500 }
    );
  }
}