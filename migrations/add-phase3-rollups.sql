-- Phase 3: creator + country summaries.
-- These are daily rebuilds (cheap aggregations over video_summary), not per-cron-tick.
-- Reads: powered by 1-row lookups for creator pages, 2-row + small list for country pages.

CREATE TABLE IF NOT EXISTS creator_summary (
  channel_id TEXT PRIMARY KEY,
  videos_tracked INTEGER NOT NULL,            -- distinct videos seen for this creator
  trending_appearances INTEGER NOT NULL,      -- SUM(trending_appearances) across their videos
  best_peak_rank INTEGER,                     -- MIN(peak_rank) over their videos
  best_peak_video_id TEXT,                    -- the video that achieved it
  best_peak_rank_count INTEGER,               -- how many of their videos reached that rank
  avg_days_on_chart REAL,                     -- AVG(days_on_chart) over their videos
  currently_trending_count INTEGER NOT NULL,  -- videos with last_seen in the last 24h
  total_views INTEGER,                        -- SUM(current_views) — running cumulative
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS country_daily_summary (
  country_code TEXT NOT NULL,
  day TEXT NOT NULL,                          -- YYYY-MM-DD UTC
  videos_tracked INTEGER NOT NULL,            -- distinct videos seen in country charts that day
  total_views INTEGER,                        -- SUM of current_views for those videos
  top_video_id TEXT,
  top_creator_id TEXT,
  top_creator_video_count INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (country_code, day)
);

CREATE TABLE IF NOT EXISTS country_category_daily (
  country_code TEXT NOT NULL,
  day TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  total_views INTEGER NOT NULL,
  PRIMARY KEY (country_code, day, category_id)
);
