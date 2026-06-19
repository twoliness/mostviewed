import { getCloudflareContext } from '@opennextjs/cloudflare';
import { generateDailyBrief } from '@/lib/brief-generator';
import { sendBriefEmail } from '@/lib/newsletter-emails';

async function fetchLeaderboardData(db) {
  const [videosResult, shortsResult, creatorsResult, categoryResult, countryResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT v.id, v.title, v.channel_title, v.channel_id, v.category_id, m.view_count,
                  c.name as category_name
           FROM videos v
           INNER JOIN mv_latest_video_stats m ON v.id = m.video_id
           LEFT JOIN categories c ON v.category_id = c.id
           WHERE v.is_short = 0
           ORDER BY m.view_count DESC
           LIMIT 10`
        )
        .all(),
      db
        .prepare(
          `SELECT v.id, v.title, v.channel_title, m.view_count
           FROM videos v
           INNER JOIN mv_latest_video_stats m ON v.id = m.video_id
           WHERE v.is_short = 1
           ORDER BY m.view_count DESC
           LIMIT 5`
        )
        .all(),
      db
        .prepare(
          `SELECT v.channel_title, v.channel_id, COUNT(v.id) as video_count,
                  SUM(m.view_count) as total_views
           FROM videos v
           INNER JOIN mv_latest_video_stats m ON v.id = m.video_id
           WHERE v.is_short = 0
           GROUP BY v.channel_id, v.channel_title
           ORDER BY total_views DESC
           LIMIT 5`
        )
        .all(),
      db
        .prepare(
          `SELECT c.name as category, COUNT(v.id) as video_count,
                  SUM(m.view_count) as total_views
           FROM videos v
           INNER JOIN mv_latest_video_stats m ON v.id = m.video_id
           LEFT JOIN categories c ON v.category_id = c.id
           WHERE v.is_short = 0 AND c.name IS NOT NULL
           GROUP BY v.category_id, c.name
           ORDER BY total_views DESC
           LIMIT 8`
        )
        .all(),
      db
        .prepare(
          `SELECT v.country_code, COUNT(v.id) as video_count,
                  SUM(m.view_count) as total_views
           FROM videos v
           INNER JOIN mv_latest_video_stats m ON v.id = m.video_id
           WHERE v.country_code IS NOT NULL AND v.country_code != ''
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
