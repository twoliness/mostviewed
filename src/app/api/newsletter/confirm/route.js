import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sendBriefEmail, buildUnsubscribeUrl } from '@/lib/newsletter-emails';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mostviewed.today';

function htmlPage(title, body) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} · MostViewed.today</title>
  <style>
    body{margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:40px 48px;max-width:480px;text-align:center;}
    .logo{font-size:15px;font-weight:600;margin-bottom:24px;}
    .logo span{color:#c2410c;}
    h1{font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a1a;}
    p{font-size:14px;color:#737373;line-height:1.6;margin:0 0 24px;}
    a.btn{display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:11px 24px;border-radius:6px;font-size:14px;font-weight:600;}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">mostviewed<span>.today</span></div>
  ${body}
</div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return htmlPage(
      'Invalid link',
      '<h1>Invalid link</h1><p>This confirmation link is missing a token.</p>'
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  const subscriber = await db
    .prepare('SELECT email, status FROM newsletter_subscribers WHERE confirm_token = ?')
    .bind(token)
    .first();

  if (!subscriber) {
    return htmlPage(
      'Link expired',
      '<h1>Link not found</h1><p>This confirmation link has already been used or is invalid.</p>'
    );
  }

  if (subscriber.status === 'active') {
    return htmlPage(
      'Already confirmed',
      `<h1>You&apos;re already subscribed</h1>
       <p>Your email is confirmed. Expect the brief every morning.</p>
       <a class="btn" href="${SITE_URL}">View today&apos;s leaderboard</a>`
    );
  }

  // Confirm the subscriber
  const now = new Date().toISOString();
  await db
    .prepare(
      'UPDATE newsletter_subscribers SET status = ?, confirmed_at = ? WHERE confirm_token = ?'
    )
    .bind('active', now, token)
    .run();

  // Try to send today's brief from KV cache
  const todayKey = `newsletter:brief:${new Date().toISOString().slice(0, 10)}`;
  let brief = null;

  try {
    const cached = await env.VIDTRENDS_CACHE.get(todayKey);
    if (cached) {
      brief = JSON.parse(cached);
    }
  } catch {
    // KV miss or parse error — brief will be null, skip sending
  }

  if (brief) {
    const emailResult = await sendBriefEmail({
      to: subscriber.email,
      token,
      briefText: brief.text,
      briefHtml: brief.html,
      briefSubject: brief.subject,
    });

    await db
      .prepare(
        'INSERT INTO newsletter_sends (subscriber_email, type, brief_date, status) VALUES (?, ?, ?, ?)'
      )
      .bind(
        subscriber.email,
        'brief',
        new Date().toISOString().slice(0, 10),
        emailResult.success ? 'sent' : 'failed'
      )
      .run();

    if (emailResult.success) {
      await db
        .prepare('UPDATE newsletter_subscribers SET last_sent_at = ? WHERE email = ?')
        .bind(now, subscriber.email)
        .run();
    }
  }

  return htmlPage(
    'Subscribed',
    `<h1>You&apos;re confirmed! 🎉</h1>
     <p>Welcome to The Daily Viral Brief.${brief ? " Today's brief is on its way to your inbox." : ' Your first brief arrives tomorrow morning at 8 AM UTC.'}</p>
     <a class="btn" href="${SITE_URL}">View today&apos;s leaderboard</a>`
  );
}
