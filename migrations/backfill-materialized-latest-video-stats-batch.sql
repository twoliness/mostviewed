-- Batched backfill for mv_latest_video_stats.
-- Run this file repeatedly (same command) until done = 1.
-- Each run processes up to 100 videos by ID order.

CREATE TABLE IF NOT EXISTS mv_latest_video_stats_backfill_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_video_id TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO mv_latest_video_stats_backfill_state (
  id,
  last_video_id,
  done,
  updated_at
) VALUES (1, '', 0, CURRENT_TIMESTAMP);

WITH cursor_state AS (
  SELECT last_video_id
  FROM mv_latest_video_stats_backfill_state
  WHERE id = 1
),
batch_videos AS (
  SELECT v.id AS video_id
  FROM videos v
  WHERE v.id > (SELECT last_video_id FROM cursor_state)
  ORDER BY v.id
  LIMIT 100
),
latest_per_video AS (
  SELECT
    vs.video_id,
    MAX(vs.captured_at) AS latest_captured_at
  FROM video_stats vs
  INNER JOIN batch_videos bv
    ON bv.video_id = vs.video_id
  GROUP BY vs.video_id
),
latest_rows AS (
  SELECT
    vs.video_id,
    vs.captured_at,
    vs.view_count,
    vs.like_count,
    vs.comment_count
  FROM video_stats vs
  INNER JOIN latest_per_video lpv
    ON lpv.video_id = vs.video_id
   AND lpv.latest_captured_at = vs.captured_at
),
dedup_rows AS (
  SELECT
    video_id,
    MAX(captured_at) AS captured_at,
    MAX(view_count) AS view_count,
    MAX(like_count) AS like_count,
    MAX(comment_count) AS comment_count
  FROM latest_rows
  GROUP BY video_id
)
INSERT INTO mv_latest_video_stats (
  video_id,
  captured_at,
  view_count,
  like_count,
  comment_count,
  updated_at
)
SELECT
  d.video_id,
  d.captured_at,
  d.view_count,
  d.like_count,
  d.comment_count,
  CURRENT_TIMESTAMP
FROM dedup_rows d
WHERE 1 = 1
ON CONFLICT(video_id) DO UPDATE SET
  captured_at = excluded.captured_at,
  view_count = excluded.view_count,
  like_count = excluded.like_count,
  comment_count = excluded.comment_count,
  updated_at = CURRENT_TIMESTAMP
WHERE excluded.captured_at >= mv_latest_video_stats.captured_at;

UPDATE mv_latest_video_stats_backfill_state
SET
  last_video_id = COALESCE(
    (
      SELECT v.id
      FROM videos v
      WHERE v.id > mv_latest_video_stats_backfill_state.last_video_id
      ORDER BY v.id
      LIMIT 1 OFFSET 99
    ),
    (
      SELECT COALESCE(MAX(v2.id), mv_latest_video_stats_backfill_state.last_video_id)
      FROM videos v2
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

UPDATE mv_latest_video_stats_backfill_state
SET
  done = CASE
    WHEN EXISTS (
      SELECT 1
      FROM videos v
      WHERE v.id > mv_latest_video_stats_backfill_state.last_video_id
    ) THEN 0
    ELSE 1
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
