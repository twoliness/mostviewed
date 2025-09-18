-- D1 Database Schema for YouTube Trending Videos

-- Videos table to store video metadata
CREATE TABLE videos (
    id TEXT PRIMARY KEY, -- YouTube video ID
    title TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    published_at TEXT NOT NULL, -- ISO 8601 timestamp
    thumb_url TEXT NOT NULL,
    duration TEXT, -- ISO 8601 duration (PT4M13S)
    is_short BOOLEAN DEFAULT FALSE, -- Derived from duration < 60s
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

-- Indexes for performance
CREATE INDEX idx_videos_category_id ON videos(category_id);
CREATE INDEX idx_videos_is_short ON videos(is_short);
CREATE INDEX idx_video_stats_video_id ON video_stats(video_id);
CREATE INDEX idx_video_stats_captured_at ON video_stats(captured_at);
CREATE INDEX idx_categories_slug ON categories(slug);

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