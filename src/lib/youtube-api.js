

export class YouTubeApiService {
  apiKey;
  baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Parse ISO 8601 duration to seconds
   * PT4M13S -> 253 seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0'); 
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Fetch most popular videos globally with pagination
   */
  async getMostPopularVideos(targetResults = 100) {
    console.log(`[YouTube API] Fetching up to ${targetResults} most popular videos globally`);
    
    let allVideos = [];
    let pageToken = null;
    let attempts = 0;
    const maxAttempts = Math.ceil(targetResults / 50); // 50 is max per API call
    
    while (allVideos.length < targetResults && attempts < maxAttempts) {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('part', 'snippet,contentDetails,statistics');
      url.searchParams.set('chart', 'mostPopular');
      url.searchParams.set('regionCode', 'US');
      url.searchParams.set('maxResults', '50'); // Max allowed per request
      url.searchParams.set('key', this.apiKey);
      
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      console.log(`[YouTube API] Global request ${attempts + 1}: ${url.toString().replace(this.apiKey, '***API_KEY***')}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`[YouTube API] Error fetching global videos: ${response.status} ${response.statusText}`);
        break; // Don't throw error, just return what we have
      }

      const data = await response.json();
      console.log(`[YouTube API] Global batch ${attempts + 1}: Got ${data.items.length} videos`);

      // Filter out shorts (videos ≤180 seconds) for regular video collections
      const regularVideos = data.items.filter(video => {
        const durationSeconds = this.parseDuration(video.contentDetails.duration);
        return durationSeconds > 180 || durationSeconds === 0;
      });

      console.log(`[YouTube API] Global batch ${attempts + 1}: ${regularVideos.length} regular videos (${data.items.length - regularVideos.length} shorts excluded)`);
      allVideos.push(...regularVideos);
      pageToken = data.nextPageToken;
      attempts++;
      
      // If no more pages or no more videos, break
      if (!pageToken || data.items.length === 0) {
        break;
      }
      
      // Add small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Limit to target results
    const finalVideos = allVideos.slice(0, targetResults);
    console.log(`[YouTube API] Successfully fetched ${finalVideos.length} total global videos (requested ${targetResults})`);
    return finalVideos;
  }

  /**
   * Fetch most popular videos for a specific category with pagination to get more results
   */
  async getMostPopularVideosByCategory(categoryId, targetResults = 100) {
    console.log(`[YouTube API] Fetching up to ${targetResults} most popular videos for category ${categoryId}`);
    
    let allVideos = [];
    let pageToken = null;
    let attempts = 0;
    const maxAttempts = Math.ceil(targetResults / 50); // 50 is max per API call
    
    while (allVideos.length < targetResults && attempts < maxAttempts) {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('part', 'snippet,contentDetails,statistics');
      url.searchParams.set('chart', 'mostPopular');
      url.searchParams.set('regionCode', 'US');
      url.searchParams.set('videoCategoryId', categoryId.toString());
      url.searchParams.set('maxResults', '50'); // Max allowed per request
      url.searchParams.set('key', this.apiKey);
      
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      console.log(`[YouTube API] Request ${attempts + 1} for category ${categoryId}: ${url.toString().replace(this.apiKey, '***API_KEY***')}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`[YouTube API] Error fetching category ${categoryId} videos: ${response.status} ${response.statusText}`);
        if (response.status === 403) {
          console.warn(`[YouTube API] Category ${categoryId} is restricted (403 Forbidden) - skipping this category`);
        }
        break; // Don't throw error, just return what we have
      }

      const data = await response.json();
      console.log(`[YouTube API] Batch ${attempts + 1}: Got ${data.items.length} videos for category ${categoryId}`);
      
      // Filter out shorts (videos ≤180 seconds) for regular video collections
      const regularVideos = data.items.filter(video => {
        const durationSeconds = this.parseDuration(video.contentDetails.duration);
        return durationSeconds > 180 || durationSeconds === 0;
      });

      console.log(`[YouTube API] Category ${categoryId} batch ${attempts + 1}: ${regularVideos.length} regular videos (${data.items.length - regularVideos.length} shorts excluded)`);
      allVideos.push(...regularVideos);
      pageToken = data.nextPageToken;
      attempts++;
      
      // If no more pages or no more videos, break
      if (!pageToken || data.items.length === 0) {
        break;
      }
      
      // Add small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Limit to target results
    const finalVideos = allVideos.slice(0, targetResults);
    console.log(`[YouTube API] Successfully fetched ${finalVideos.length} total videos for category ${categoryId} (requested ${targetResults})`);
    return finalVideos;
  }

