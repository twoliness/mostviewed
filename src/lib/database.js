/// <reference types="@cloudflare/workers-types" />




export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Insert or update a video record
   */
  async upsertVideo(video) {
    console.log(`[Database] Upserting video: ${video.id} - ${video.title.substring(0, 50)}...`);

    const stmt = this.db.prepare(`
      INSERT INTO videos (id, title, description, channel_id, channel_title, category_id, published_at, thumb_url, duration, is_short, width, height, country_code, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        channel_title = excluded.channel_title,
        thumb_url = excluded.thumb_url,
        width = excluded.width,
        height = excluded.height,
        country_code = excluded.country_code,
        updated_at = CURRENT_TIMESTAMP
    `);

    try {
      await stmt.bind(
        video.id,
        video.title,
        video.description,
        video.channel_id,
        video.channel_title,
        video.category_id,
        video.published_at,
        video.thumb_url,
        video.duration,
        video.is_short ? 1 : 0,
        video.width,
        video.height,
        video.country_code || 'US'
      ).run();

      console.log(`[Database] Successfully upserted video: ${video.id}`);
    } catch (error) {
      console.error(`[Database] Error upserting video ${video.id}:`, error);
      throw error;
    }
  }

  /**
   * Insert video statistics
   */
  async insertVideoStats(stats) {
    console.log(`[Database] Inserting stats for video: ${stats.video_id}, views: ${stats.view_count}`);
    
    const stmt = this.db.prepare(`
      INSERT INTO video_stats (video_id, captured_at, view_count, like_count, comment_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      await stmt.bind(
        stats.video_id,
        stats.captured_at,
        stats.view_count,
        stats.like_count,
        stats.comment_count
      ).run();
      
      console.log(`[Database] Successfully inserted stats for video: ${stats.video_id}`);
    } catch (error) {
      console.error(`[Database] Error inserting stats for video ${stats.video_id}:`, error);
      throw error;
    }
  }

  /**
   * Get global top 10 leaderboard with latest stats (videos only, no shorts)
   */
  async getGlobalLeaderboard(limit= 10) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.is_short = 0
      AND vs.captured_at >= datetime('now', '-2 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results;
  }

  /**
   * Get category-specific leaderboard
   */
  async getCategoryLeaderboard(categoryId, limit= 10) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.category_id = ? AND v.is_short = 0
      AND vs.captured_at >= datetime('now', '-6 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(categoryId, limit).all();
    return result.results;
  }

  /**
   * Get category-specific leaderboard (includes both videos and shorts)
   */
  async getCategoryLeaderboardCombined(categoryId, limit= 50) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.category_id = ?
      AND vs.captured_at >= datetime('now', '-6 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(categoryId, limit).all();
    return result.results;
  }

  /**
   * Get category-specific shorts leaderboard
   */
  async getCategoryShortsLeaderboard(categoryId, limit= 10) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.category_id = ? AND v.is_short = 1
      AND vs.captured_at >= datetime('now', '-6 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(categoryId, limit).all();
    return result.results;
  }

  /**
   * Get top shorts from all categories combined
   */
  async getGlobalShortsLeaderboard(limit= 10) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.is_short = 1
      AND vs.captured_at >= datetime('now', '-2 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results;
  }

  /**
   * Get shorts leaderboard
   */
  async getShortsLeaderboard(limit= 10) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.is_short = 1
      AND vs.captured_at >= datetime('now', '-2 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results;
  }

  /**
   * Get all categories
   */
  async getCategories() {
    const stmt = this.db.prepare(`
      SELECT id, name, slug FROM categories ORDER BY name
    `);

    const result = await stmt.all();
    return result.results;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug) {
    const stmt = this.db.prepare(`
      SELECT id, name, slug FROM categories WHERE slug = ?
    `);

    const result = await stmt.bind(slug).first();
    return result;
  }

  /**
   * Insert or update a creator record
   */
  async upsertCreator(creator) {
    console.log(`[Database] Upserting creator: ${creator.channel_id} - ${creator.channel_title}`);
    
    const stmt = this.db.prepare(`
      INSERT INTO creators (channel_id, channel_title, description, avatar_url, banner_url, subscriber_count, video_count, view_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_title = excluded.channel_title,
        description = excluded.description,
        avatar_url = excluded.avatar_url,
        banner_url = excluded.banner_url,
        subscriber_count = excluded.subscriber_count,
        video_count = excluded.video_count,
        view_count = excluded.view_count,
        updated_at = CURRENT_TIMESTAMP
    `);

    try {
      await stmt.bind(
        creator.channel_id,
        creator.channel_title,
        creator.description,
        creator.avatar_url,
        creator.banner_url,
        creator.subscriber_count,
        creator.video_count,
        creator.view_count
      ).run();
      
      console.log(`[Database] Successfully upserted creator: ${creator.channel_id}`);
    } catch (error) {
      console.error(`[Database] Error upserting creator ${creator.channel_id}:`, error);
      throw error;
    }
  }

  /**
   * Get top creators by total views across all their videos with creator profile data
   */
  async getTopCreators(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT 
        v.channel_id,
        v.channel_title,
        COUNT(DISTINCT v.id) as video_count,
        SUM(vs.view_count) as total_views,
        AVG(vs.view_count) as avg_views,
        MAX(vs.captured_at) as latest_capture,
        c.description,
        c.avatar_url,
        c.subscriber_count
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      LEFT JOIN creators c ON v.channel_id = c.channel_id
      WHERE v.channel_id IS NOT NULL AND v.channel_title IS NOT NULL
      GROUP BY v.channel_id, v.channel_title
      ORDER BY total_views DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results;
  }

  /**
   * Get count of unique creators in database
   */
  async getCreatorsCount() {
    const stmt = this.db.prepare(`
      SELECT COUNT(DISTINCT v.channel_id) as creator_count
      FROM videos v
      WHERE v.channel_id IS NOT NULL AND v.channel_title IS NOT NULL
    `);

    const result = await stmt.first();
    return result?.creator_count || 0;
  }

  /**
   * Batch insert/update creators
   */
  async batchUpsertCreators(creators) {
    console.log(`[Database] Starting batch upsert of ${creators.length} creators`);

    // Skip if no data to insert
    if (creators.length === 0) {
      console.log(`[Database] No creators to upsert, skipping batch operation`);
      return;
    }

    try {
      // Use a transaction for better performance and consistency
      const transaction = this.db.batch(
        creators.map(creator => 
          this.db.prepare(`
            INSERT INTO creators (channel_id, channel_title, description, avatar_url, banner_url, subscriber_count, video_count, view_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(channel_id) DO UPDATE SET
              channel_title = excluded.channel_title,
              description = excluded.description,
              avatar_url = excluded.avatar_url,
              banner_url = excluded.banner_url,
              subscriber_count = excluded.subscriber_count,
              video_count = excluded.video_count,
              view_count = excluded.view_count,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            creator.channel_id,
            creator.channel_title,
            creator.description,
            creator.avatar_url,
            creator.banner_url,
            creator.subscriber_count,
            creator.video_count,
            creator.view_count
          )
        )
      );

      await transaction;
      console.log(`[Database] Successfully batch upserted ${creators.length} creators`);
      
      // Log some sample data for verification
      if (creators.length > 0) {
        console.log(`[Database] Sample creator: ${creators[0].channel_id} - ${creators[0].channel_title} (${creators[0].subscriber_count} subscribers)`);
      }
    } catch (error) {
      console.error(`[Database] Error in batch upsert of ${creators.length} creators:`, error);
      throw error;
    }
  }

  /**
   * Batch insert/update videos and their stats
   */
  async batchUpsertVideosWithStats(data) {
    console.log(`[Database] Starting batch upsert of ${data.length} videos with stats`);

    // Skip if no data to insert
    if (data.length === 0) {
      console.log(`[Database] No videos to upsert, skipping batch operation`);
      return;
    }

    const capturedAt = new Date().toISOString();

    try {
      // Use a transaction for better performance and consistency
      const transaction = this.db.batch([
        // Upsert videos
        ...data.map(({ video }) =>
          this.db.prepare(`
            INSERT INTO videos (id, title, description, channel_id, channel_title, category_id, published_at, thumb_url, duration, is_short, width, height, country_code, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              channel_title = excluded.channel_title,
              thumb_url = excluded.thumb_url,
              width = excluded.width,
              height = excluded.height,
              country_code = excluded.country_code,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            video.id,
            video.title,
            video.description,
            video.channel_id,
            video.channel_title,
            video.category_id,
            video.published_at,
            video.thumb_url,
            video.duration,
            video.is_short ? 1 : 0,
            video.width,
            video.height,
            video.country_code || 'US'
          )
        ),
        // Insert stats
        ...data.map(({ stats }) =>
          this.db.prepare(`
            INSERT INTO video_stats (video_id, captured_at, view_count, like_count, comment_count)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            stats.video_id,
            capturedAt,
            stats.view_count,
            stats.like_count,
            stats.comment_count
          )
        )
      ]);

      await transaction;
      console.log(`[Database] Successfully batch upserted ${data.length} videos with stats`);
      
      // Log some sample data for verification
      if (data.length > 0) {
        console.log(`[Database] Sample video: ${data[0].video.id} - ${data[0].video.title.substring(0, 50)}... (${data[0].stats.view_count} views)`);
      }
    } catch (error) {
      console.error(`[Database] Error in batch upsert of ${data.length} videos:`, error);
      throw error;
    }
  }

  /**
   * Get existing video IDs for a specific category
   */
  async getExistingVideosForCategory(categoryId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT v.id 
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      WHERE v.category_id = ? AND vs.captured_at < datetime('now', '-30 minutes')
      ORDER BY vs.view_count DESC, vs.captured_at DESC
      LIMIT ?
    `);

    const result = await stmt.bind(categoryId, limit).all();
    return result.results.map(row => row.id);
  }

  /**
   * Get existing video IDs for stats refresh
   */
  async getExistingVideoIds(limit = 500) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT v.id 
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      ORDER BY vs.captured_at DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results.map(row => row.id);
  }

  /**
   * Get top performing videos that need stats updates
   */
  async getTopVideosForRefresh(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT v.id, vs.view_count, vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE vs.captured_at < datetime('now', '-30 minutes')  -- Only refresh if last update was over 30 minutes ago
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results.map(row => row.id);
  }

  /**
   * Batch insert refreshed video statistics
   */
  async batchInsertRefreshedStats(statsData) {
    console.log(`[Database] Starting batch insert of ${statsData.length} refreshed stats`);

    // Skip if no data to insert
    if (statsData.length === 0) {
      console.log(`[Database] No stats to insert, skipping batch operation`);
      return;
    }

    try {
      const capturedAt = new Date().toISOString();
      
      const transaction = this.db.batch(
        statsData.map(stats => 
          this.db.prepare(`
            INSERT INTO video_stats (video_id, captured_at, view_count, like_count, comment_count)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            stats.video_id,
            capturedAt,
            stats.view_count,
            stats.like_count,
            stats.comment_count
          )
        )
      );

      await transaction;
      console.log(`[Database] Successfully batch inserted ${statsData.length} refreshed stats`);
      
      if (statsData.length > 0) {
        console.log(`[Database] Sample stat: ${statsData[0].video_id} - ${statsData[0].view_count} views`);
      }
    } catch (error) {
      console.error(`[Database] Error in batch insert of ${statsData.length} refreshed stats:`, error);
      throw error;
    }
  }

  /**
   * Get videos for a specific creator/channel
   */
  async getCreatorVideos(channelId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        vs.captured_at,
        v.published_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.channel_id = ?
      AND vs.captured_at >= datetime('now', '-6 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(channelId, limit).all();
    return result.results;
  }

  /**
   * Get top creators with their videos
   */
  async getTopCreatorsWithVideos(limit = 10, videosPerCreator = 5) {
    // First get the top creators
    const creators = await this.getTopCreators(limit);
    
    // Then get videos for each creator
    const creatorsWithVideos = await Promise.all(
      creators.map(async (creator) => {
        const videos = await this.getCreatorVideos(creator.channel_id, videosPerCreator);
        return {
          ...creator,
          videos: videos
        };
      })
    );
    
    return creatorsWithVideos;
  }

  /**
   * Get trending videos for a specific country
   */
  async getCountryTrendingVideos(countryCode, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        v.country_code,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.country_code = ? AND v.is_short = 0
      AND vs.captured_at >= datetime('now', '-2 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(countryCode, limit).all();
    return result.results;
  }

  /**
   * Get trending shorts for a specific country
   */
  async getCountryTrendingShorts(countryCode, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        v.country_code,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.country_code = ? AND v.is_short = 1
      AND vs.captured_at >= datetime('now', '-2 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(countryCode, limit).all();
    return result.results;
  }

  /**
   * Get trending videos for a specific country and category
   */
  async getCountryCategoryVideos(countryCode, categoryId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        v.id,
        v.title,
        v.description,
        v.channel_title,
        v.thumb_url,
        v.duration,
        vs.view_count,
        v.category_id,
        v.is_short,
        v.country_code,
        vs.captured_at
      FROM videos v
      INNER JOIN video_stats vs ON v.id = vs.video_id
      INNER JOIN (
        SELECT video_id, MAX(captured_at) as latest_captured_at
        FROM video_stats
        GROUP BY video_id
      ) latest ON vs.video_id = latest.video_id AND vs.captured_at = latest.latest_captured_at
      WHERE v.country_code = ? AND v.category_id = ? AND v.is_short = 0
      AND vs.captured_at >= datetime('now', '-2 hours')
      ORDER BY vs.view_count DESC
      LIMIT ?
    `);

    const result = await stmt.bind(countryCode, categoryId, limit).all();
    return result.results;
  }
}