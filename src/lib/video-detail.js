// Per-video detail data access. Reads from rollup tables (video_summary,
// video_daily_stats, video_rank_history) so cost is O(1) row + O(N days)
// scans rather than aggregating raw video_stats.

export const DAILY_LIMIT_DAYS = 90;
export const RANK_HISTORY_LIMIT_DAYS = 30;

export async function getVideoDetail(db, videoId) {
  if (!videoId || typeof videoId !== 'string') return null;

  const video = await db.prepare(`
    SELECT id, title, description, channel_id, channel_title, category_id,
           published_at, thumb_url, duration, is_short, country_code,
           tags, topic_categories
    FROM videos WHERE id = ?
  `).bind(videoId).first();
  if (!video) return null;

  // Compute views_today on the fly. daily_stats is only populated by the
  // end-of-UTC-day rollup cron, so relying on it means the Views Today cell is
  // empty for videos that got refreshed today but never rolled up. This
  // subtracts the earliest UTC-today snapshot from the latest one — matches
  // what the leaderboard used to compute.
  const utcMidnightIso = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const [summary, creator, daily, rankHistory, chartTotals, moreFromCreator, viewsTodayRow] = await Promise.all([
    db.prepare(`SELECT * FROM video_summary WHERE video_id = ?`).bind(videoId).first(),
    db.prepare(`
      SELECT channel_id, channel_title, avatar_url, banner_url,
             subscriber_count, view_count, video_count
      FROM creators WHERE channel_id = ?
    `).bind(video.channel_id).first(),
    db.prepare(`
      SELECT day, views_start, views_end, views_delta,
             likes_delta, comments_delta, snapshot_count,
             engagement_rate, peak_velocity
      FROM video_daily_stats
      WHERE video_id = ?
      ORDER BY day DESC
      LIMIT ?
    `).bind(videoId, DAILY_LIMIT_DAYS).all(),
    // No date filter: per-video rank_history is bounded (max ~few thousand
    // rows over the entire tracking lifetime), and off-chart videos need
    // their old appearances to render any timeline at all.
    db.prepare(`
      SELECT captured_at, chart, rank
      FROM video_rank_history
      WHERE video_id = ?
      ORDER BY captured_at DESC
      LIMIT 5000
    `).bind(videoId).all(),
    // Per-chart aggregates over the video's full lifetime in rank_history.
    db.prepare(`
      SELECT chart,
             MIN(rank) AS peak_rank,
             COUNT(*) AS appearances,
             MIN(captured_at) AS first_seen,
             MAX(captured_at) AS last_seen
      FROM video_rank_history
      WHERE video_id = ?
      GROUP BY chart
      ORDER BY peak_rank ASC
    `).bind(videoId).all(),
    // "More from this creator" — top 5 other videos by current_views.
    db.prepare(`
      SELECT v.id, v.title, v.thumb_url, v.is_short, v.duration,
             vs.current_rank, vs.peak_rank, vs.days_on_chart, vs.current_views,
             vs.last_seen
      FROM video_summary vs
      JOIN videos v ON v.id = vs.video_id
      WHERE vs.channel_id = ? AND vs.video_id != ?
      ORDER BY vs.current_views DESC
      LIMIT 5
    `).bind(video.channel_id, videoId).all(),
    db.prepare(`
      SELECT MIN(view_count) AS start_views, MAX(view_count) AS end_views
      FROM video_stats
      WHERE video_id = ? AND captured_at >= ?
    `).bind(videoId, utcMidnightIso).first(),
  ]);

  const viewsToday = (viewsTodayRow?.end_views != null && viewsTodayRow?.start_views != null)
    ? Math.max(0, viewsTodayRow.end_views - viewsTodayRow.start_views)
    : null;

  return {
    video: {
      ...video,
      tags: safeParseJson(video.tags),
      topic_categories: safeParseJson(video.topic_categories),
    },
    summary: summary || null,
    creator: creator || null,
    views_today: viewsToday,
    daily: daily.results || [],
    rank_history: rankHistory.results || [],
    chart_totals: chartTotals.results || [],
    more_from_creator: moreFromCreator.results || [],
  };
}

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
