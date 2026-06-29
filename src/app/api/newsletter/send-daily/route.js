import { getCloudflareContext } from '@opennextjs/cloudflare';
import { generateDailyBrief } from '@/lib/brief-generator';
import { sendBriefEmail } from '@/lib/newsletter-emails';

async function fetchLeaderboardData(db) {
  // All queries use video_rank_history or video_summary filtered to currently-trending
  // videos (last_seen within 2h). Previously used mv_latest_video_stats ORDER BY
  // view_count DESC which returned the same high-lifetime-view videos every day
  // regardless of what's actually trending.
  const [videosResult, shortsResult, creatorsResult, categoryResult, countryResult] =
    await Promise.all([
      // Top 10 on the global:videos chart right now, in chart order
      db
        .prepare(
          `SELECT v.id, v.title, v.channel_title, v.channel_id, v.category_id,
                  rh.rank, vs.current_views as view_count,
                  c.name as category_name
           FROM video_rank_history rh
           INNER JOIN videos v ON v.id = rh.video_id
           INNER JOIN video_summary vs ON vs.video_id = rh.video_id
           LEFT JOIN categories c ON v.category_id = c.id
           WHERE rh.chart = 'global:videos'
             AND rh.captured_at = (
               SELECT MAX(captured_at) FROM video_rank_history WHERE chart = 'global:videos'
             )
           ORDER BY rh.rank ASC
           LIMIT 10`
        )
        .all(),
      // Top 5 on the global:shorts chart right now, in chart order
      db
        .prepare(
          `SELECT v.id, v.title, v.channel_title,
                  rh.rank, vs.current_views as view_count
           FROM video_rank_history rh
           INNER JOIN videos v ON v.id = rh.video_id
           INNER JOIN video_summary vs ON vs.video_id = rh.video_id
           WHERE rh.chart = 'global:shorts'
             AND rh.captured_at = (
               SELECT MAX(captured_at) FROM video_rank_history WHERE chart = 'global:shorts'
             )
           ORDER BY rh.rank ASC
           LIMIT 5`
        )
        .all(),
      // Creators ranked by combined views across their currently-trending videos
      db
        .prepare(
          `SELECT v.channel_title, v.channel_id,
                  COUNT(vs.video_id) as video_count,
                  SUM(vs.current_views) as total_views
           FROM video_summary vs
           INNER JOIN videos v ON v.id = vs.video_id
           WHERE v.is_short = 0
             AND vs.current_rank IS NOT NULL
             AND vs.last_seen > datetime('now', '-2 hours')
           GROUP BY v.channel_id, v.channel_title
           ORDER BY total_views DESC
           LIMIT 5`
        )
        .all(),
      // Category breakdown across currently-trending videos
      db
        .prepare(
          `SELECT c.name as category,
                  COUNT(vs.video_id) as video_count,
                  SUM(vs.current_views) as total_views
           FROM video_summary vs
           INNER JOIN videos v ON v.id = vs.video_id
           LEFT JOIN categories c ON v.category_id = c.id
           WHERE v.is_short = 0
             AND vs.current_rank IS NOT NULL
             AND vs.last_seen > datetime('now', '-2 hours')
             AND c.name IS NOT NULL
           GROUP BY v.category_id, c.name
           ORDER BY total_views DESC
           LIMIT 8`
        )
        .all(),
      // Country breakdown across currently-trending videos
      db
        .prepare(
          `SELECT v.country_code,
                  COUNT(vs.video_id) as video_count,
                  SUM(vs.current_views) as total_views
           FROM video_summary vs
           INNER JOIN videos v ON v.id = vs.video_id
           WHERE v.is_short = 0
             AND vs.current_rank IS NOT NULL
             AND vs.last_seen > datetime('now', '-2 hours')
             AND v.country_code IS NOT NULL AND v.country_code != ''
           GROUP BY v.country_code
           ORDER BY total_views DESC
           LIMIT 5`
        )
        .all(),
    ]);

  return {
    topVideos: videosResult.results || [],
    topShorts: shortsResult.results || [],
    topCreators: creatorsResult.results || [],
    categorySummary: categoryResult.results || [],
    countrySummary: countryResult.results || [],
  };
}

export async function POST(request) {
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  const today = new Date().toISOString().slice(0, 10);
  const kvKey = `newsletter:brief:${today}`;

  // Get or generate today's brief (generate once, share across all sends)
  let brief;
  try {
    const cached = await env.VIDTRENDS_CACHE.get(kvKey);
    if (cached) {
      brief = JSON.parse(cached);
      console.log('[send-daily] Using cached brief for', today);
    }
  } catch {
    // Cache miss
  }

  if (!brief) {
    console.log('[send-daily] Generating brief for', today);
    const { topVideos, topShorts, topCreators, categorySummary, countrySummary } =
      await fetchLeaderboardData(db);

    if (topVideos.length === 0) {
      return Response.json({ error: 'No video data available yet' }, { status: 422 });
    }

    brief = await generateDailyBrief({ topVideos, topShorts, topCreators, categorySummary, countrySummary });

    try {
      await env.VIDTRENDS_CACHE.put(kvKey, JSON.stringify(brief), {
        expirationTtl: 60 * 60 * 25, // 25 hours
      });
    } catch (e) {
      console.warn('[send-daily] KV put failed:', e.message);
    }
  }

  // Get all confirmed active subscribers not yet sent today
  const { results: subscribers } = await db
    .prepare(
      `SELECT ns.email, ns.confirm_token
       FROM newsletter_subscribers ns
       WHERE ns.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM newsletter_sends s
           WHERE s.subscriber_email = ns.email
             AND s.type = 'brief'
             AND s.brief_date = ?
             AND s.status = 'sent'
         )`
    )
    .bind(today)
    .all();

  if (!subscribers || subscribers.length === 0) {
    return Response.json({ success: true, sent: 0, message: 'No subscribers to send to' });
  }

  console.log(`[send-daily] Sending to ${subscribers.length} subscribers`);

  let sent = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const sub of subscribers) {
    const result = await sendBriefEmail({
      to: sub.email,
      token: sub.confirm_token,
      briefText: brief.text,
      briefHtml: brief.html,
      briefSubject: brief.subject,
    });

    const status = result.success ? 'sent' : 'failed';
    await db
      .prepare(
        'INSERT INTO newsletter_sends (subscriber_email, type, brief_date, status) VALUES (?, ?, ?, ?)'
      )
      .bind(sub.email, 'brief', today, status)
      .run();

    if (result.success) {
      await db
        .prepare('UPDATE newsletter_subscribers SET last_sent_at = ? WHERE email = ?')
        .bind(now, sub.email)
        .run();
      sent++;
    } else {
      console.error('[send-daily] Failed to send to', sub.email, result.error);
      failed++;
    }
  }

  return Response.json({ success: true, sent, failed, date: today });
}
