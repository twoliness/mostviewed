-- Phase 2: per-video rollup layer.
-- video_summary  : one row per video, denormalized state for fast per-video page reads.
-- video_rank_history : append-only rank-at-snapshot, one row per (video, chart, capture).
-- video_daily_stats  : daily fold of video_stats; lets us trim hot table without losing history.

CREATE TABLE IF NOT EXISTS video_summary (
  video_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  is_short INTEGER NOT NULL,
  category_id INTEGER,

  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  days_on_chart INTEGER NOT NULL DEFAULT 1,
  trending_appearances INTEGER NOT NULL DEFAULT 1,

  current_rank INTEGER,
  current_chart TEXT,
  current_views INTEGER,
  current_likes INTEGER,
  current_comments INTEGER,

  peak_rank INTEGER,
  peak_rank_date TEXT,
  peak_rank_chart TEXT,
  peak_velocity REAL,
  peak_velocity_at TEXT,

  engagement_day1 REAL,
  engagement_week1 REAL,
  engagement_now REAL,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vs_channel ON video_summary(channel_id);
CREATE INDEX IF NOT EXISTS idx_vs_peak ON video_summary(peak_rank);
CREATE INDEX IF NOT EXISTS idx_vs_last_seen ON video_summary(last_seen);

CREATE TABLE IF NOT EXISTS video_rank_history (
  video_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  chart TEXT NOT NULL,            -- "global:videos" | "global:shorts" | "category:24:videos" | "country:US:videos" | "country:US:category:24:videos"
  rank INTEGER NOT NULL,
  PRIMARY KEY (video_id, captured_at, chart)
);
CREATE INDEX IF NOT EXISTS idx_rh_chart_time ON video_rank_history(chart, captured_at);
CREATE INDEX IF NOT EXISTS idx_rh_video_time ON video_rank_history(video_id, captured_at);

CREATE TABLE IF NOT EXISTS video_daily_stats (
  video_id TEXT NOT NULL,
  day TEXT NOT NULL,              -- YYYY-MM-DD UTC
  views_start INTEGER,
  views_end INTEGER NOT NULL,
  views_delta INTEGER NOT NULL,
  likes_delta INTEGER,
  comments_delta INTEGER,
  peak_velocity REAL,
  engagement_rate REAL,
  snapshot_count INTEGER,
  PRIMARY KEY (video_id, day)
);
