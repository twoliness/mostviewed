import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Regular videos collection handler (global + all categories)
async function triggerVideosCollection(env) {
  console.log('[Videos Collection] Starting regular videos collection (global + categories)...');

  const { YouTubeApiService, POPULAR_CATEGORIES } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');

  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const db = new DatabaseService(env.DB);

  let totalStats = {
    globalVideos: 0,
    categoriesProcessed: 0,
    categoryVideos: 0,
    errors: 0
  };

  // 1. Collect global trending videos (excluding shorts)
  console.log('[Videos Collection] Collecting global trending videos...');
  try {
    const globalVideos = await youtube.getMostPopularVideos(100);
    const globalData = globalVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);

    if (globalData.length > 0) {
      await db.batchUpsertVideosWithStats(globalData);
      totalStats.globalVideos = globalData.length;
      console.log(`[Videos Collection] Inserted ${globalData.length} global trending videos`);
    }
  } catch (error) {
    console.error('[Videos Collection] Error collecting global videos:', error);
    totalStats.errors++;
  }

  // 2. Collect category-specific trending videos
  console.log('[Videos Collection] Collecting category trending videos...');
  for (const categoryId of POPULAR_CATEGORIES) {
    try {
      console.log(`[Videos Collection] Processing category ${categoryId} videos...`);

      const trendingVideos = await youtube.getMostPopularVideosByCategory(categoryId, 100);

      if (trendingVideos.length > 0) {
        const trendingData = trendingVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (trendingData.length > 0) {
          await db.batchUpsertVideosWithStats(trendingData);
          totalStats.categoryVideos += trendingData.length;
          console.log(`[Videos Collection] Added ${trendingData.length} trending videos for category ${categoryId}`);
        }
      }

      totalStats.categoriesProcessed++;

      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`[Videos Collection] Error processing category ${categoryId}:`, error);
      totalStats.errors++;
    }
  }

  console.log(`[Videos Collection] Completed: ${totalStats.globalVideos} global, ${totalStats.categoryVideos} category videos across ${totalStats.categoriesProcessed} categories`);

  return totalStats;
}

export async function POST(request) {
  try {
    console.log('[Videos Collection] Videos collection endpoint triggered');

    const context = getCloudflareContext();
    const env = context.env;

    if (!env.YOUTUBE_API_KEY) {
      console.error('[Videos Collection] YOUTUBE_API_KEY not found in environment');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    if (!env.DB) {
      console.error('[Videos Collection] Database not found in environment');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const result = await triggerVideosCollection(env);

    const response = {
      success: true,
      type: 'videos_collection',
      message: 'Regular videos collection completed successfully',
      timestamp: new Date().toISOString(),
      statistics: result
    };

    console.log(`[Videos Collection] Completed successfully`, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Videos Collection] Error in videos collection:', error);

    return NextResponse.json({
      success: false,
      error: 'Videos collection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow manual triggering
export async function GET(request) {
  console.log('[Videos Collection] Manual trigger via GET request');
  return POST(request);
}
