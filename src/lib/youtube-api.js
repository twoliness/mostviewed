

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
   * Fetch most popular videos globally
   */
  async getMostPopularVideos(maxResults = 50) {
    console.log(`[YouTube API] Fetching ${maxResults} most popular videos globally`);
    
    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', 'US');
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('key', this.apiKey);

    console.log(`[YouTube API] Request URL: ${url.toString().replace(this.apiKey, '***API_KEY***')}`);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[YouTube API] Error fetching global videos: ${response.status} ${response.statusText}`);
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[YouTube API] Successfully fetched ${data.items.length} global videos`);
    return data.items;
  }

  /**
   * Fetch most popular videos for a specific category
   */
  async getMostPopularVideosByCategory(categoryId, maxResults = 50) {
    console.log(`[YouTube API] Fetching ${maxResults} most popular videos for category ${categoryId}`);
    
    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', 'US');
    url.searchParams.set('videoCategoryId', categoryId.toString());
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('key', this.apiKey);

    console.log(`[YouTube API] Request URL: ${url.toString().replace(this.apiKey, '***API_KEY***')}`);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[YouTube API] Error fetching category ${categoryId} videos: ${response.status} ${response.statusText}`);
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[YouTube API] Successfully fetched ${data.items.length} videos for category ${categoryId}`);
    return data.items;
  }

  /**
   * Get YouTube Shorts (videos under 60 seconds) from most popular
   */
  async getMostPopularShorts(maxResults = 50) {
    console.log(`[YouTube API] Fetching YouTube Shorts, target: ${maxResults} shorts`);
    
    // Fetch more videos to filter for shorts
    const fetchCount = maxResults * 2;
    console.log(`[YouTube API] Fetching ${fetchCount} videos to filter for shorts`);
    const allVideos = await this.getMostPopularVideos(fetchCount);
    
    // Filter for videos under 60 seconds
    const shorts = allVideos.filter(video => {
      const durationSeconds = this.parseDuration(video.contentDetails.duration);
      return durationSeconds <= 60 && durationSeconds > 0;
    });

    console.log(`[YouTube API] Found ${shorts.length} shorts from ${allVideos.length} videos, returning ${Math.min(shorts.length, maxResults)}`);
    return shorts.slice(0, maxResults);
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
    
    return {
      video: {
        id: video.id,
        title: video.snippet.title,
        channel_id: video.snippet.channelId,
        channel_title: video.snippet.channelTitle,
        category_id: parseInt(video.snippet.categoryId),
        published_at: video.snippet.publishedAt,
        thumb_url: video.snippet.thumbnails.medium.url,
        duration: video.contentDetails.duration,
        is_short: durationSeconds <= 60 && durationSeconds > 0,
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
}

// Popular categories for the leaderboards (top 20 as mentioned in PRD)
export const POPULAR_CATEGORIES = [
  10, // Music
  20, // Gaming  
  17, // Sports
  24, // Entertainment
  25, // News & Politics
  26, // Howto & Style
  23, // Comedy
  22, // People & Blogs
  27, // Education
  28, // Science & Technology
  1,  // Film & Animation
  2,  // Autos & Vehicles
  15, // Pets & Animals
  19, // Travel & Events
  21, // Videoblogging
  29, // Nonprofits & Activism
  30, // Movies
  31, // Anime/Animation
  34, // Documentary
  35, // Drama
];