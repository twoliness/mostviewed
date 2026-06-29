import Anthropic from '@anthropic-ai/sdk';
import { formatViewCountShort } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mostviewed.today';

const EARLY_ACCESS_URL =
  'mailto:contact@mostviewed.today?subject=MostViewed%20Pro%20Early%20Access&body=Hi%2C%0A%0AI%27d%20like%20to%20join%20the%20early%20access%20list%20for%20MostViewed%20Pro.%0A%0AThanks';

const SPONSOR_URL =
  'mailto:contact@mostviewed.today?subject=Sponsoring%20The%20Daily%20Viral%20Brief';

function utmUrl(path, content) {
  return `${SITE_URL}${path}?utm_source=newsletter&utm_medium=email&utm_campaign=daily-brief&utm_content=${content}`;
}

function buildPrompt({ topVideos, topShorts, topCreators, categorySummary, countrySummary, date }) {
  const topVideosJson = JSON.stringify(
    topVideos.map((v) => ({
      chart_rank: v.rank,
      id: v.id,
      title: v.title,
      channel: v.channel_title,
      total_views: v.view_count,
      total_views_formatted: formatViewCountShort(v.view_count),
      category: v.category_name || null,
      url: `https://youtube.com/watch?v=${v.id}`,
    })),
    null,
    2
  );

  const topShortsJson = JSON.stringify(
    topShorts.map((v) => ({
      chart_rank: v.rank,
      id: v.id,
      title: v.title,
      channel: v.channel_title,
      total_views: v.view_count,
      total_views_formatted: formatViewCountShort(v.view_count),
      url: `https://youtube.com/watch?v=${v.id}`,
    })),
    null,
    2
  );

  const creatorSummaryJson = JSON.stringify(
    topCreators.map((c, i) => ({
      rank: i + 1,
      channel: c.channel_title,
      video_count: c.video_count,
      total_views: c.total_views,
      total_views_formatted: formatViewCountShort(c.total_views),
    })),
    null,
    2
  );

  const categorySummaryJson = JSON.stringify(
    categorySummary.map((c) => ({
      category: c.category,
      video_count: c.video_count,
      total_views: c.total_views,
      total_views_formatted: formatViewCountShort(c.total_views),
    })),
    null,
    2
  );

  const countrySummaryJson = JSON.stringify(
    countrySummary.map((c) => ({
      country_code: c.country_code,
      video_count: c.video_count,
      total_views: c.total_views,
      total_views_formatted: formatViewCountShort(c.total_views),
    })),
    null,
    2
  );

  const leaderboardUrl = utmUrl('', 'leaderboard');

  return `You are the editorial analyst for MostViewed.today, a daily YouTube trend brief.

Your job is to turn today's YouTube leaderboard data into a short, premium-feeling newsletter for creators, editors, agencies, and internet trend-watchers.

Write like a sharp media analyst, not a hype marketer.

IMPORTANT RULES:

* Only use the data provided.
* Do not invent facts, audience behavior, retention data, watch-time data, algorithm claims, or creator intent.
* Do not say "the algorithm rewards," "keeps watch time high," "audiences crave," or "drives engagement" unless the data directly proves it.
* Prefer phrases like "the signal here is," "this suggests," "what stands out," and "based on today's leaderboard."
* Use concrete signals: views today, rank, repeated appearances, title patterns, category presence, Shorts vs long-form, and creator concentration.
* Keep the writing concise, useful, and specific.
* Avoid generic phrases like "viral sensation," "dominating the internet," "massive engagement," "captured audiences," or "quick dopamine hits."
* Use "tracked" instead of "posted" unless the input explicitly says the creator posted those videos today.
* Do not say "consistently," "reliably," or "across audience segments" unless historical or audience data is provided.
* Clean messy Shorts titles for readability, but preserve the original meaning.
* If a category looks wrong or unreliable, use the normalized category. If no normalized category exists, omit the category.

EDITORIAL SELECTION RULES:
The newsletter should feel broad, not repetitive.

Do not use the same creator/channel for more than TWO sections unless that creator clearly dominates the entire leaderboard.

Preferred variety:
* Today's breakout: choose the strongest non-Short long-form video with a clear signal.
* Fast-rising Short: choose the strongest Short.
* Creator to watch: choose the creator with repeated appearances, unusually high total tracked views, or a clear repeatable format.
* Pattern of the day: choose a repeatable pattern visible across at least 2–3 videos.

Avoid this bad flow:
* Breakout = MrBeast
* Creator to watch = MrBeast
* Pattern = MrBeast challenge format

If one creator dominates, handle it like this:
* Mention them heavily in "Creator to watch" OR "Pattern of the day"
* Use "Today's breakout" for a different strong video if available
* Use the Short section for category/format variety

SELECTION PRIORITY:
1. Choose variety across sections.
2. Choose videos with clear editorial signals.
3. Choose data-backed insights over raw rank.
4. Do not automatically pick rank #1 if another video creates a better insight.
5. Keep the free brief valuable, but do not reveal the full leaderboard.

INPUT DATA:
Date: ${date}
Leaderboard URL: ${leaderboardUrl}

Top long-form videos:
${topVideosJson}

Top Shorts:
${topShortsJson}

Creator summary:
${creatorSummaryJson}

Category summary:
${categorySummaryJson}

Country summary:
${countrySummaryJson}

OUTPUT FORMAT:

Subject: [short subject line under 60 characters]

Preheader: [short preheader under 100 characters]

Email:

Hey,

Here's today's quick read on what's breaking out on YouTube.

## 🔥 Today's breakout

**[Best long-form breakout video title]** by **[channel]**

**Why it's moving:**
[2 sentences max. Explain the specific signal: rank, views today, creator presence, collaboration, title promise, release type, category movement, or view velocity. Do not overclaim.]

**Chart rank:** [rank]
**Total views:** [total_views_formatted]
**Category:** [normalized category if available]
**Watch:** [url]

---

## ⚡ Fast-rising Short

**[Cleaned Short title]** by **[channel]**

**Why it's moving:**
[2 sentences max. Explain the visible format signal: title style, emotion, simplicity, meme, comedy, visual hook, challenge, or shareability. Do not make algorithm claims.]

**Chart rank:** [rank]
**Total views:** [total_views_formatted]
**Watch:** [url]

---

## 👀 Creator to watch

**[creator/channel name]**

**Why they stood out today:**
[2–3 sentences. Choose a creator with repeated appearances, high combined tracked views, strong category presence, or a clear repeatable format. Make the insight practical for creators/editors.]

---

## 🧠 Pattern of the day

**[Name the pattern in 3–6 words]**

Example from today:
"[video title 1]" / "[video title 2]" / "[video title 3]"

**Why it works:**
[3–4 sentences. Explain the repeatable content pattern. Focus on packaging, title clarity, stakes, format, novelty, emotion, or viewer curiosity.]

**The repeatable takeaway:**
[One sentence formula. Example: explicit cash prize + clear survival rule + novel setting = instant viewer curiosity.]

---

FINAL QUALITY CHECK BEFORE OUTPUT:

* Is the same creator used in too many sections? If yes, swap one section for a different strong signal.
* Did you make any claims about algorithm, retention, engagement, or audience behavior that the data does not prove? If yes, rewrite.
* Did you use "tracked" instead of "posted"?
* Is every insight based on the provided data?
* Is the email useful even if the reader does not click through?
* Is the Pro CTA still valuable because the full leaderboard, filters, history, and alerts are not fully revealed?

Output ends here. Do not add CTAs, sign-offs, or unsubscribe links — those are added automatically.`;
}

