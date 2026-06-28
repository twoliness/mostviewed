import { YouTubeApiService } from './youtube-api';

// When a /video/[slug] page renders a stale video (off-chart for >24h), fetch
// fresh view/like/comment counts inline from YouTube so the displayed totals
// reflect reality, not the moment the video dropped off our charts.
//
// Cost: 1 quota unit per refresh (videos.list?part=statistics). KV-gated to
// max 1 refresh per video per hour so a hot Google-result page doesn't burn
// the budget.
//
// IMPORTANT: only updates video_summary.current_views/likes/comments. We do
// NOT write to video_stats or mv_latest_video_stats — the latter is what
// powers the "currently trending" leaderboard, and a trigger on video_stats
// inserts upserts mv automatically. Writing to either would re-surface
// off-chart videos in the leaderboard with their lifetime view count.
//
// We also deliberately do NOT touch last_seen — that stays as the last time
// the video was on a chart, which powers the "tracked Apr 1 → Apr 28"
// historical-window UI on the detail page.

const REFRESH_TTL_SECONDS = 3600;

export async function maybeRefreshStaleVideo(env, videoId) {
  if (!env?.DB) return { refreshed: false, reason: 'no-db' };
  if (!env?.YOUTUBE_API_KEY) return { refreshed: false, reason: 'no-api-key' };
  // Guard: when dev is connected to remote D1 (DEV_REMOTE_D1=1), do not write —
  // page loads during local iteration must NOT touch production data.
  if (env?.DEV_REMOTE_D1) return { refreshed: false, reason: 'dev-remote-guard' };

  // Rate-limit per video via KV.
  if (env.VIDTRENDS_CACHE) {
    const cached = await env.VIDTRENDS_CACHE.get(`refresh:${videoId}`);
    if (cached) return { refreshed: false, reason: 'rate-limited', lastRefreshAt: cached };
  }

  try {
    const yt = new YouTubeApiService(env.YOUTUBE_API_KEY);
    const items = await yt.refreshVideoStats([videoId]);
    const item = items?.[0];
    if (!item?.statistics) return { refreshed: false, reason: 'not-found-or-private' };

    const viewCount = Number(item.statistics.viewCount || 0);
    const likeCount = item.statistics.likeCount != null ? Number(item.statistics.likeCount) : null;
    const commentCount = item.statistics.commentCount != null ? Number(item.statistics.commentCount) : null;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE video_summary
      SET current_views = ?, current_likes = ?, current_comments = ?, updated_at = ?
      WHERE video_id = ?
    `).bind(viewCount, likeCount, commentCount, now, videoId).run();

    if (env.VIDTRENDS_CACHE) {
      await env.VIDTRENDS_CACHE.put(`refresh:${videoId}`, now, { expirationTtl: REFRESH_TTL_SECONDS });
    }

    return { refreshed: true, viewCount, likeCount, commentCount, refreshedAt: now };
  } catch (err) {
    console.error('[refresh-stale-video]', videoId, err?.message);
    return { refreshed: false, reason: 'api-error', error: err?.message };
  }
}