  /**
   * Get YouTube Shorts (videos ≤180 seconds AND portrait orientation) from most popular
   */
  async getMostPopularShorts(maxResults = 100) {
    console.log(`[YouTube API] Fetching YouTube Shorts, target: ${maxResults} shorts`);

    // Fetch more videos to filter for shorts - use pagination to get more content
    const fetchCount = Math.max(200, maxResults * 3);
    console.log(`[YouTube API] Fetching ${fetchCount} videos to filter for shorts`);
    const allVideos = await this.getMostPopularVideos(fetchCount);

    // Filter for shorts (≤180 seconds / 3 minutes duration only)
    const shorts = allVideos.filter(video => {
      const durationSeconds = this.parseDuration(video.contentDetails.duration);
      return durationSeconds <= 180 && durationSeconds > 0;
    });

    console.log(`[YouTube API] Found ${shorts.length} shorts from ${allVideos.length} videos, returning ${Math.min(shorts.length, maxResults)}`);
    return shorts.slice(0, maxResults);
  }

  /**
   * Get YouTube Shorts for a specific category (≤180 seconds AND portrait orientation)
   */
  async getMostPopularShortsByCategory(categoryId, maxResults = 100) {
    console.log(`[YouTube API] Fetching YouTube Shorts for category ${categoryId}, target: ${maxResults} shorts`);

    // Fetch more videos to filter for shorts - use pagination to get more content
    const fetchCount = Math.max(200, maxResults * 4); // Need many more videos since shorts are less common in some categories
    console.log(`[YouTube API] Fetching ${fetchCount} videos from category ${categoryId} to filter for shorts`);
    const allVideos = await this.getMostPopularVideosByCategory(categoryId, fetchCount);

    // Filter for shorts (≤180 seconds / 3 minutes duration only)
    const shorts = allVideos.filter(video => {
      const durationSeconds = this.parseDuration(video.contentDetails.duration);
      return durationSeconds <= 180 && durationSeconds > 0;
    });

    console.log(`[YouTube API] Found ${shorts.length} shorts from ${allVideos.length} videos in category ${categoryId}, returning ${Math.min(shorts.length, maxResults)}`);
    return shorts.slice(0, maxResults);
  }

  /**
   * Fetch channel details for multiple channels
   */
  async getChannelDetails(channelIds) {
    if (!channelIds || channelIds.length === 0) return [];
    
    console.log(`[YouTube API] Fetching channel details for ${channelIds.length} channels`);
    
    // YouTube API allows up to 50 channel IDs per request
    const batchSize = 50;
    const results = [];
    
    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batchIds = channelIds.slice(i, i + batchSize);
      
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set('part', 'snippet,statistics');
      url.searchParams.set('id', batchIds.join(','));
      url.searchParams.set('key', this.apiKey);

      console.log(`[YouTube API] Fetching batch ${Math.floor(i/batchSize) + 1}: ${batchIds.length} channels`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`[YouTube API] Error fetching channels: ${response.status} ${response.statusText}`);
        continue; // Skip this batch but continue with others
      }

      const data = await response.json();
      results.push(...data.items);
      
