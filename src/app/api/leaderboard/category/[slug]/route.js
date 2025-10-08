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

    console.log(`[API] Fetching category leaderboard for ${slug} from database (limit: ${limit})`);
    const db = new DatabaseService(env.DB);

    // Get category by slug
    const category = await db.getCategoryBySlug(slug);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const data = await db.getCategoryLeaderboard(category.id, limit);

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API] Error fetching category leaderboard for ${slug}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch category leaderboard data' },
      { status: 500 }
    );
  }
}