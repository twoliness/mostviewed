import Anthropic from '@anthropic-ai/sdk';
import { formatViewCountShort } from '@/lib/utils';

const MODEL = 'claude-haiku-4-5-20251001';

// Static system prompt — cached on first call, reused for calls 2-4 within the same cron run.
// Must be ≥1024 tokens for Anthropic prompt caching to activate (this is ~2000 tokens).
const SYSTEM_PROMPT = `You are the content generator for @mvtscores, the X/Twitter account for mostviewed.today — a YouTube trending intelligence platform that tracks 204k+ videos with 30-minute rank snapshots, dating back 9 months.

Your job: convert structured video/chart data into short, factual X posts in a consistent voice.

VOICE RULES:
- Factual and data-led. No hype words ("insane", "crazy", "huge", "massive").
- No emojis unless explicitly provided in the input (you may use 📈 📊 🏆 sparingly, max 1 per post).
- No hashtags unless the input explicitly requests them.
- Short sentences. No filler clauses ("It's worth noting that...", "Interestingly...").
- Never use exclamation points.
- Sentence case only — no ALL CAPS except in artist/song names if that's how they're officially styled.
- Always end data drop and breakout posts with a link in this exact format: "Full rank timeline → mostviewed.today/video/{slug}"
- Never fabricate numbers. Only use data explicitly provided in the input. If a field is missing, omit that line — do not guess or estimate.
- Keep total post length under 270 characters (X limit is 280, leave buffer).

POST TYPES — generate ONLY the type specified in the input:

1. DATA_DROP — A snapshot of current stats for a trending video.
Format:
{headline sentence stating the key fact}

Current rank: #{rank} {chart}
Peak rank: #{peak_rank} {trophy emoji if peak_rank == 1}
{views} views · {days_on_chart} days on chart

Full rank timeline → mostviewed.today/video/{slug}

2. BREAKOUT — A video that just entered trending or had a dramatic rank change.
Format:
{video_title} just entered {chart} at #{rank}.

{one sentence of context: e.g. "biggest jump of the day" or "new entry, no prior chart history"}

Track it live → mostviewed.today/video/{slug}

3. CHART_FACT — A single sharp stat, often comparative or historical.
Format:
{one or two sentence fact using the moat data: time at position, peak duration, rank velocity}

{optional second line for context/comparison if provided}

mostviewed.today

4. CATEGORY_INSIGHT — Daily category performance summary.
Format:
{Category} led YouTube trending today with {total_views} combined views.

Top video: {video_title} — {views} views, #{rank} {chart}

mostviewed.today

5. REPLY — A reply to another account's post, adding YouTube-specific data they don't have.
Format:
{one sentence adding the new data point, referencing their claim if relevant}

{optional: Full rank timeline → mostviewed.today/video/{slug}}

Keep replies under 200 characters. No greeting, no "great post!" — go straight to the data.

INPUT FORMAT YOU WILL RECEIVE:
{
  "post_type": "DATA_DROP | BREAKOUT | CHART_FACT | CATEGORY_INSIGHT | REPLY",
  "video_title": string,
  "artist_channel": string,
  "current_rank": number or "off chart",
  "peak_rank": number,
  "peak_rank_date": string,
  "chart": string (e.g. "Global", "Music", "USA"),
  "total_views": string (e.g. "137.6M"),
  "days_on_chart": number,
  "days_at_peak": number,
  "slug": string,
  "reply_to_post": string (only for REPLY type — the original post text being replied to),
  "comparison_note": string (optional, e.g. "fastest drop this month")
}

OUTPUT: Return ONLY the post text. No preamble, no explanation, no quotation marks around it.`;

function formatChart(currentChart, categoryName) {
  if (!currentChart) return 'Global';
  if (currentChart === 'global:videos') return 'Global · Videos';
  if (currentChart === 'global:shorts') return 'Global · Shorts';
  if (currentChart.startsWith('category:')) {
    const type = currentChart.endsWith(':shorts') ? 'Shorts' : 'Videos';
    return `${categoryName || 'Category'} · ${type}`;
  }
  return currentChart;
}

