/// <reference types="@cloudflare/workers-types" />

// Phase 2 rollup layer. Maintains video_summary + video_rank_history inline
// with each collection so per-video pages can read one row instead of scanning
// 44.5M video_stats rows.
//
// Call pattern from a scheduled handler:
//   const rollups = new RollupService(env.DB);
//   await rollups.recordChartAndRefresh({
//     chart: 'global:videos',
//     capturedAt,                       // same bucket the stats insert used
//     rankedVideoIds: [...],            // index = rank-1
//   });

const HOURS = 1000 * 60 * 60;

export class RollupService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Record ranks for one chart and refresh video_summary for every video listed.
   * Designed to be called once per chart per cron tick. capturedAt should match
   * DatabaseService.getCaptureBucketTimestamp() for the run that just inserted
   * the corresponding video_stats rows.
   */
  async recordChartAndRefresh({ chart, capturedAt, rankedVideoIds }) {
    if (!rankedVideoIds || rankedVideoIds.length === 0) return;

    await this.#insertRanks({ chart, capturedAt, rankedVideoIds });
    await this.#refreshSummaries({ chart, capturedAt, rankedVideoIds });
  }

  async #insertRanks({ chart, capturedAt, rankedVideoIds }) {
    const stmts = rankedVideoIds.map((videoId, idx) =>
      this.db.prepare(`
        INSERT OR REPLACE INTO video_rank_history (video_id, captured_at, chart, rank)
        VALUES (?, ?, ?, ?)
      `).bind(videoId, capturedAt, chart, idx + 1)
    );
    await this.db.batch(stmts);
  }

  /**
   * For each touched video, compute fresh summary fields in JS (one round-trip
   * to fetch context, one to upsert) and merge into video_summary using
   * conflict-aware MIN/MAX logic so peaks survive across charts and ticks.
   */
  async #refreshSummaries({ chart, capturedAt, rankedVideoIds }) {
    const idList = rankedVideoIds;
    const placeholders = idList.map(() => '?').join(',');

    // Pull: video metadata + current snapshot stats + immediately prior snapshot stats + existing summary.
    const [videoRows, currStatsRows, prevStatsRows, existingRows] = await Promise.all([
      this.db.prepare(
        `SELECT id, channel_id, is_short, category_id FROM videos WHERE id IN (${placeholders})`
      ).bind(...idList).all(),
      this.db.prepare(
        `SELECT video_id, view_count, like_count, comment_count, captured_at
         FROM video_stats
         WHERE captured_at = ? AND video_id IN (${placeholders})`
      ).bind(capturedAt, ...idList).all(),
      this.db.prepare(
        // Most recent stat strictly before this capture. Subquery per row but
        // bounded to N=ranked-list size, fine for ~100 rows.
        `SELECT s.video_id, s.view_count, s.like_count, s.comment_count, s.captured_at
         FROM video_stats s
         INNER JOIN (
           SELECT video_id, MAX(captured_at) AS captured_at
           FROM video_stats
           WHERE captured_at < ? AND video_id IN (${placeholders})
           GROUP BY video_id
         ) p ON p.video_id = s.video_id AND p.captured_at = s.captured_at`
      ).bind(capturedAt, ...idList).all(),
      this.db.prepare(
        `SELECT * FROM video_summary WHERE video_id IN (${placeholders})`
      ).bind(...idList).all(),
    ]);

    const videoById = indexBy(videoRows.results || [], 'id');
    const currById = indexBy(currStatsRows.results || [], 'video_id');
    const prevById = indexBy(prevStatsRows.results || [], 'video_id');
    const existingById = indexBy(existingRows.results || [], 'video_id');

    const today = capturedAt.slice(0, 10); // YYYY-MM-DD
    const upserts = [];

    rankedVideoIds.forEach((videoId, idx) => {
      const rank = idx + 1;
      const meta = videoById[videoId];
      const curr = currById[videoId];
      if (!meta || !curr) {
        // No metadata or no fresh stats row — collection upstream skipped this video.
        return;
      }
      const prev = prevById[videoId];
      const existing = existingById[videoId];

      const velocity = computeVelocity(curr, prev);
      const engagement = computeEngagement(curr);

      if (!existing) {
        upserts.push(buildInsertStmt(this.db, {
          videoId,
          meta,
          curr,
          capturedAt,
          chart,
          rank,
          velocity,
          engagement,
          today,
        }));
      } else {
        upserts.push(buildUpdateStmt(this.db, {
          videoId,
          existing,
          curr,
          capturedAt,
          chart,
          rank,
          velocity,
          engagement,
          today,
        }));
      }
    });

    if (upserts.length > 0) {
      await this.db.batch(upserts);
    }
  }
}

