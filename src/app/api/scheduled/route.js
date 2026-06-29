import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Import our collection handlers
async function triggerVideoCollection(env) {
  console.log('[Scheduled] Triggering global video collection...');

  const { YouTubeApiService } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');

  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const db = new DatabaseService(env.DB);

  // Collect trending videos (fetch top 100 from YouTube's most popular chart)
  console.log('[Scheduled] Collecting global trending videos...');
  const globalVideos = await youtube.getMostPopularVideos(100);

  // Transform and prepare for batch insert
  const globalData = globalVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);

  // Batch insert global videos
  await db.batchUpsertVideosWithStats(globalData);
  console.log(`[Scheduled] Inserted ${globalData.length} global trending videos`);

  // Collect global trending Shorts (top 100)
  console.log('[Scheduled] Collecting global trending Shorts...');
  let shortsCount = 0;
  try {
    const shortsVideos = await youtube.getMostPopularShorts(100);

    if (shortsVideos.length > 0) {
      const shortsData = shortsVideos.map(video => youtube.transformToDbFormat(video)).filter(Boolean);
      if (shortsData.length > 0) {
        await db.batchUpsertVideosWithStats(shortsData);
        console.log(`[Scheduled] Inserted ${shortsData.length} global trending Shorts`);
        shortsCount = shortsData.length;
      }
    }
  } catch (error) {
    console.error('[Scheduled] Error fetching Shorts:', error);
  }

  // Clear caches after successful collection
  await clearAllCaches(env);

  return {
    globalVideos: globalData.length,
    globalShorts: shortsCount,
    totalVideos: globalData.length + shortsCount
  };
}

async function triggerCreatorCollection(env) {
  console.log('[Scheduled] Triggering creator collection...');
  
  const { YouTubeApiService } = await import('@/lib/youtube-api');
  const { DatabaseService } = await import('@/lib/database');
  
  const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
  const database = new DatabaseService(env.DB);

  // Prioritize the highest-view channels first so top creators get profile data quickly.
  const channelIdsQuery = await env.DB.prepare(`
    SELECT
      v.channel_id,
      MAX(v.channel_title) AS channel_title,
      SUM(m.view_count) AS total_views
    FROM videos v
    INNER JOIN mv_latest_video_stats m ON v.id = m.video_id
    LEFT JOIN creators c ON v.channel_id = c.channel_id
    WHERE v.channel_id IS NOT NULL
      AND v.channel_title IS NOT NULL
      AND (c.channel_id IS NULL OR c.updated_at < datetime('now', '-12 hours'))
    GROUP BY v.channel_id
    ORDER BY total_views DESC
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

  // Refresh view counts for off-chart videos published in the last 90 days.
  // These videos are no longer in the trending top 200 but we still want to
  // track their view trajectory for creator history pages.
  let offChartRefreshed = 0;
  try {
    // Fetch old stats alongside IDs so we can compute deltas for video_daily_stats
    // without touching video_stats (which would trigger mv_latest contamination).
    const offChartQuery = await env.DB.prepare(`
      SELECT v.id, vs.current_views, vs.current_likes, vs.current_comments
      FROM videos v
      INNER JOIN video_summary vs ON vs.video_id = v.id
      WHERE vs.last_seen < datetime('now', '-2 hours')
        AND v.published_at > datetime('now', '-90 days')
      ORDER BY vs.current_views DESC
      LIMIT 250
    `).all();

    const offChartRows = offChartQuery.results || [];
    const offChartIds = offChartRows.map(r => r.id);
    if (offChartIds.length > 0) {
      console.log(`[Scheduled] Refreshing view counts for ${offChartIds.length} off-chart videos`);
      const freshStats = await youtube.getVideoStatsBatch(offChartIds);

      const oldById = {};
      for (const r of offChartRows) oldById[r.id] = r;

      const capturedAt = database.getCaptureBucketTimestamp();
      const today = capturedAt.slice(0, 10); // YYYY-MM-DD

      const summaryStmts = freshStats.map(s =>
        env.DB.prepare(
          `UPDATE video_summary
           SET current_views = ?, current_likes = ?, current_comments = ?, updated_at = ?
           WHERE video_id = ?`
        ).bind(s.viewCount, s.likeCount, s.commentCount, capturedAt, s.id)
      );

      // Write directly to video_daily_stats (bypasses video_stats and its trigger).
      // ON CONFLICT keeps the original views_start from the first run of the day,
      // updates views_end to the latest value, and recomputes views_delta.
      const dailyStmts = freshStats.map(s => {
        const old = oldById[s.id] || {};
        const viewsStart = old.current_views ?? s.viewCount;
        const viewsDelta = Math.max(0, s.viewCount - viewsStart);
        const likesDelta = (s.likeCount && old.current_likes != null)
          ? Math.max(0, s.likeCount - old.current_likes) : null;
        const commentsDelta = (s.commentCount && old.current_comments != null)
          ? Math.max(0, s.commentCount - old.current_comments) : null;
        return env.DB.prepare(`
          INSERT INTO video_daily_stats
            (video_id, day, views_start, views_end, views_delta, likes_delta, comments_delta, snapshot_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(video_id, day) DO UPDATE SET
            views_end      = excluded.views_end,
            views_delta    = MAX(0, excluded.views_end - video_daily_stats.views_start),
            likes_delta    = COALESCE(excluded.likes_delta, video_daily_stats.likes_delta),
            comments_delta = COALESCE(excluded.comments_delta, video_daily_stats.comments_delta),
            snapshot_count = video_daily_stats.snapshot_count + 1
        `).bind(s.id, today, viewsStart, s.viewCount, viewsDelta, likesDelta, commentsDelta);
      });

      await env.DB.batch([...summaryStmts, ...dailyStmts]);
      offChartRefreshed = freshStats.length;
      console.log(`[Scheduled] Off-chart view refresh done: ${offChartRefreshed} videos updated`);
    }
  } catch (err) {
    console.error('[Scheduled] Off-chart view refresh failed (non-fatal):', err);
  }

  // Clear caches after successful creator collection
  await clearAllCaches(env);

  return { processedChannels: creatorsData.length, offChartRefreshed };
}

// Function to clear all API caches
async function clearAllCaches(env) {
  console.log('[Scheduled] Clearing all API caches...');
  
  try {
    const cacheKeys = [
      '/api/leaderboard/global',
      '/api/leaderboard/global?limit=10',
      '/api/leaderboard/global?limit=100',
      '/api/leaderboard/shorts',
      '/api/leaderboard/shorts?limit=10',
      '/api/creators/top',
      '/api/creators/top?include_videos=true&limit=50&videos_per_creator=3'
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