function parseOutput(rawText) {
  const subjectMatch = rawText.match(/^Subject:\s*(.+)$/m);
  const preheaderMatch = rawText.match(/^Preheader:\s*(.+)$/m);
  const emailMatch = rawText.match(/Email:\s*\n([\s\S]+)/);

  let body = emailMatch?.[1]?.trim() ?? rawText.trim();

  // Strip any CTA sections Claude may have included — staticSections() handles them as clean HTML
  body = body.replace(/\n*---\n*## Want deeper trend tracking\?[\s\S]*$/m, '').trim();

  return {
    subject: subjectMatch?.[1]?.trim() ?? null,
    preheader: preheaderMatch?.[1]?.trim() ?? null,
    body,
  };
}

const A = 'color:#c2410c;text-decoration:none;font-weight:600;';
const A_MUTED = 'color:#a3a3a3;text-decoration:underline;';
const P = 'margin:0 0 12px;font-size:14px;color:#404040;line-height:1.6;';
const H2 = 'margin:24px 0 8px;font-size:16px;font-weight:600;color:#1a1a1a;';
const HR = 'border:none;border-top:1px solid #e5e5e5;margin:24px 0;';
const LI = 'margin:0;padding:2px 0;font-size:14px;color:#404040;line-height:1.5;';

function staticSections() {
  const leaderboardUrl = utmUrl('', 'leaderboard');
  const shareUrl = utmUrl('', 'share');
  return `
<hr style="${HR}">
<h2 style="${H2}">Want deeper trend tracking?</h2>
<p style="${P}">MostViewed Pro is coming soon with full rankings, Shorts tracking, category breakdowns, country trends, rising creators, historical charts, and breakout alerts.</p>
<p style="${P}"><a href="${EARLY_ACCESS_URL}" style="${A}">Join early access →</a></p>

<hr style="${HR}">
<h2 style="${H2}">Want to sponsor this brief?</h2>
<p style="${P}">Reach creators, editors, agencies, and trend-watchers following what's breaking out on YouTube.</p>
<p style="${P}"><a href="${SPONSOR_URL}" style="${A}">Sponsor The Daily Viral Brief →</a></p>

<hr style="${HR}">
<h2 style="${H2}">Share MostViewed.today</h2>
<p style="${P}">Know someone who tracks YouTube trends? Send them this brief or share:<br>
<a href="${shareUrl}" style="${A}">mostviewed.today</a></p>

<hr style="${HR}">
<p style="${P}">View today's leaderboard:<br>
<a href="${leaderboardUrl}" style="${A}">MostViewed.today →</a></p>
<p style="margin:16px 0 0;font-size:14px;color:#737373;">—<br>MostViewed.today<br>Find what's viral first.</p>`;
}

function wrapHtml(body, date, preheader) {
  const safePreheader =
    preheader || 'Fast-rising videos, Shorts, creators, and patterns worth watching today.';

  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, `<h2 style="${H2}">$1</h2>`)
    .replace(/^---$/gm, `<hr style="${HR}">`)
    .replace(/^\* (.+)$/gm, `<li style="${LI}">$1</li>`)
    .replace(/(<li[^>]*>.+<\/li>\n?)+/g, (m) => `<ul style="margin:6px 0 12px;padding-left:20px;">${m}</ul>`)
    .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" style="${A}">$1</a>`)
    .replace(/\n\n/g, `</p><p style="${P}">`)
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePreheader}&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden;">
<tr><td style="padding:24px 32px 8px;border-bottom:1px solid #e5e5e5;">
<span style="font-size:14px;font-weight:600;color:#1a1a1a;">mostviewed</span><span style="font-size:14px;font-weight:600;color:#c2410c;">.today</span>
<span style="margin-left:12px;font-size:12px;color:#737373;">The Daily Viral Brief · ${date}</span>
</td></tr>
<tr><td style="padding:24px 32px 32px;font-size:14px;color:#1a1a1a;line-height:1.6;">
<p style="${P}">${html}</p>
${staticSections()}
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e5e5e5;font-size:11px;color:#a3a3a3;">
MostViewed.today · Find what's viral first. · <a href="{{UNSUBSCRIBE_LINK}}" style="${A_MUTED}">Unsubscribe</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function generateDailyBrief({ topVideos, topShorts, topCreators, categorySummary = [], countrySummary = [] }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: buildPrompt({ topVideos, topShorts, topCreators, categorySummary, countrySummary, date }),
      },
    ],
  });

  const rawText = message.content[0].text;
  const { subject, preheader, body } = parseOutput(rawText);

  return {
    text: body,
    html: wrapHtml(body, date, preheader),
    subject: subject || `The Daily Viral Brief · ${date}`,
  };
}
