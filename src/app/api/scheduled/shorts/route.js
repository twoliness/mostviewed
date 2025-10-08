import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Shorts collection handler (global + all categories)
async function triggerShortsCollection(env) {
  console.log('[Shorts Collection] Starting shorts collection (global + categories)...');

  const { YouTubeApiService, POPULAR_CATEGORIES } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');

  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const db = new DatabaseService(env.DB);

  let totalStats = {
    globalShorts: 0,
    categoriesProcessed: 0,
    categoryShorts: 0,
    errors: 0
  };

  // 1. Collect global trending shorts (larger pool for view-count ranking)
  console.log('[Shorts Collection] Collecting global trending shorts...');
  try {
    const globalShorts = await youtube.getMostPopularShorts(500);
    const shortsData = globalShorts.map(video => youtube.transformToDbFormat(video)).filter(Boolean);

    if (shortsData.length > 0) {
      await db.batchUpsertVideosWithStats(shortsData);
      totalStats.globalShorts = shortsData.length;
      console.log(`[Shorts Collection] Inserted ${shortsData.length} global trending shorts`);
    }
  } catch (error) {
    console.error('[Shorts Collection] Error collecting global shorts:', error);
    totalStats.errors++;
  }

  // 2. Collect category-specific trending shorts (larger pool for view-count ranking)
  console.log('[Shorts Collection] Collecting category trending shorts...');
  for (const categoryId of POPULAR_CATEGORIES) {
    try {
      console.log(`[Shorts Collection] Processing category ${categoryId} shorts...`);

      const trendingShorts = await youtube.getMostPopularShortsByCategory(categoryId, 200);

      if (trendingShorts.length > 0) {
        const shortsData = trendingShorts.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (shortsData.length > 0) {
          await db.batchUpsertVideosWithStats(shortsData);
          totalStats.categoryShorts += shortsData.length;
          console.log(`[Shorts Collection] Added ${shortsData.length} trending shorts for category ${categoryId}`);
        }
      }

      totalStats.categoriesProcessed++;

      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`[Shorts Collection] Error processing category ${categoryId}:`, error);
      totalStats.errors++;
    }
  }

  console.log(`[Shorts Collection] Completed: ${totalStats.globalShorts} global, ${totalStats.categoryShorts} category shorts across ${totalStats.categoriesProcessed} categories`);

  return totalStats;
}

export async function POST(request) {
  try {
    console.log('[Shorts Collection] Shorts collection endpoint triggered');

    const context = getCloudflareContext();
    const env = context.env;

    if (!env.YOUTUBE_API_KEY) {
      console.error('[Shorts Collection] YOUTUBE_API_KEY not found in environment');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    if (!env.DB) {
      console.error('[Shorts Collection] Database not found in environment');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const result = await triggerShortsCollection(env);

    const response = {
      success: true,
      type: 'shorts_collection',
      message: 'Shorts collection completed successfully',
      timestamp: new Date().toISOString(),
      statistics: result
    };

    console.log(`[Shorts Collection] Completed successfully`, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Shorts Collection] Error in shorts collection:', error);

    return NextResponse.json({
      success: false,
      error: 'Shorts collection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow manual triggering
export async function GET(request) {
  console.log('[Shorts Collection] Manual trigger via GET request');
  return POST(request);
}
