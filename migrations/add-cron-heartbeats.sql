-- Per-cron wall-clock heartbeat. video_rank_history.captured_at is bucketed
-- to 30-min, which lags wall clock by up to 30 min — bad signal for watchdog
-- freshness checks. Each cron now upserts one row here on every tick.

CREATE TABLE IF NOT EXISTS cron_heartbeats (
  job TEXT PRIMARY KEY,             -- 'scheduled/videos', 'scheduled/shorts', ...
  last_run_at TEXT NOT NULL,        -- real ISO timestamp of most recent tick (success or error)
  last_ok_at TEXT,                  -- real ISO timestamp of most recent successful tick
  last_status TEXT NOT NULL,        -- 'ok' | 'error'
  last_error TEXT,
  cron_pattern TEXT
);
