-- Progress log for long-running admin backfill jobs (resumable cursors).
-- Each batch call appends one row so progress is queryable live.

CREATE TABLE IF NOT EXISTS backfill_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,                  -- 'reconstruct-ranks-bucketed' etc.
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  cursor_in TEXT,
  cursor_out TEXT,
  range_from TEXT,
  range_to TEXT,
  scanned INTEGER NOT NULL DEFAULT 0,
  validated INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  reject_reasons TEXT,                -- JSON
  done INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_backfill_progress_job_id ON backfill_progress(job, id DESC);