function indexBy(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = r;
  return out;
}

function computeVelocity(curr, prev) {
  if (!prev || prev.view_count == null) return null;
  const hours = (Date.parse(curr.captured_at) - Date.parse(prev.captured_at)) / HOURS;
  if (hours < 10 / 60) return null;       // <10 min apart: legacy unbucketed rows produce garbage; skip
  const delta = curr.view_count - prev.view_count;
  if (delta < 0) return null;             // YouTube occasionally adjusts counts down; ignore
  return delta / hours;
}

function computeEngagement(curr) {
  if (!curr.view_count || curr.view_count <= 0) return null;
  const interactions = (curr.like_count || 0) + (curr.comment_count || 0);
  return interactions / curr.view_count;
}

function buildInsertStmt(db, x) {
  return db.prepare(`
    INSERT INTO video_summary (
      video_id, channel_id, is_short, category_id,
      first_seen, last_seen, days_on_chart, trending_appearances,
      current_rank, current_chart, current_views, current_likes, current_comments,
      peak_rank, peak_rank_date, peak_rank_chart,
      peak_velocity, peak_velocity_at,
      engagement_day1, engagement_week1, engagement_now,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    x.videoId,
    x.meta.channel_id,
    x.meta.is_short ? 1 : 0,
    x.meta.category_id,
    x.capturedAt,
    x.capturedAt,
    x.rank,
    x.chart,
    x.curr.view_count,
    x.curr.like_count,
    x.curr.comment_count,
    x.rank,
    x.today,
    x.chart,
    x.velocity,
    x.velocity != null ? x.capturedAt : null,
    // day1 and week1 stay null until the video crosses 24h / 168h of age —
    // the UPDATE path fills them in (see buildUpdateStmt). Pre-filling here
    // poisons the column as "engagement at first sighting" instead of the
    // intended time-anchored snapshot.
    null,
    null,
    x.engagement,
  );
}

function buildUpdateStmt(db, x) {
  const e = x.existing;

  const newDaysOnChart = e.last_seen && e.last_seen.slice(0, 10) === x.today
    ? e.days_on_chart
    : (e.days_on_chart || 0) + 1;

  // Peak rank: smaller is better.
  const peakImproves = x.rank < (e.peak_rank ?? Number.POSITIVE_INFINITY);
  const peakRank = peakImproves ? x.rank : e.peak_rank;
  const peakRankDate = peakImproves ? x.today : e.peak_rank_date;
  const peakRankChart = peakImproves ? x.chart : e.peak_rank_chart;

  // Peak velocity: larger is better.
  const velImproves = x.velocity != null && x.velocity > (e.peak_velocity ?? -1);
  const peakVelocity = velImproves ? x.velocity : e.peak_velocity;
  const peakVelocityAt = velImproves ? x.capturedAt : e.peak_velocity_at;

  // Engagement decay snapshots: pin day1 / week1 the first time we cross those thresholds.
  const ageMs = Date.parse(x.capturedAt) - Date.parse(e.first_seen);
  const ageHours = ageMs / HOURS;
  const engagementDay1 = e.engagement_day1 ?? (ageHours >= 24 ? x.engagement : null) ?? e.engagement_now;
  const engagementWeek1 = e.engagement_week1 ?? (ageHours >= 24 * 7 ? x.engagement : null);

  return db.prepare(`
    UPDATE video_summary SET
      last_seen = ?,
      days_on_chart = ?,
      trending_appearances = trending_appearances + 1,
      current_rank = ?,
      current_chart = ?,
      current_views = ?,
      current_likes = ?,
      current_comments = ?,
      peak_rank = ?,
      peak_rank_date = ?,
      peak_rank_chart = ?,
      peak_velocity = ?,
      peak_velocity_at = ?,
      engagement_day1 = ?,
      engagement_week1 = ?,
      engagement_now = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE video_id = ?
  `).bind(
    x.capturedAt,
    newDaysOnChart,
    x.rank,
    x.chart,
    x.curr.view_count,
    x.curr.like_count,
    x.curr.comment_count,
    peakRank,
    peakRankDate,
    peakRankChart,
    peakVelocity,
    peakVelocityAt,
    engagementDay1,
    engagementWeek1,
    x.engagement,
    x.videoId,
  );
}
