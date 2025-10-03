import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Enhanced category collection handler
async function triggerCategoryCollection(env) {
  console.log('[Category Collection] Starting comprehensive category data collection...');
  
  const { YouTubeApiService, POPULAR_CATEGORIES } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');
  
  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const db = new DatabaseService(env.DB);

  let totalStats = {
    categoriesProcessed: 0,
    videosRefreshed: 0,
    newHighPerformers: 0,
    trendingVideos: 0,
    trendingShorts: 0,
    errors: 0
  };

  // Process each category comprehensively
  for (const categoryId of POPULAR_CATEGORIES) {
    try {
      console.log(`[Category Collection] Processing category ${categoryId}...`);
      
      // STEP 1: Refresh stats for existing videos in this category
      const existingVideos = await db.getExistingVideosForCategory(categoryId, 100);
      if (existingVideos.length > 0) {
        console.log(`[Category Collection] Refreshing ${existingVideos.length} existing videos for category ${categoryId}`);
        const refreshedStats = await youtube.refreshVideoStats(existingVideos);
        
        if (refreshedStats.length > 0) {
          const statsData = refreshedStats.map(video => youtube.transformRefreshedStats(video)).filter(Boolean);
          if (statsData.length > 0) {
            await db.batchInsertRefreshedStats(statsData);
            totalStats.videosRefreshed += statsData.length;
            console.log(`[Category Collection] Refreshed ${statsData.length} videos for category ${categoryId}`);
          }
        }
      }

      // STEP 2: Search for new high-performing videos in this category
      console.log(`[Category Collection] Searching for high-performing videos in category ${categoryId}...`);
      const highPerformingVideos = await youtube.searchHighPerformingVideos(categoryId, 50);
      
      if (highPerformingVideos.length > 0) {
        const newVideoData = highPerformingVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (newVideoData.length > 0) {
          await db.batchUpsertVideosWithStats(newVideoData);
          totalStats.newHighPerformers += newVideoData.length;
          console.log(`[Category Collection] Added ${newVideoData.length} high-performing videos for category ${categoryId}`);
        }
      }

      // STEP 3: Get fresh trending content for this category
      console.log(`[Category Collection] Fetching trending videos for category ${categoryId}...`);
      const trendingVideos = await youtube.getMostPopularVideosByCategory(categoryId, 100);
      
      if (trendingVideos.length > 0) {
        const trendingData = trendingVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (trendingData.length > 0) {
          await db.batchUpsertVideosWithStats(trendingData);
          totalStats.trendingVideos += trendingData.length;
          console.log(`[Category Collection] Added ${trendingData.length} trending videos for category ${categoryId}`);
        }
      }

      // STEP 4: Get trending shorts for this category
      console.log(`[Category Collection] Fetching trending shorts for category ${categoryId}...`);
      const trendingShorts = await youtube.getMostPopularShortsByCategory(categoryId, 100);
      
      if (trendingShorts.length > 0) {
        const shortsData = trendingShorts.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (shortsData.length > 0) {
          await db.batchUpsertVideosWithStats(shortsData);
          totalStats.trendingShorts += shortsData.length;
          console.log(`[Category Collection] Added ${shortsData.length} trending shorts for category ${categoryId}`);
        }
      }

      totalStats.categoriesProcessed++;
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay between categories
      
    } catch (error) {
      console.error(`[Category Collection] Error processing category ${categoryId}:`, error);
      totalStats.errors++;
      // Continue with other categories
    }
  }

  // Clear caches after successful collection
  await clearCategoryCache(env);

  console.log(`[Category Collection] Completed: ${totalStats.categoriesProcessed} categories, ${totalStats.videosRefreshed} refreshed, ${totalStats.newHighPerformers} new high-performers, ${totalStats.trendingVideos} trending videos, ${totalStats.trendingShorts} trending shorts`);
  
  return totalStats;
}

// Function to clear category-related caches
async function clearCategoryCache(env) {
  console.log('[Category Collection] Clearing category-related caches...');
  
  try {
    const cacheKeys = [];
    
    // Add category cache keys
    const { POPULAR_CATEGORIES_DISPLAY } = await import('@/lib/types');
    for (const category of POPULAR_CATEGORIES_DISPLAY) {
      cacheKeys.push(`/api/leaderboard/category/${category.slug}`);
      cacheKeys.push(`/api/leaderboard/category/${category.slug}/shorts`);
    }
    
    // Also clear global caches since they might be affected
    cacheKeys.push('/api/leaderboard/global');
    cacheKeys.push('/api/leaderboard/shorts');
    
    // Clear all caches
    const clearPromises = cacheKeys.map(key => 
      env.VIDTRENDS_CACHE.delete(key).catch(err => 
        console.error(`[Category Collection] Failed to clear cache ${key}:`, err)
      )
    );
    
    await Promise.all(clearPromises);
    console.log(`[Category Collection] Successfully cleared ${cacheKeys.length} cache entries`);
  } catch (error) {
    console.error('[Category Collection] Error clearing caches:', error);
  }
}

export async function POST(request) {
  try {
    console.log('[Category Collection] Category collection endpoint triggered');
    
    const context = getCloudflareContext();
    const env = context.env;
    
    if (!env.YOUTUBE_API_KEY) {
      console.error('[Category Collection] YOUTUBE_API_KEY not found in environment');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    if (!env.DB) {
      console.error('[Category Collection] Database not found in environment');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const result = await triggerCategoryCollection(env);

    const response = {
      success: true,
      type: 'category_collection',
      message: 'Category collection completed successfully',
      timestamp: new Date().toISOString(),
      statistics: result
    };

    console.log(`[Category Collection] Completed successfully`, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Category Collection] Error in category collection:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Category collection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow manual triggering
export async function GET(request) {
  console.log('[Category Collection] Manual trigger via GET request');
  return POST(request);
}