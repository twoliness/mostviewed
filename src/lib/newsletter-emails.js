import { sendCloudflareEmail } from '@/lib/cloudflare-email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mostviewed.today';

export function buildConfirmUrl(token) {
  return `${SITE_URL}/api/newsletter/confirm?token=${token}`;
}

export function buildUnsubscribeUrl(token) {
  return `${SITE_URL}/api/newsletter/unsubscribe?token=${token}`;
}

export async function sendConfirmationEmail({ to, token }) {
  const confirmUrl = buildConfirmUrl(token);

  const subject = 'Confirm your subscription to The Daily Viral Brief';

  const text = `Hey,

Thanks for subscribing to The Daily Viral Brief.

Please confirm your email to start receiving quick updates on what's breaking out on YouTube — videos, Shorts, creators, and patterns worth watching.

Confirm your subscription:
${confirmUrl}

See you in the next brief,
MostViewed.today

If you didn't sign up for this, you can ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden;">
<tr><td style="padding:24px 32px 8px;border-bottom:1px solid #e5e5e5;">
<span style="font-size:14px;font-weight:600;color:#1a1a1a;">mostviewed</span><span style="font-size:14px;font-weight:600;color:#c2410c;">.today</span>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;">Hey,</p>
<p style="margin:0 0 16px;font-size:14px;color:#404040;line-height:1.6;">Thanks for subscribing to <strong>The Daily Viral Brief</strong>.</p>
<p style="margin:0 0 24px;font-size:14px;color:#404040;line-height:1.6;">Please confirm your email to start receiving quick updates on what's breaking out on YouTube — videos, Shorts, creators, and patterns worth watching.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="background:#1a1a1a;border-radius:6px;">
<a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Confirm subscription</a>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:#737373;">Or copy this link into your browser:</p>
<p style="margin:0 0 32px;font-size:12px;color:#a3a3a3;word-break:break-all;">${confirmUrl}</p>
<p style="margin:0 0 4px;font-size:14px;color:#404040;">See you in the next brief,</p>
<p style="margin:0;font-size:14px;font-weight:600;color:#1a1a1a;">MostViewed.today</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#fafaf9;border-top:1px solid #e5e5e5;font-size:11px;color:#a3a3a3;">
If you didn't sign up for this, you can ignore this email.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return sendCloudflareEmail({ to, subject, text, html });
}

export async function sendBriefEmail({ to, token, briefText, briefHtml, briefSubject }) {
  const unsubscribeUrl = buildUnsubscribeUrl(token);
  const text = briefText.replace('{{UNSUBSCRIBE_LINK}}', unsubscribeUrl);
  const html = briefHtml.replace('{{UNSUBSCRIBE_LINK}}', unsubscribeUrl);

  return sendCloudflareEmail({ to, subject: briefSubject, text, html });
}
