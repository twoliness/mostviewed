import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Import our collection handlers
async function triggerVideoCollection(env) {
  console.log('[Scheduled] Triggering enhanced video collection...');
  
  const { YouTubeApiService, POPULAR_CATEGORIES } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');
  
  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const db = new DatabaseService(env.DB);

  // STEP 1: Refresh stats for existing high-performing videos to get latest view counts
  console.log('[Scheduled] Refreshing stats for existing high-performing videos...');
  const videosToRefresh = await db.getTopVideosForRefresh(500); // Get top 500 videos that need refresh
  let refreshedCount = 0;
  
  if (videosToRefresh.length > 0) {
    console.log(`[Scheduled] Found ${videosToRefresh.length} videos to refresh`);
    const refreshedStats = await youtube.refreshVideoStats(videosToRefresh);
    
    if (refreshedStats.length > 0) {
      const statsData = refreshedStats.map(video => youtube.transformRefreshedStats(video)).filter(Boolean);
      if (statsData.length > 0) {
        await db.batchInsertRefreshedStats(statsData);
        refreshedCount = statsData.length;
        console.log(`[Scheduled] Refreshed stats for ${statsData.length} existing videos`);
      }
    }
  }

  // STEP 2: Discover new high-performing videos using search API - DISABLED TO SAVE QUOTA
  // Search API costs 100 units per call, which quickly exhausts the daily quota
  console.log('[Scheduled] Skipping search API to conserve quota (disabled)');
  let newHighPerformingVideos = 0;

  // STEP 3: Collect trending videos for discovery (reduced to 50 to save quota)
  console.log('[Scheduled] Collecting trending videos for discovery...');
  const globalVideos = await youtube.getMostPopularVideos(50);
  
  // Transform and prepare for batch insert
  const globalData = globalVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
  
  // Batch insert global videos
  await db.batchUpsertVideosWithStats(globalData);
  console.log(`[Scheduled] Inserted ${globalData.length} trending discovery videos`);

  // STEP 4: Collect category-specific content (reduced scope)
  let totalCategoryVideos = 0;
  let totalCategoryShorts = 0;
  for (const categoryId of POPULAR_CATEGORIES) {
    try {
      console.log(`[Scheduled] Fetching trending videos for category ${categoryId}...`);
      const categoryVideos = await youtube.getMostPopularVideosByCategory(categoryId, 50);
      
      if (categoryVideos.length > 0) {
        const categoryData = categoryVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (categoryData.length > 0) {
          await db.batchUpsertVideosWithStats(categoryData);
          console.log(`[Scheduled] Inserted ${categoryData.length} videos for category ${categoryId}`);
          totalCategoryVideos += categoryData.length;
        }
      }

      // Add a small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

      // Collect shorts for this category (reduced to 50 to save quota)
      console.log(`[Scheduled] Fetching trending shorts for category ${categoryId}...`);
      const categoryShorts = await youtube.getMostPopularShortsByCategory(categoryId, 50);
      
      if (categoryShorts.length > 0) {
        const shortsData = categoryShorts.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
        if (shortsData.length > 0) {
          await db.batchUpsertVideosWithStats(shortsData);
          console.log(`[Scheduled] Inserted ${shortsData.length} shorts for category ${categoryId}`);
          totalCategoryShorts += shortsData.length;
        }
      }

      // Add a small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`[Scheduled] Error fetching category ${categoryId}:`, error);
      // Continue with other categories
    }
  }

  // Collect trending Shorts (reduced to 50 to save quota)
  console.log('[Scheduled] Fetching trending Shorts...');
  let shortsCount = 0;
  try {
    const shortsVideos = await youtube.getMostPopularShorts(50);
    
    if (shortsVideos.length > 0) {
      const shortsData = shortsVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
      if (shortsData.length > 0) {
        await db.batchUpsertVideosWithStats(shortsData);
        console.log(`[Scheduled] Inserted ${shortsData.length} trending Shorts`);
        shortsCount = shortsData.length;
      }
    }
  } catch (error) {
    console.error('[Scheduled] Error fetching Shorts:', error);
  }

  // Clear caches after successful collection
  await clearAllCaches(env);

  return {
    refreshedVideos: refreshedCount,
    newHighPerformingVideos: newHighPerformingVideos,
    discoveryVideos: globalData.length,
    categoryVideos: totalCategoryVideos,
    categoryShorts: totalCategoryShorts,
    globalShorts: shortsCount,
    totalNewData: newHighPerformingVideos + globalData.length + totalCategoryVideos + totalCategoryShorts + shortsCount,
    totalRefreshed: refreshedCount,
    categoriesProcessed: POPULAR_CATEGORIES.length
  };
}

