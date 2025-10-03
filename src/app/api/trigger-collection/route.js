import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { YouTubeApiService, POPULAR_CATEGORIES } from '@/lib/youtube-api';
import { DatabaseService } from '@/lib/database';

export async function POST(request) {
  try {
    console.log('[API] Manual data collection triggered');
    
    const context = getCloudflareContext();
    const env = context.env;    
    // Initialize services
    const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
    const db = new DatabaseService(env.DB);

    // Collect global trending videos (target: 50 regular videos)
    console.log('[API] Fetching global trending videos...');
    const globalVideos = await youtube.getMostPopularVideos(50);

    // Transform and prepare for batch insert
    const globalData = globalVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);

    // Batch insert global videos
    await db.batchUpsertVideosWithStats(globalData);
    console.log(`[API] Inserted ${globalData.length} global trending videos`);

    // Collect trending videos for each popular category (target: 50 videos + 50 shorts per category)
    let totalCategoryVideos = 0;
    let totalCategoryShorts = 0;
    for (const categoryId of POPULAR_CATEGORIES) {
      try {
        console.log(`[API] Fetching trending videos for category ${categoryId}...`);
        const categoryVideos = await youtube.getMostPopularVideosByCategory(categoryId, 50);

        if (categoryVideos.length > 0) {
          const categoryData = categoryVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
          if (categoryData.length > 0) {
            await db.batchUpsertVideosWithStats(categoryData);
            console.log(`[API] Inserted ${categoryData.length} videos for category ${categoryId}`);
            totalCategoryVideos += categoryData.length;
          }
        }

        // Add a small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

        // Collect shorts for this category (target: 50 shorts, fetch ~100 to filter)
        console.log(`[API] Fetching trending shorts for category ${categoryId}...`);
        const categoryShorts = await youtube.getMostPopularShortsByCategory(categoryId, 50);

        if (categoryShorts.length > 0) {
          const shortsData = categoryShorts.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
          if (shortsData.length > 0) {
            await db.batchUpsertVideosWithStats(shortsData);
            console.log(`[API] Inserted ${shortsData.length} shorts for category ${categoryId}`);
            totalCategoryShorts += shortsData.length;
          }
        }

        // Add a small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[API] Error fetching category ${categoryId}:`, error);
        // Continue with other categories
      }
    }

    // Collect global trending Shorts (target: 50 shorts, fetch ~150 to filter)
    console.log('[API] Fetching trending Shorts...');
    let shortsCount = 0;
    try {
      const shortsVideos = await youtube.getMostPopularShorts(50);

      if (shortsVideos.length > 0) {
        const shortsData = shortsVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (shortsData.length > 0) {
          await db.batchUpsertVideosWithStats(shortsData);
          console.log(`[API] Inserted ${shortsData.length} trending Shorts`);
          shortsCount = shortsData.length;
        }
      }
    } catch (error) {
      console.error('[API] Error fetching Shorts:', error);
    }

    // OpenNext.js will handle caching automatically - no manual cache clearing needed

    const summary = {
      success: true,
      message: 'Data collection completed successfully',
      timestamp: new Date().toISOString(),
      statistics: {
        globalVideos: globalData.length,
        categoryVideos: totalCategoryVideos,
        categoryShorts: totalCategoryShorts,
        globalShorts: shortsCount,
        totalVideos: globalData.length + totalCategoryVideos + totalCategoryShorts + shortsCount,
        categoriesProcessed: POPULAR_CATEGORIES.length
      }
    };

    console.log('[API] Data collection completed successfully', summary);

    return NextResponse.json(summary, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[API] Error in data collection:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Data collection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}