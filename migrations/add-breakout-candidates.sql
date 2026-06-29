-- Breakout candidates: videos detected as climbing unusually fast for their age.
-- Status flow: candidate → confirmed → graduated | killed
--   candidate  : velocity >= 1.5× p80 baseline for age cohort
--   confirmed  : velocity >= 2.5× baseline (newsletter eligible)
--   graduated  : entered global top-50 (success metric for back-testing)
--   killed     : dropped off chart before confirming (used for false-positive tuning)

CREATE TABLE IF NOT EXISTS breakout_candidates (
  video_id               TEXT PRIMARY KEY,
  detected_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_chart           TEXT NOT NULL,         -- "global:videos" | "category:20:videos" | etc.
  source_rank            INTEGER,               -- rank when first detected
  age_hours_at_detection REAL NOT NULL,         -- hours since first_seen at detection time
  velocity_at_detection  REAL NOT NULL,         -- peak_velocity at detection (views/hour)
  velocity_score         REAL NOT NULL,         -- velocity_at_detection / baseline_p80
  current_velocity       REAL,                  -- most recent peak_velocity from video_summary
  peak_velocity          REAL,                  -- highest velocity seen since detection
  score                  REAL,                  -- current best score
  status                 TEXT NOT NULL DEFAULT 'candidate',
  promoted_at            TEXT,                  -- when status last changed
  updated_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bc_status_detected ON breakout_candidates(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_score ON breakout_candidates(score DESC);
