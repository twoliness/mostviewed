import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { YouTubeApiService } from '@/lib/youtube-api';
import { DatabaseService } from '@/lib/database';

export async function POST(request) {
  try {
    console.log('[Creator Collection] Starting creator profile collection process...');
    
    const context = getCloudflareContext();
    const env = context.env;    
    // Initialize services
    const youtubeApi = new YouTubeApiService(env.YOUTUBE_API_KEY);
    const database = new DatabaseService(env.DB);

    console.log('[Creator Collection] Initialized services successfully');

    // Get unique channel IDs from videos that need creator profile updates
    const channelIdsQuery = await env.DB.prepare(`
      SELECT DISTINCT v.channel_id, v.channel_title
      FROM videos v
      LEFT JOIN creators c ON v.channel_id = c.channel_id
      WHERE v.channel_id IS NOT NULL 
        AND v.channel_title IS NOT NULL
        AND (c.channel_id IS NULL OR c.updated_at < datetime('now', '-12 hours'))
      ORDER BY v.channel_id
    `).all();

    const channelsToUpdate = channelIdsQuery.results;
    
    if (channelsToUpdate.length === 0) {
      console.log('[Creator Collection] No channels need updating');
      return NextResponse.json({
        success: true,
        message: 'No channels need updating',
        processedChannels: 0
      });
    }

    console.log(`[Creator Collection] Found ${channelsToUpdate.length} channels to update`);

    // Extract channel IDs
    const channelIds = channelsToUpdate.map(c => c.channel_id);

    // Process in batches to respect API rate limits (YouTube API allows 50 channels per request)
    const batchSize = 50;
    let totalProcessed = 0;
    const allCreatorsData = [];

    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batchIds = channelIds.slice(i, i + batchSize);
      
      console.log(`[Creator Collection] Processing batch ${Math.floor(i/batchSize) + 1}: ${batchIds.length} channels`);
      
      try {
        // Fetch channel details from YouTube API
        const channelDetails = await youtubeApi.getChannelDetails(batchIds);
        
        if (channelDetails.length > 0) {
          // Transform channel data to database format
          const creatorsData = channelDetails.map(channel => 
            youtubeApi.transformChannelToDbFormat(channel)
          );

          // Batch upsert creators to database
          await database.batchUpsertCreators(creatorsData);
          
          allCreatorsData.push(...creatorsData);
          totalProcessed += creatorsData.length;
          
          console.log(`[Creator Collection] Batch ${Math.floor(i/batchSize) + 1} completed: ${creatorsData.length} creators processed`);
        }
        
        // Add small delay between batches to be respectful to the API
        if (i + batchSize < channelIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`[Creator Collection] Error in batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        // Continue with next batch
      }
    }

    const result = {
      success: true,
      message: `Successfully processed ${totalProcessed} creator profiles from ${channelsToUpdate.length} total channels`,
      processedChannels: totalProcessed,
      totalChannelsFound: channelsToUpdate.length,
      batchesProcessed: Math.ceil(channelIds.length / batchSize),
      timestamp: new Date().toISOString()
    };

    // Clear creators cache to ensure fresh data
    try {
      const cacheKeys = [
        '/api/creators/top',
        '/api/creators/top?include_videos=true',
        '/api/debug/creators-count'
      ];
      
      for (const key of cacheKeys) {
        await env.VIDTRENDS_CACHE.delete(key);
      }
      
      console.log('[Creator Collection] Cleared creators cache');
    } catch (cacheError) {
      console.error('[Creator Collection] Error clearing cache:', cacheError);
    }

    console.log('[Creator Collection] Collection completed successfully:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Creator Collection] Error during collection:', error);
    
    return NextResponse.json(
      { 
        error: 'Creator collection failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow manual triggering via GET request (for development/testing)
export async function GET(request) {
  console.log('[Creator Collection] Manual trigger via GET request');
  return POST(request);
}