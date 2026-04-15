import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

function parseBoundedInt(value, fallback, maxValue) {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), maxValue);
}

export async function GET(request) {
  try {
    console.log('[API] Fetching top creators from database');
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    
    // Get query parameters
    const url = new URL(request.url);
    const includeVideos = url.searchParams.get('include_videos') === 'true';
    const limit = parseBoundedInt(url.searchParams.get('limit'), 10, 100);
    const videosPerCreator = parseBoundedInt(url.searchParams.get('videos_per_creator'), 5, 10);
    
    // Check cache first
    const cacheKey = `/api/creators/top?include_videos=${includeVideos}&limit=${limit}&videos_per_creator=${videosPerCreator}`;
    const cache = env.VIDTRENDS_CACHE;
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`[API] Returning cached creators data (${includeVideos ? 'with' : 'without'} videos)`);
        return new Response(cached, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          }
        });
      }
    }
    
    // Get total creators count for logging
    const totalCreators = await db.getCreatorsCount();
    console.log(`[API] Database contains ${totalCreators} unique creators`);
    
    let data;
    if (includeVideos) {
      console.log(`[API] Fetching ${limit} creators with ${videosPerCreator} videos each`);
      data = await db.getTopCreatorsWithVideos(limit, videosPerCreator);
    } else {
      console.log(`[API] Fetching top ${limit} creators (out of ${totalCreators} total)`);
      data = await db.getTopCreators(limit);
    }
    
    console.log(`[API] Found ${data.length} top creators`);

    // Hydrate missing avatars for top creators on-demand so UI can render real channel profile images.
    const missingAvatarChannelIds = [
      ...new Set(
        data
          .filter((creator) => creator.channel_id && !creator.avatar_url)
          .map((creator) => creator.channel_id)
      ),
    ].slice(0, 50);

    if (missingAvatarChannelIds.length > 0 && env.YOUTUBE_API_KEY) {
      try {
        console.log(`[API] Found ${missingAvatarChannelIds.length} creators without avatars. Fetching channel profiles...`);

        const { YouTubeApiService } = await import('@/lib/youtube-api');
        const youtube = new YouTubeApiService(env.YOUTUBE_API_KEY);
        const channelDetails = await youtube.getChannelDetails(missingAvatarChannelIds);

        if (channelDetails.length > 0) {
          const creatorProfiles = channelDetails.map((channel) => youtube.transformChannelToDbFormat(channel));
          await db.batchUpsertCreators(creatorProfiles);

          const profileByChannelId = new Map(
            creatorProfiles.map((profile) => [profile.channel_id, profile])
          );

          data = data.map((creator) => {
            const profile = profileByChannelId.get(creator.channel_id);
            if (!profile) {
              return creator;
            }

            return {
              ...creator,
              avatar_url: profile.avatar_url || creator.avatar_url || null,
              description: creator.description || profile.description || null,
              subscriber_count: creator.subscriber_count || profile.subscriber_count || null,
            };
          });
        }
      } catch (avatarError) {
        console.error('[API] Failed to hydrate missing creator avatars:', avatarError);
      }
    }
    
    // If no data, return empty array with appropriate message
    if (data.length === 0) {
      console.log('[API] No creator data found in database');
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      });
    }
    
    const response = JSON.stringify(data);
    
    // Cache the response for 5 minutes
    if (cache) {
      await cache.put(cacheKey, response, { expirationTtl: 300 });
      console.log(`[API] Cached creators response (${data.length} creators)`);
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching top creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top creators data' },
      { status: 500 }
    );
  }
}
