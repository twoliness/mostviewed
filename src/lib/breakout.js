// Layer 1 breakout detection — zero YouTube API quota cost.
// Identifies videos climbing unusually fast for their age cohort by comparing
// their velocity against a p80 baseline derived from recent historical data.

const AGE_WINDOW_HOURS = 48;          // only watch videos first seen within this window
const ACTIVE_WINDOW_MINUTES = 90;     // must appear in a chart in the last N minutes
const BASELINE_MIN_DAYS = 2;          // exclude very-new videos from baseline (biased high)
const BASELINE_MAX_DAYS = 14;         // don't use stale baseline data
const BASELINE_MIN_ROWS = 20;         // skip detection if not enough historical data yet
const BASELINE_PERCENTILE = 0.80;     // p80 = "better than 80% of videos at this age"
const SCORE_CANDIDATE = 1.5;          // minimum multiplier vs baseline to qualify
const SCORE_CONFIRMED = 2.5;          // multiplier to upgrade candidate → confirmed
const GRADUATED_GLOBAL_RANK = 50;     // entering global top-N counts as graduated

// Pull velocity values from mature videos and return the p80 value.
// Using a single global baseline (not per age-bracket) because D1 doesn't have
// PERCENTILE() and per-bracket slices can be thin in early data.
async function computeBaselineP80(db) {
  const result = await db.prepare(`
    SELECT peak_velocity
    FROM video_summary
    WHERE peak_velocity > 0
      AND first_seen <= datetime('now', '-${BASELINE_MIN_DAYS} days')
      AND first_seen >= datetime('now', '-${BASELINE_MAX_DAYS} days')
    ORDER BY peak_velocity
  `).all();

  const values = (result.results || []).map(r => r.peak_velocity);
  if (values.length < BASELINE_MIN_ROWS) return null;

  const idx = Math.floor(values.length * BASELINE_PERCENTILE);
  return values[Math.min(idx, values.length - 1)];
}

export class BreakoutService {
  constructor(db) {
    this.db = db;
  }

  // Run detection: find young fast-rising videos, upsert into breakout_candidates.
  // Also kills stale candidates that dropped off the chart.
  // Returns a stats summary suitable for logging.
  async runDetection() {
    const baseline = await computeBaselineP80(this.db);
    if (baseline == null) {
      return { skipped: true, reason: 'insufficient_baseline_data' };
    }

    // Young videos still on chart with meaningful velocity
    const candidateRows = await this.db.prepare(`
      SELECT
        vs.video_id,
        vs.first_seen,
        vs.current_rank,
        vs.current_chart,
        vs.peak_velocity,
        vs.peak_rank,
        (julianday('now') - julianday(vs.first_seen)) * 24 AS age_hours
      FROM video_summary vs
      WHERE vs.peak_velocity IS NOT NULL
        AND vs.peak_velocity > 0
        AND vs.first_seen >= datetime('now', '-${AGE_WINDOW_HOURS} hours')
        AND vs.last_seen >= datetime('now', '-${ACTIVE_WINDOW_MINUTES} minutes')
        AND vs.current_rank IS NOT NULL
      ORDER BY vs.peak_velocity DESC
      LIMIT 200
    `).all();

    const allYoung = candidateRows.results || [];
    const qualifying = allYoung
      .filter(r => r.peak_velocity / baseline >= SCORE_CANDIDATE)
      .slice(0, 50);

    let upserted = 0;
    let killed = 0;

    // SQLite UPSERT (ON CONFLICT DO UPDATE) — one statement per row, no batch,
    // no prior SELECT needed. Status advances monotonically via CASE expression.
    if (qualifying.length > 0) {
      const now = new Date().toISOString();

      for (const r of qualifying) {
        const score = r.peak_velocity / baseline;

        let targetStatus = 'candidate';
        if (r.current_chart === 'global:videos' && r.current_rank <= GRADUATED_GLOBAL_RANK) {
          targetStatus = 'graduated';
        } else if (score >= SCORE_CONFIRMED) {
          targetStatus = 'confirmed';
        }

        await this.db.prepare(`
          INSERT INTO breakout_candidates
            (video_id, detected_at, source_chart, source_rank, age_hours_at_detection,
             velocity_at_detection, velocity_score, current_velocity, peak_velocity, score,
             status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(video_id) DO UPDATE SET
            current_velocity = excluded.velocity_at_detection,
            peak_velocity    = max(peak_velocity, excluded.peak_velocity),
            score            = excluded.score,
            status           = CASE
              WHEN status = 'killed'                                    THEN status
              WHEN excluded.status = 'graduated'                        THEN 'graduated'
              WHEN excluded.status = 'confirmed' AND status = 'candidate' THEN 'confirmed'
              ELSE status
            END,
            promoted_at      = CASE
              WHEN status != excluded.status AND status != 'killed'     THEN excluded.updated_at
              ELSE promoted_at
            END,
            updated_at       = excluded.updated_at
        `).bind(
          r.video_id, now, r.current_chart ?? '', r.current_rank, r.age_hours,
          r.peak_velocity, score, r.peak_velocity, r.peak_velocity, score,
          targetStatus, now
        ).run();

        upserted++;
      }
    }

    // Kill candidates that dropped off chart — NOT EXISTS avoids the subquery
    // variable-expansion issue that NOT IN can trigger in D1.
    const killResult = await this.db.prepare(`
      UPDATE breakout_candidates
      SET status = 'killed', updated_at = datetime('now')
      WHERE status IN ('candidate', 'confirmed')
        AND NOT EXISTS (
          SELECT 1 FROM video_summary vs
          WHERE vs.video_id = breakout_candidates.video_id
            AND vs.last_seen >= datetime('now', '-2 hours')
        )
    `).run();
    killed = killResult.meta?.changes ?? 0;

    return {
      baselineP80: Math.round(baseline),
      youngVideosChecked: allYoung.length,
      qualifyingScore: qualifying.length,
      upserted,
      killed,
    };
  }

