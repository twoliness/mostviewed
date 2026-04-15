-- Materialized latest-stats table + triggers for low-CPU leaderboard reads
-- Schema-only migration (safe for remote D1 execution).
-- Backfill is handled separately in batched steps to avoid SQLITE_NOMEM.

CREATE TABLE IF NOT EXISTS mv_latest_video_stats (
  video_id TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,
  view_count INTEGER NOT NULL,
  like_count INTEGER,
  comment_count INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos (id)
);

CREATE INDEX IF NOT EXISTS idx_mv_latest_video_stats_captured_at
  ON mv_latest_video_stats(captured_at);

CREATE INDEX IF NOT EXISTS idx_mv_latest_video_stats_view_count
  ON mv_latest_video_stats(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_mv_latest_video_stats_like_count
  ON mv_latest_video_stats(like_count DESC);

-- Keep materialized table up to date when new stats arrive.
DROP TRIGGER IF EXISTS trg_mv_latest_video_stats_upsert;
CREATE TRIGGER trg_mv_latest_video_stats_upsert
AFTER INSERT ON video_stats
BEGIN
  INSERT INTO mv_latest_video_stats (
    video_id,
    captured_at,
    view_count,
    like_count,
    comment_count,
    updated_at
  ) VALUES (
    NEW.video_id,
    NEW.captured_at,
    NEW.view_count,
    NEW.like_count,
    NEW.comment_count,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(video_id) DO UPDATE SET
    captured_at = excluded.captured_at,
    view_count = excluded.view_count,
    like_count = excluded.like_count,
    comment_count = excluded.comment_count,
    updated_at = CURRENT_TIMESTAMP
  WHERE excluded.captured_at >= mv_latest_video_stats.captured_at;
END;

-- Clean up materialized rows if a video record is removed.
DROP TRIGGER IF EXISTS trg_mv_latest_video_stats_delete_video;
CREATE TRIGGER trg_mv_latest_video_stats_delete_video
AFTER DELETE ON videos
BEGIN
  DELETE FROM mv_latest_video_stats WHERE video_id = OLD.id;
END;

-- Recompute latest snapshot if stats are deleted (e.g., cleanup jobs).
DROP TRIGGER IF EXISTS trg_mv_latest_video_stats_delete_stat;
CREATE TRIGGER trg_mv_latest_video_stats_delete_stat
AFTER DELETE ON video_stats
BEGIN
  INSERT INTO mv_latest_video_stats (
    video_id,
    captured_at,
    view_count,
    like_count,
    comment_count,
    updated_at
  )
  SELECT
    vs.video_id,
    vs.captured_at,
    vs.view_count,
    vs.like_count,
    vs.comment_count,
    CURRENT_TIMESTAMP
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