async function queryTrendingVideos(db) {
  const { results } = await db
    .prepare(
      `SELECT v.id, v.title, v.channel_title,
              rh.rank as current_rank,
              vs.peak_rank, vs.peak_rank_date, vs.current_views, vs.days_on_chart,
              (SELECT COUNT(DISTINCT date(h.captured_at))
               FROM video_rank_history h
               WHERE h.video_id = v.id AND h.rank = vs.peak_rank
                 AND h.chart = 'global:videos') as days_at_peak
       FROM video_rank_history rh
       JOIN videos v ON v.id = rh.video_id
       JOIN video_summary vs ON vs.video_id = rh.video_id
       WHERE rh.chart = 'global:videos'
         AND rh.captured_at = (
           SELECT MAX(captured_at) FROM video_rank_history WHERE chart = 'global:videos'
         )
       ORDER BY rh.rank ASC
       LIMIT 10`
    )
    .all();
  return results || [];
}

async function queryBreakout(db) {
  return db
    .prepare(
      `SELECT bc.video_id, bc.score, bc.detected_at,
              v.title, v.channel_title, v.is_short,
              vs.current_rank, vs.current_chart, vs.current_views, vs.peak_rank, vs.days_on_chart,
              c.name as category_name
       FROM breakout_candidates bc
       JOIN videos v ON v.id = bc.video_id
       LEFT JOIN video_summary vs ON vs.video_id = bc.video_id
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE bc.status IN ('confirmed', 'candidate')
         AND vs.last_seen >= datetime('now', '-2 hours')
       ORDER BY bc.score DESC
       LIMIT 1`
    )
    .first();
}

async function queryCategories(db) {
  const { results } = await db
    .prepare(
      `SELECT c.id as category_id, c.name as category,
              SUM(vs.current_views) as total_views
       FROM video_summary vs
       JOIN videos v ON v.id = vs.video_id
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE v.is_short = 0
         AND vs.current_rank IS NOT NULL
         AND vs.last_seen >= datetime('now', '-2 hours')
         AND c.name IS NOT NULL
       GROUP BY v.category_id, c.id, c.name
       ORDER BY total_views DESC
       LIMIT 5`
    )
    .all();
  return results || [];
}

async function queryTopCategoryVideo(db, categoryId) {
  const chart = `category:${categoryId}:videos`;
  return db
    .prepare(
      `SELECT v.id, v.title, v.channel_title, rh.rank, vs.current_views
       FROM video_rank_history rh
       JOIN videos v ON v.id = rh.video_id
       LEFT JOIN video_summary vs ON vs.video_id = rh.video_id
       WHERE rh.chart = ?
         AND rh.captured_at = (SELECT MAX(captured_at) FROM video_rank_history WHERE chart = ?)
       ORDER BY rh.rank ASC
       LIMIT 1`
    )
    .bind(chart, chart)
    .first();
}

async function generatePost(client, inputData) {
  const systemBlock = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 350,
    system: systemBlock,
    messages: [{ role: 'user', content: JSON.stringify(inputData) }],
  });

  let text = message.content[0].text.trim();

  if (text.length > 280) {
    const retry = await client.messages.create({
      model: MODEL,
      max_tokens: 350,
      system: systemBlock,
      messages: [
        { role: 'user', content: JSON.stringify(inputData) },
        { role: 'assistant', content: text },
        {
          role: 'user',
          content: `Too long (${text.length} chars). Rewrite under 270 characters, keeping the key data point and the link.`,
        },
      ],
    });
    text = retry.content[0].text.trim();
  }

  return text;
}

async function sendToTelegram(text, botToken, chatId) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data;
}

