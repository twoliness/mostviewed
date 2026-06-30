const BASE_URL = 'https://mostviewed.today';

const CHARTS = [
  { key: 'global',        caption: '🌍 *Global Top 10 Most Viewed Videos*\nThis week\'s most-watched YouTube videos worldwide on mostviewed.today' },
  { key: 'music',         caption: '🎵 *Music Top 10 Most Viewed Videos*\nThis week\'s top music videos on YouTube — mostviewed.today' },
  { key: 'entertainment', caption: '🎬 *Entertainment Top 10 Most Viewed Videos*\nThis week\'s top entertainment videos on YouTube — mostviewed.today' },
  { key: 'gaming',        caption: '🎮 *Gaming Top 10 Most Viewed Videos*\nThis week\'s top gaming videos on YouTube — mostviewed.today' },
];

async function sendChartToTelegram(botToken, chatId, chartKey, caption) {
  const imageUrl = `${BASE_URL}/api/chart-image/${chartKey}`;
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: imageUrl,
      caption,
      parse_mode: 'Markdown',
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram sendPhoto failed for ${chartKey}: ${data.description}`);
  }
  return data;
}

export async function POST() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return Response.json({ error: 'Telegram env vars not configured' }, { status: 500 });
  }

  const results = [];
  for (const { key, caption } of CHARTS) {
    try {
      await sendChartToTelegram(botToken, chatId, key, caption);
      results.push({ chart: key, ok: true });
      // Small delay between posts
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[weekly-charts] Error posting ${key}:`, err.message);
      results.push({ chart: key, ok: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.ok);
  return Response.json({ success: allOk, results });
}
