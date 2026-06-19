import { getCloudflareContext } from '@opennextjs/cloudflare';

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
    .card{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:40px 48px;max-width:440px;text-align:center;}
    .logo{font-size:15px;font-weight:600;margin-bottom:24px;}
    .logo span{color:#c2410c;}
    h1{font-size:20px;font-weight:700;margin:0 0 12px;color:#1a1a1a;}
    p{font-size:14px;color:#737373;line-height:1.6;margin:0 0 24px;}
    a{color:#c2410c;font-size:13px;}
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
    return htmlPage('Invalid link', '<h1>Invalid link</h1><p>This unsubscribe link is missing a token.</p>');
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  const subscriber = await db
    .prepare('SELECT email, status FROM newsletter_subscribers WHERE confirm_token = ?')
    .bind(token)
    .first();

  if (!subscriber) {
    return htmlPage(
      'Already unsubscribed',
      '<h1>Already unsubscribed</h1><p>This email is not on our list.</p>'
    );
  }

  if (subscriber.status === 'unsubscribed') {
    return htmlPage(
      'Already unsubscribed',
      `<h1>Already unsubscribed</h1><p>You&apos;ve already been removed from The Daily Viral Brief.</p><a href="${SITE_URL}">← Back to MostViewed.today</a>`
    );
  }

  await db
    .prepare('UPDATE newsletter_subscribers SET status = ? WHERE confirm_token = ?')
    .bind('unsubscribed', token)
    .run();

  return htmlPage(
    'Unsubscribed',
    `<h1>Unsubscribed</h1>
     <p>You&apos;ve been removed from The Daily Viral Brief. No more emails from us.</p>
     <a href="${SITE_URL}">← Back to MostViewed.today</a>`
  );
}