export async function generateAndSendSocialPosts({ db, anthropicKey, telegramBotToken, telegramChatId }) {
  const client = new Anthropic({ apiKey: anthropicKey });

  const [trendingVideos, breakout, categories] = await Promise.all([
    queryTrendingVideos(db),
    queryBreakout(db),
    queryCategories(db),
  ]);

  if (!trendingVideos.length) throw new Error('No trending videos available');

  const topVideo = trendingVideos[0];
  const topCategory = categories[0] || null;
  const topCategoryVideo = topCategory ? await queryTopCategoryVideo(db, topCategory.category_id) : null;

  // CHART_FACT: longest-running video that isn't the DATA_DROP subject
  const chartFactVideo =
    trendingVideos.find((v) => v.id !== topVideo.id && v.days_on_chart > 5) ||
    trendingVideos[1] ||
    topVideo;

  const comparisonNote = categories
    .slice(0, 3)
    .map((c) => `${c.category}: ${formatViewCountShort(c.total_views)} total`)
    .join(' · ');

  const postInputs = [
    {
      type: 'DATA_DROP',
      label: '📊 DATA DROP',
      data: {
        post_type: 'DATA_DROP',
        video_title: topVideo.title,
        artist_channel: topVideo.channel_title,
        current_rank: topVideo.current_rank,
        peak_rank: topVideo.peak_rank,
        peak_rank_date: topVideo.peak_rank_date,
        chart: 'Global',
        total_views: formatViewCountShort(topVideo.current_views),
        days_on_chart: topVideo.days_on_chart,
        days_at_peak: topVideo.days_at_peak,
        slug: topVideo.id,
      },
    },
    breakout
      ? {
          type: 'BREAKOUT',
          label: '🔥 BREAKOUT',
          data: {
            post_type: 'BREAKOUT',
            video_title: breakout.title,
            artist_channel: breakout.channel_title,
            current_rank: breakout.current_rank,
            peak_rank: breakout.peak_rank,
            chart: formatChart(breakout.current_chart, breakout.category_name),
            total_views: formatViewCountShort(breakout.current_views),
            days_on_chart: breakout.days_on_chart,
            slug: breakout.video_id,
          },
        }
      : null,
    {
      type: 'CHART_FACT',
      label: '📈 CHART FACT',
      data: {
        post_type: 'CHART_FACT',
        video_title: chartFactVideo.title,
        artist_channel: chartFactVideo.channel_title,
        current_rank: chartFactVideo.current_rank,
        peak_rank: chartFactVideo.peak_rank,
        peak_rank_date: chartFactVideo.peak_rank_date,
        chart: 'Global',
        total_views: formatViewCountShort(chartFactVideo.current_views),
        days_on_chart: chartFactVideo.days_on_chart,
        days_at_peak: chartFactVideo.days_at_peak,
        slug: chartFactVideo.id,
      },
    },
    topCategory && topCategoryVideo
      ? {
          type: 'CATEGORY_INSIGHT',
          label: '🏆 CATEGORY INSIGHT',
          data: {
            post_type: 'CATEGORY_INSIGHT',
            video_title: topCategoryVideo.title,
            artist_channel: topCategoryVideo.channel_title,
            current_rank: topCategoryVideo.rank,
            chart: topCategory.category,
            total_views: formatViewCountShort(topCategoryVideo.current_views),
            comparison_note: comparisonNote,
          },
        }
      : null,
  ].filter(Boolean);

  const results = [];

  for (const { type, label, data } of postInputs) {
    try {
      const postText = await generatePost(client, data);
      const message = `${label}\n\n${postText}`;
      await sendToTelegram(message, telegramBotToken, telegramChatId);
      results.push({ type, chars: postText.length, sent: true });
      // Space messages 500ms apart to avoid Telegram rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`[social] Failed to generate/send ${type}:`, err.message);
      results.push({ type, sent: false, error: err.message });
    }
  }

  return results;
}
