import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(
  request,
  { params }
) {
  const { slug } = await params;
  
  try {
    const context = getCloudflareContext();
    const env = context.env;
    
    // Get limit from query parameters (default: 10, max: 100)
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
    
    // Check cache first
    const cacheKey = `/api/leaderboard/category/${slug}/shorts?limit=${limit}`;
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[API] Returning cached category shorts leaderboard for ${slug} (limit: ${limit})`);
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    console.log(`[API] Fetching category shorts leaderboard for ${slug} from database (limit: ${limit})`);
    const db = new DatabaseService(env.DB);
    
    // Get category by slug
    const category = await db.getCategoryBySlug(slug);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    const data = await db.getCategoryShortsLeaderboard(category.id, limit);
    
    const response = JSON.stringify(data);
    
    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log(`[API] Cached category shorts leaderboard response for ${slug}`);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching category shorts leaderboard for ${slug}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch category shorts leaderboard data' },
      { status: 500 }
    );
  }
}