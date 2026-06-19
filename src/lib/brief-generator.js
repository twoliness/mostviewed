import Anthropic from '@anthropic-ai/sdk';
import { formatViewCountShort } from '@/lib/utils';

function buildPrompt({ topVideos, topShorts, topCreators }) {
  const videoList = topVideos
    .slice(0, 10)
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" by ${v.channel_title} — ${formatViewCountShort(v.view_count)} views — Category: ${v.category_name || 'General'} — ID: ${v.id}`
    )
    .join('\n');

  const shortList = topShorts
    .slice(0, 5)
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" by ${v.channel_title} — ${formatViewCountShort(v.view_count)} views — ID: ${v.id}`
    )
    .join('\n');

  const creatorList = topCreators
    .slice(0, 3)
    .map((c, i) => `${i + 1}. ${c.channel_title} — ${formatViewCountShort(c.total_views)} total views`)
    .join('\n');

  return `You are writing The Daily Viral Brief for mostviewed.today — a concise, sharp newsletter about what's breaking out on YouTube today.

TODAY'S LEADERBOARD DATA:

TOP VIDEOS:
${videoList}

TOP SHORTS:
${shortList}

TOP CREATORS:
${creatorList}

Write the email body using this exact template. Be specific and use real names, numbers, and video IDs from the data above. Keep each section tight. Use the watch links format https://youtube.com/watch?v=VIDEO_ID.

---

Hey,

Here's today's quick read on what's breaking out on YouTube.

## 🔥 Today's breakout

**[#1 video title from data]**
by **[Creator / Channel]**

**Why it's moving:**
[1–2 sentences. Analyse the title, category, and view velocity to explain why this specific video is dominating today.]

**Views today:** [X from data]
**Category:** [Category from data]
**Watch:** https://youtube.com/watch?v=[ID from data]

---

## ⚡ Fast-rising Short

**[Top short title from data]**
by **[Creator]**

This one is picking up fast because:
[1–2 sentences on format, topic, timing, or trend — be specific to the content.]

**Views today:** [X from data]
**Watch:** https://youtube.com/watch?v=[ID from data]

---

## 👀 Creator to watch

**[Top creator from data]**

Why they stood out today:
[1–2 sentences on their performance — view count, category dominance, or pattern.]

---

## 🧠 Pattern of the day

**[Name the pattern you see across today's top content]**

Example from today:
"[A direct quote or description of a title/format from the data that illustrates the pattern]"

Why it works:
[2–3 sentences explaining the content/title/thumbnail pattern in plain language.]

---

## Want the full chart?

Today's full leaderboard includes:

* Full daily ranking
* Category breakdowns
* Shorts leaderboard
* Country trends
* Rising creators

[View today's leaderboard →](https://mostviewed.today)

—
MostViewed.today
Find what's viral first.

Unsubscribe: {{UNSUBSCRIBE_LINK}}

---

Return ONLY the email body. No subject line. No commentary outside the template. Replace every placeholder with real data.`;
}

function wrapHtml(text, date) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;">$1</h2>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">')
    .replace(/^\* (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    .replace(/(<li[^>]*>.+<\/li>\n?)+/g, (m) => `<ul style="margin:8px 0;padding-left:20px;">${m}</ul>`)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#c2410c;text-decoration:none;">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 12px;">');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden;">
<tr><td style="padding:24px 32px 8px;border-bottom:1px solid #e5e5e5;">
<span style="font-size:14px;font-weight:600;color:#1a1a1a;">mostviewed</span><span style="font-size:14px;font-weight:600;color:#c2410c;">.today</span>
<span style="margin-left:12px;font-size:12px;color:#737373;">The Daily Viral Brief · ${date}</span>
</td></tr>
<tr><td style="padding:24px 32px 32px;">
<p style="margin:0 0 12px;">${html}</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#fafaf9;border-top:1px solid #e5e5e5;font-size:11px;color:#a3a3a3;">
MostViewed.today · Find what's viral first.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function generateDailyBrief({ topVideos, topShorts, topCreators }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: buildPrompt({ topVideos, topShorts, topCreators }) }],
  });

  const text = message.content[0].text;
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    text,
    html: wrapHtml(text, date),
    subject: `The Daily Viral Brief · ${date}`,
  };
}
