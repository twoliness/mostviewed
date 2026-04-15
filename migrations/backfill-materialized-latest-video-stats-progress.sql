SELECT
  s.last_video_id,
  s.done,
  s.updated_at,
  (SELECT COUNT(*) FROM mv_latest_video_stats) AS materialized_rows,
  (SELECT COUNT(*) FROM videos) AS total_videos
FROM mv_latest_video_stats_backfill_state s
WHERE s.id = 1;
