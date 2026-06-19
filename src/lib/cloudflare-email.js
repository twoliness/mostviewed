import { getCloudflareContext } from '@opennextjs/cloudflare';

const DEFAULT_BINDING_NAMES = ['EMAIL', 'EMAIL_SENDER'];

async function resolveEmailBinding() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    for (const name of DEFAULT_BINDING_NAMES) {
      const binding = env?.[name];
      if (binding && typeof binding.send === 'function') {
        return { binding, bindingName: name };
      }
    }
  } catch {
    // Not in a Worker context (local dev)
  }
  return { binding: null, bindingName: '' };
}

function resolveFromAddress() {
  return {
    email: process.env.CLOUDFLARE_EMAIL_FROM || 'newsletter@mostviewed.today',
    name: process.env.CLOUDFLARE_EMAIL_FROM_NAME || 'MostViewed.today',
  };
}

function formatFromHeader(from) {
  const name = String(from?.name || '').trim();
  const email = String(from?.email || '').trim();
  return name ? `${name} <${email}>` : email;
}

function buildPayload({ to, subject, text, html }) {
  const from = resolveFromAddress();
  return {
    to,
    from,
    subject: String(subject || '').trim(),
    text: String(text || '').trim(),
    ...(html ? { html: String(html).trim() } : {}),
  };
}

async function sendWithBinding(binding, payload) {
  try {
    const result = await binding.send(payload);
    return { ok: true, result };
  } catch {
    try {
      const result = await binding.send({ ...payload, from: formatFromHeader(payload.from) });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err };
    }
  }
}

export async function sendCloudflareEmail({ to, subject, text, html }) {
  const recipient = String(to || '').trim();
  if (!recipient) return { success: false, error: 'Missing recipient' };

  const payload = buildPayload({ to: recipient, subject, text, html });

  const { binding, bindingName } = await resolveEmailBinding();
  if (binding) {
    const result = await sendWithBinding(binding, payload);
    if (result.ok) return { success: true, data: result.result, binding: bindingName };
    console.error('[cloudflare-email] binding send failed:', result.error?.message);
  }

  console.warn('[cloudflare-email] No email binding available — email not sent in local dev');
  return { success: false, error: 'Email binding not available' };
}
