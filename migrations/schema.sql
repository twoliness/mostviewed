-- D1 Database Schema for YouTube Trending Videos

-- Videos table to store video metadata
CREATE TABLE videos (
    id TEXT PRIMARY KEY, -- YouTube video ID
    title TEXT NOT NULL,
    description TEXT, -- Video description
    channel_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    published_at TEXT NOT NULL, -- ISO 8601 timestamp
    thumb_url TEXT NOT NULL,
    duration TEXT, -- ISO 8601 duration (PT4M13S)
    is_short BOOLEAN DEFAULT FALSE, -- Derived from duration <= 180s AND portrait orientation
    width INTEGER, -- Thumbnail width (proxy for video orientation)
    height INTEGER, -- Thumbnail height (proxy for video orientation)
    country_code TEXT DEFAULT 'US', -- ISO 3166-1 alpha-2 country code
    tags TEXT, -- JSON array of creator-supplied keyword tags from snippet.tags
    topic_categories TEXT, -- JSON array of Wikipedia URLs from topicDetails.topicCategories
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Video stats table to track metrics over time
CREATE TABLE video_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    captured_at TEXT DEFAULT CURRENT_TIMESTAMP, -- ISO 8601 timestamp
    view_count INTEGER NOT NULL,
    like_count INTEGER,
    comment_count INTEGER,
    FOREIGN KEY (video_id) REFERENCES videos (id)
);

-- YouTube categories reference table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE -- URL-friendly name
);

-- Creators table to store channel profile data
CREATE TABLE creators (
    channel_id TEXT PRIMARY KEY, -- YouTube channel ID
    channel_title TEXT NOT NULL,
    description TEXT, -- Channel description
    avatar_url TEXT, -- Channel profile picture URL
    banner_url TEXT, -- Channel banner image URL
    subscriber_count INTEGER, -- Subscriber count
    video_count INTEGER, -- Total number of videos
    view_count INTEGER, -- Total channel views
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_videos_category_id ON videos(category_id);
CREATE INDEX idx_videos_is_short ON videos(is_short);
CREATE INDEX idx_videos_country_code ON videos(country_code);
CREATE INDEX idx_videos_country_category ON videos(country_code, category_id);
CREATE INDEX idx_videos_country_short ON videos(country_code, is_short);
CREATE INDEX idx_video_stats_video_id ON video_stats(video_id);
CREATE INDEX idx_video_stats_captured_at ON video_stats(captured_at);
CREATE INDEX idx_video_stats_video_captured ON video_stats(video_id, captured_at DESC);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_creators_channel_id ON creators(channel_id);
CREATE INDEX idx_creators_subscriber_count ON creators(subscriber_count);
CREATE INDEX idx_creators_view_count ON creators(view_count);

-- Materialized latest stats table for low-CPU leaderboard reads
CREATE TABLE IF NOT EXISTS mv_latest_video_stats (
    video_id TEXT PRIMARY KEY,
    captured_at TEXT NOT NULL,
    view_count INTEGER NOT NULL,
    like_count INTEGER,
    comment_count INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id)
);

CREATE INDEX idx_mv_latest_video_stats_captured_at ON mv_latest_video_stats(captured_at);
CREATE INDEX idx_mv_latest_video_stats_view_count ON mv_latest_video_stats(view_count DESC);
CREATE INDEX idx_mv_latest_video_stats_like_count ON mv_latest_video_stats(like_count DESC);

CREATE TRIGGER IF NOT EXISTS trg_mv_latest_video_stats_upsert
AFTER INSERT ON video_stats
BEGIN
    INSERT INTO mv_latest_video_stats (
        video_id, captured_at, view_count, like_count, comment_count, updated_at
    ) VALUES (
        NEW.video_id, NEW.captured_at, NEW.view_count, NEW.like_count, NEW.comment_count, CURRENT_TIMESTAMP
    )
    ON CONFLICT(video_id) DO UPDATE SET
        captured_at = excluded.captured_at,
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        comment_count = excluded.comment_count,
        updated_at = CURRENT_TIMESTAMP
    WHERE excluded.captured_at >= mv_latest_video_stats.captured_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_mv_latest_video_stats_delete_video
AFTER DELETE ON videos
BEGIN
    DELETE FROM mv_latest_video_stats WHERE video_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_mv_latest_video_stats_delete_stat
AFTER DELETE ON video_stats
BEGIN
    INSERT INTO mv_latest_video_stats (
        video_id, captured_at, view_count, like_count, comment_count, updated_at
    )
    SELECT
        vs.video_id, vs.captured_at, vs.view_count, vs.like_count, vs.comment_count, CURRENT_TIMESTAMP
    FROM video_stats vs
    WHERE vs.video_id = OLD.video_id
    ORDER BY vs.captured_at DESC, vs.id DESC
    LIMIT 1
    ON CONFLICT(video_id) DO UPDATE SET
        captured_at = excluded.captured_at,
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        comment_count = excluded.comment_count,
        updated_at = CURRENT_TIMESTAMP;

    DELETE FROM mv_latest_video_stats
    WHERE video_id = OLD.video_id
      AND NOT EXISTS (
          SELECT 1 FROM video_stats WHERE video_id = OLD.video_id
      );
END;

-- Newsletter email capture
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- Insert YouTube categories
INSERT INTO categories (id, name, slug) VALUES
(1, 'Film & Animation', 'film-animation'),
(2, 'Autos & Vehicles', 'autos-vehicles'),
(10, 'Music', 'music'),
(15, 'Pets & Animals', 'pets-animals'),
(17, 'Sports', 'sports'),
(18, 'Short Movies', 'short-movies'),
(19, 'Travel & Events', 'travel-events'),
(20, 'Gaming', 'gaming'),
(21, 'Videoblogging', 'videoblogging'),
(22, 'People & Blogs', 'people-blogs'),
(23, 'Comedy', 'comedy'),
(24, 'Entertainment', 'entertainment'),
(25, 'News & Politics', 'news-politics'),
(26, 'Howto & Style', 'howto-style'),
(27, 'Education', 'education'),
(28, 'Science & Technology', 'science-technology'),
(29, 'Nonprofits & Activism', 'nonprofits-activism'),
(30, 'Movies', 'movies'),
(31, 'Anime/Animation', 'anime-animation'),
(32, 'Action/Adventure', 'action-adventure'),
(33, 'Classics', 'classics'),
(34, 'Documentary', 'documentary'),
(35, 'Drama', 'drama'),
(36, 'Family', 'family'),
(37, 'Foreign', 'foreign'),
(38, 'Horror', 'horror'),
(39, 'Sci-Fi/Fantasy', 'sci-fi-fantasy'),
(40, 'Thriller', 'thriller'),
(41, 'Shorts', 'shorts'),
(42, 'Shows', 'shows'),
(43, 'Trailers', 'trailers');