async function triggerCreatorCollection(env) {
  console.log('[Scheduled] Triggering creator collection...');
  
  const { YouTubeApiService } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');
  
  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const database = new DatabaseService(env.DB);

  // Get unique channel IDs from videos that need creator profile updates
  const channelIdsQuery = await env.DB.prepare(`
    SELECT DISTINCT v.channel_id, v.channel_title
    FROM videos v
    LEFT JOIN creators c ON v.channel_id = c.channel_id
    WHERE c.channel_id IS NULL 
       OR c.updated_at < datetime('now', '-12 hours')
    ORDER BY v.channel_id
    LIMIT 50
  `).all();

  const channelsToUpdate = channelIdsQuery.results;
  
  if (channelsToUpdate.length === 0) {
    console.log('[Scheduled] No channels need updating');
    return { processedChannels: 0 };
  }

  console.log(`[Scheduled] Found ${channelsToUpdate.length} channels to update`);

  // Extract channel IDs
  const channelIds = channelsToUpdate.map(c => c.channel_id);

  // Fetch channel details from YouTube API
  console.log('[Scheduled] Fetching channel details from YouTube API...');
  const channelDetails = await youtube.getChannelDetails(channelIds);
  
  if (channelDetails.length === 0) {
    console.log('[Scheduled] No channel details received from API');
    return { processedChannels: 0 };
  }

  // Transform channel data to database format
  const creatorsData = channelDetails.map(channel => 
    youtube.transformChannelToDbFormat(channel)
  );

  console.log(`[Scheduled] Processing ${creatorsData.length} creator profiles`);

  // Batch upsert creators to database
  await database.batchUpsertCreators(creatorsData);

  // Clear caches after successful creator collection
  await clearAllCaches(env);

  return { processedChannels: creatorsData.length };
}

// Function to clear all API caches
async function clearAllCaches(env) {
  console.log('[Scheduled] Clearing all API caches...');
  
  try {
    const cacheKeys = [
      '/api/leaderboard/global',
      '/api/leaderboard/shorts',
      '/api/creators/top'
    ];
    
    // Add category cache keys
    const { POPULAR_CATEGORIES_DISPLAY } = await import('@/lib/types');
    for (const category of POPULAR_CATEGORIES_DISPLAY) {
      cacheKeys.push(`/api/leaderboard/category/${category.slug}`);
    }
    
    // Clear all caches
    const clearPromises = cacheKeys.map(key => 
      env.VIDTRENDS_CACHE.delete(key).catch(err => 
        console.error(`[Scheduled] Failed to clear cache ${key}:`, err)
      )
    );
    
    await Promise.all(clearPromises);
    console.log(`[Scheduled] Successfully cleared ${cacheKeys.length} cache entries`);
  } catch (error) {
    console.error('[Scheduled] Error clearing caches:', error);
  }
}

export async function POST(request) {
  try {
    console.log('[Scheduled] Scheduled function triggered');
    
    const context = getCloudflareContext();
    const env = context.env;
    
    if (!env.YOUTUBE_API_KEY) {
      console.error('[Scheduled] YOUTUBE_API_KEY not found in environment');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    if (!env.DB) {
      console.error('[Scheduled] Database not found in environment');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get the current time to determine which task to run
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    // Determine which cron job triggered this
    // Creator collection runs every 12 hours (0 and 12 UTC), exactly on the hour
    // Video collection runs every 30 minutes
    const isCreatorCollection = currentMinute === 0 && (currentHour % 12 === 0);
    
    let result;
    if (isCreatorCollection) {
      console.log('[Scheduled] Running creator collection (12-hour schedule)');
      const creatorStats = await triggerCreatorCollection(env);
      result = {
        success: true,
        type: 'creator_collection',
        message: 'Creator collection completed successfully',
        timestamp: new Date().toISOString(),
        statistics: creatorStats
      };
    } else {
      console.log('[Scheduled] Running video collection (30-minute schedule)');
      const videoStats = await triggerVideoCollection(env);
      result = {
        success: true,
        type: 'video_collection',
        message: 'Video collection completed successfully',
        timestamp: new Date().toISOString(),
        statistics: videoStats
      };
    }

    console.log(`[Scheduled] ${result.type} completed successfully`, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Scheduled] Error in scheduled function:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Scheduled function failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow manual triggering
export async function GET(request) {
  console.log('[Scheduled] Manual trigger via GET request');
  return POST(request);
}