  // Public read for the leaderboard endpoint.
  async getBreakouts({ limit = 20, status = null } = {}) {
    const allowed = ['candidate', 'confirmed', 'graduated', 'killed'];
    const statusClause = (status && allowed.includes(status))
      ? `AND bc.status = '${status}'`
      : `AND bc.status IN ('candidate', 'confirmed', 'graduated')`;

    const result = await this.db.prepare(`
      SELECT
        bc.video_id,
        bc.detected_at,
        bc.source_chart,
        bc.source_rank,
        bc.age_hours_at_detection,
        bc.velocity_at_detection,
        bc.score,
        bc.status,
        bc.promoted_at,
        bc.updated_at,
        v.title,
        v.channel_title,
        v.channel_id,
        v.thumb_url,
        v.duration,
        v.is_short,
        v.published_at,
        vs.current_rank,
        vs.current_chart,
        vs.current_views,
        vs.peak_rank,
        vs.days_on_chart
      FROM breakout_candidates bc
      JOIN videos v ON v.id = bc.video_id
      LEFT JOIN video_summary vs ON vs.video_id = bc.video_id
      WHERE 1=1 ${statusClause}
      ORDER BY bc.score DESC, bc.detected_at DESC
      LIMIT ?
    `).bind(limit).all();

    return result.results || [];
  }

  // Layer 2: call videos.list for active candidates to get fresher view counts
  // between main collection ticks. Costs 1 YouTube API unit per call.
  // Velocity = (new_views - last_chart_views) / hours_since_last_chart_update.
  async refreshCandidatesLayer2(youtubeApiKey) {
    const rows = await this.db.prepare(`
      SELECT bc.video_id, vs.current_views, vs.updated_at
      FROM breakout_candidates bc
      LEFT JOIN video_summary vs ON vs.video_id = bc.video_id
      WHERE bc.status IN ('candidate', 'confirmed')
        AND vs.current_views IS NOT NULL
      ORDER BY bc.score DESC
      LIMIT 50
    `).all();

    const candidates = rows.results || [];
    if (!candidates.length) return { refreshed: 0, apiUnit: false };

    const ids = candidates.map(c => c.video_id).join(',');
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${youtubeApiKey}`
    );
    if (!resp.ok) throw new Error(`YouTube API ${resp.status}`);
    const data = await resp.json();

    const freshViews = {};
    for (const item of (data.items || [])) {
      freshViews[item.id] = parseInt(item.statistics?.viewCount ?? '0', 10);
    }

    const now = new Date().toISOString();
    let refreshed = 0;

    for (const c of candidates) {
      const newViews = freshViews[c.video_id];
      if (!newViews || !c.updated_at || !c.current_views) continue;

      const hoursElapsed = (Date.now() - Date.parse(c.updated_at)) / 3_600_000;
      if (hoursElapsed < 0.083) continue; // <5 min since last chart update — too noisy

      const delta = newViews - c.current_views;
      if (delta <= 0) continue;

      const velocity = delta / hoursElapsed;

      await this.db.prepare(`
        UPDATE breakout_candidates
        SET current_velocity = ?,
            peak_velocity     = max(coalesce(peak_velocity, 0), ?),
            updated_at        = ?
        WHERE video_id = ?
      `).bind(velocity, velocity, now, c.video_id).run();

      refreshed++;
    }

    return { refreshed, total: candidates.length, apiUnit: true };
  }
}