      console.log(`[YouTube API] Successfully fetched ${data.items.length} channels in this batch`);
    }
    
    console.log(`[YouTube API] Total channels fetched: ${results.length}`);
    return results;
  }

  /**
   * Refresh stats for existing videos to get latest view counts
   */
  async refreshVideoStats(videoIds) {
    if (!videoIds || videoIds.length === 0) return [];
    
    console.log(`[YouTube API] Refreshing stats for ${videoIds.length} videos`);
    
    const batchSize = 50; // YouTube API allows up to 50 video IDs per request
    const results = [];
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batchIds = videoIds.slice(i, i + batchSize);
      
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('part', 'statistics,contentDetails');
      url.searchParams.set('id', batchIds.join(','));
      url.searchParams.set('key', this.apiKey);

      console.log(`[YouTube API] Refreshing batch ${Math.floor(i/batchSize) + 1}: ${batchIds.length} videos`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`[YouTube API] Error refreshing video stats: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      results.push(...data.items);
      
      console.log(`[YouTube API] Successfully refreshed ${data.items.length} video stats in this batch`);
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[YouTube API] Total video stats refreshed: ${results.length}`);
    return results;
  }

  /**
   * Search for high-performing videos using search API
   */
  async searchHighPerformingVideos(categoryId, maxResults = 50) {
    console.log(`[YouTube API] Searching for high-performing videos in category ${categoryId}`);
    
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('order', 'viewCount'); // Order by view count
    url.searchParams.set('publishedAfter', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days
    url.searchParams.set('videoCategoryId', categoryId.toString());
    url.searchParams.set('regionCode', 'US');
    url.searchParams.set('maxResults', Math.min(maxResults, 50).toString());
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[YouTube API] Error searching videos: ${response.status} ${response.statusText}`);
      return [];
    }

    const searchData = await response.json();
    const videoIds = searchData.items.map(item => item.id.videoId).filter(Boolean);
    
    if (videoIds.length === 0) {
      console.log(`[YouTube API] No videos found in search for category ${categoryId}`);
      return [];
    }

    // Get full video details including statistics
    const videosResponse = await this.refreshVideoStats(videoIds);
    
    console.log(`[YouTube API] Found ${videosResponse.length} high-performing videos for category ${categoryId}`);
    return videosResponse;
  }

  /**
   * Transform refreshed video stats to database format
   */
  transformRefreshedStats(video, existingVideoData = null) {
    if (!video.statistics.viewCount || parseInt(video.statistics.viewCount) <= 0) {
      return null;
    }

    return {
      video_id: video.id,
      view_count: parseInt(video.statistics.viewCount),
      like_count: video.statistics.likeCount ? parseInt(video.statistics.likeCount) : null,
      comment_count: video.statistics.commentCount ? parseInt(video.statistics.commentCount) : null,
      captured_at: new Date().toISOString(),
    };
  }

  /**
   * Transform YouTube channel to our database format
   */
  transformChannelToDbFormat(channel) {
    return {
      channel_id: channel.id,
      channel_title: channel.snippet.title,
      description: channel.snippet.description || null,
      avatar_url: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url || null,
      banner_url: channel.snippet.thumbnails.banner?.url || null,
      subscriber_count: channel.statistics.subscriberCount ? parseInt(channel.statistics.subscriberCount) : null,
      video_count: channel.statistics.videoCount ? parseInt(channel.statistics.videoCount) : null,
      view_count: channel.statistics.viewCount ? parseInt(channel.statistics.viewCount) : null,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Transform YouTube video to our database format
   * Returns null if video doesn't have valid view count
   */
  transformToDbFormat(video) {
    // Skip videos without valid view counts (should not happen with mostPopular API)
    if (!video.statistics.viewCount || parseInt(video.statistics.viewCount) <= 0) {
      console.warn(`[YouTube API] Skipping video ${video.id} - invalid view count: ${video.statistics.viewCount}`);
      return null;
    }

    const durationSeconds = this.parseDuration(video.contentDetails.duration);

    // Use medium quality thumbnail (standard across all videos)
    const thumbnail = video.snippet.thumbnails.medium || video.snippet.thumbnails.default;

    // YouTube Shorts are identified by duration only (≤180 seconds / 3 minutes)
    // API thumbnails don't preserve aspect ratio, so we can't reliably detect portrait orientation
    const isShort = durationSeconds <= 180 && durationSeconds > 0;

    return {
      video: {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description || null,
        channel_id: video.snippet.channelId,
        channel_title: video.snippet.channelTitle,
        category_id: parseInt(video.snippet.categoryId),
        published_at: video.snippet.publishedAt,
        thumb_url: thumbnail.url,
        duration: video.contentDetails.duration,
        is_short: isShort,
        width: thumbnail.width || null,
        height: thumbnail.height || null,
      },
      stats: {
        video_id: video.id,
        view_count: parseInt(video.statistics.viewCount),
        like_count: video.statistics.likeCount ? parseInt(video.statistics.likeCount) : null,
        comment_count: video.statistics.commentCount ? parseInt(video.statistics.commentCount) : null,
        captured_at: new Date().toISOString(),
      }
    };
  }

  /**
   * Fetch most popular videos by region/country
   */
  async getMostPopularVideosByRegion(regionCode, targetResults = 50) {
    console.log(`[YouTube API] Fetching up to ${targetResults} most popular videos for ${regionCode}`);

    let allVideos = [];
    let pageToken = null;
    let attempts = 0;
    const maxAttempts = Math.ceil(targetResults / 50);

    while (allVideos.length < targetResults && attempts < maxAttempts) {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('part', 'snippet,contentDetails,statistics');
      url.searchParams.set('chart', 'mostPopular');
      url.searchParams.set('regionCode', regionCode);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', this.apiKey);

      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error(`[YouTube API] Error fetching ${regionCode} videos: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();

      const regularVideos = data.items.filter(video => {
        const durationSeconds = this.parseDuration(video.contentDetails.duration);
        const thumbnail = video.snippet.thumbnails.medium || video.snippet.thumbnails.default;
        const isPortrait = thumbnail && thumbnail.height >= thumbnail.width;
        const isShort = durationSeconds <= 180 && isPortrait;
        return !isShort;
      });

      allVideos.push(...regularVideos);
      pageToken = data.nextPageToken;
      attempts++;

      if (!pageToken || data.items.length === 0) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalVideos = allVideos.slice(0, targetResults);
    console.log(`[YouTube API] Successfully fetched ${finalVideos.length} videos for ${regionCode}`);
    return finalVideos;
  }

  /**
   * Fetch most popular shorts by region/country
   */
  async getMostPopularShortsByRegion(regionCode, targetResults = 50) {
    console.log(`[YouTube API] Fetching ${targetResults} shorts for ${regionCode}`);

    const fetchCount = Math.max(150, targetResults * 3);
    const allVideos = await this.getMostPopularVideosByRegion(regionCode, fetchCount);

    const shorts = allVideos.filter(video => {
      const durationSeconds = this.parseDuration(video.contentDetails.duration);
      const thumbnail = video.snippet.thumbnails.medium || video.snippet.thumbnails.default;
      const isPortrait = thumbnail && thumbnail.height >= thumbnail.width;
      return durationSeconds <= 180 && durationSeconds > 0 && isPortrait;
    });

    console.log(`[YouTube API] Found ${shorts.length} shorts from ${allVideos.length} videos for ${regionCode}`);
    return shorts.slice(0, targetResults);
  }

  /**
   * Fetch most popular videos by category and region
   */
  async getMostPopularVideosByCategoryAndRegion(regionCode, categoryId, targetResults = 50) {
    console.log(`[YouTube API] Fetching ${targetResults} videos for category ${categoryId} in ${regionCode}`);

    let allVideos = [];
    let pageToken = null;
    let attempts = 0;
    const maxAttempts = Math.ceil(targetResults / 50);

    while (allVideos.length < targetResults && attempts < maxAttempts) {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set('part', 'snippet,contentDetails,statistics');
      url.searchParams.set('chart', 'mostPopular');
      url.searchParams.set('regionCode', regionCode);
      url.searchParams.set('videoCategoryId', categoryId.toString());
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', this.apiKey);

      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error(`[YouTube API] Error fetching category ${categoryId} for ${regionCode}: ${response.status}`);
        break;
      }

      const data = await response.json();

      const regularVideos = data.items.filter(video => {
        const durationSeconds = this.parseDuration(video.contentDetails.duration);
        const thumbnail = video.snippet.thumbnails.medium || video.snippet.thumbnails.default;
        const isPortrait = thumbnail && thumbnail.height >= thumbnail.width;
        const isShort = durationSeconds <= 180 && isPortrait;
        return !isShort;
      });

      allVideos.push(...regularVideos);
      pageToken = data.nextPageToken;
      attempts++;

      if (!pageToken || data.items.length === 0) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalVideos = allVideos.slice(0, targetResults);
    console.log(`[YouTube API] Fetched ${finalVideos.length} videos for category ${categoryId} in ${regionCode}`);
    return finalVideos;
  }

  /**
   * Fetch most popular shorts by category and region
   */
  async getMostPopularShortsByCategoryAndRegion(regionCode, categoryId, targetResults = 50) {
    console.log(`[YouTube API] Fetching ${targetResults} shorts for category ${categoryId} in ${regionCode}`);

    const fetchCount = Math.max(100, targetResults * 2);
    const allVideos = await this.getMostPopularVideosByCategoryAndRegion(regionCode, categoryId, fetchCount);

    const shorts = allVideos.filter(video => {
      const durationSeconds = this.parseDuration(video.contentDetails.duration);
      const thumbnail = video.snippet.thumbnails.medium || video.snippet.thumbnails.default;
      const isPortrait = thumbnail && thumbnail.height >= thumbnail.width;
      return durationSeconds <= 180 && durationSeconds > 0 && isPortrait;
    });

    console.log(`[YouTube API] Found ${shorts.length} shorts for category ${categoryId} in ${regionCode}`);
    return shorts.slice(0, targetResults);
  }
}

// Popular categories for the leaderboards - only working categories
export const POPULAR_CATEGORIES = [
  10, // Music - ✅ Working
  20, // Gaming - ✅ Working  
  17, // Sports - ✅ Working
  24, // Entertainment - ✅ Working
  25, // News & Politics - ✅ Working
  26, // Howto & Style - ✅ Working
  23, // Comedy - ✅ Working
  22, // People & Blogs - ✅ Working
  28, // Science & Technology - ✅ Working
  1,  // Film & Animation - ✅ Working
  2,  // Autos & Vehicles - ✅ Working
  15, // Pets & Animals - ✅ Working
  // Removed problematic categories:
  // 29, // Nonprofits & Activism - 403 Forbidden (API access restricted)
  // 27, // Education - 404 Not Found
  // 19, // Travel & Events - 404 Not Found  
  // 21, // Videoblogging - 400 Bad Request
  // 30, // Movies - 400 Bad Request
  // 31, // Anime/Animation - 400 Bad Request
  // 34, // Documentary - 400 Bad Request
  // 35, // Drama - 400 Bad Request
];