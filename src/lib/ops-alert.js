// Telegram ops alerter. One function — POST to the Telegram Bot API using the
// existing TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID secrets (also used by the
// social pipeline).
//
// Caller decides what's alert-worthy. No dedup, no batching — user explicitly
// asked for "every occurrence."

const TG_API = (token) => `https://api.telegram.org/bot${token}/sendMessage`;

export async function sendOpsAlert(env, { title, lines = [], context = {} }) {
  // Dedicated watchdog bot keeps ops alerts out of the social channel.
  // Falls back to the social bot only if WATCHDOG_* aren't set (e.g. local).
  const token  = env.WATCHDOG_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  const chatId = env.WATCHDOG_TELEGRAM_CHAT_ID   || env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[ops-alert] missing WATCHDOG_TELEGRAM_BOT_TOKEN / CHAT_ID — alert skipped');
    return { skipped: true };
  }

  const ctxLines = Object.entries(context).map(([k, v]) => `• ${k}: ${v}`);
  const text = [
    `🚨 *${escape(title)}*`,
    ...lines.map(l => escape(l)),
    ...(ctxLines.length ? ['', '*Context*', ...ctxLines.map(escape)] : []),
    '',
    `_${escape(new Date().toISOString())}_`,
  ].join('\n');

  try {
    const res = await fetch(TG_API(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[ops-alert] Telegram POST failed', res.status, body);
      return { ok: false, status: res.status, body };
    }
    return { ok: true };
  } catch (err) {
    console.error('[ops-alert] fetch threw', err);
    return { ok: false, error: err?.message };
  }
}

// MarkdownV2 reserves a wide set of chars — escape them so titles/error
// messages containing `_`, `*`, `(`, `.` etc. don't break the parse.
function escape(s) {
  return String(s).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
