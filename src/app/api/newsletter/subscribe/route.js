import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sendConfirmationEmail } from '@/lib/newsletter-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = String(body?.email || '').trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;

  const existing = await db
    .prepare('SELECT status, confirm_token FROM newsletter_subscribers WHERE email = ?')
    .bind(email)
    .first();

  let token;

  if (existing) {
    if (existing.status === 'active') {
      return Response.json({ message: 'already_subscribed' }, { status: 200 });
    }

    // pending or unsubscribed — refresh token and resend confirmation
    token = crypto.randomUUID();
    await db
      .prepare(
        'UPDATE newsletter_subscribers SET status = ?, confirm_token = ? WHERE email = ?'
      )
      .bind('pending', token, email)
      .run();
  } else {
    token = crypto.randomUUID();
    await db
      .prepare(
        'INSERT INTO newsletter_subscribers (email, status, confirm_token) VALUES (?, ?, ?)'
      )
      .bind(email, 'pending', token)
      .run();
  }

  const emailResult = await sendConfirmationEmail({ to: email, token });

  await db
    .prepare(
      'INSERT INTO newsletter_sends (subscriber_email, type, status) VALUES (?, ?, ?)'
    )
    .bind(email, 'confirmation', emailResult.success ? 'sent' : 'failed')
    .run();

  if (!emailResult.success) {
    console.error('[newsletter/subscribe] confirmation email failed:', emailResult.error);
  }

  return Response.json({ success: true });
}
