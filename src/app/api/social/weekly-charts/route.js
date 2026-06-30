const BASE_URL = 'https://mostviewed.today';

const CHARTS = [
  { key: 'global',        caption: '🌍 *Global Top 10 Most Viewed Videos*\nThis week\'s most-watched YouTube videos worldwide — mostviewed.today' },
  { key: 'music',         caption: '🎵 *Music Top 10 Most Viewed Videos*\nThis week\'s top music videos on YouTube — mostviewed.today' },
  { key: 'entertainment', caption: '🎬 *Entertainment Top 10 Most Viewed Videos*\nThis week\'s top entertainment videos on YouTube — mostviewed.today' },
  { key: 'gaming',        caption: '🎮 *Gaming Top 10 Most Viewed Videos*\nThis week\'s top gaming videos on YouTube — mostviewed.today' },
];

async function sendChartToTelegram(botToken, chatId, chartKey, caption) {
  // Fetch the PNG image from our own endpoint
  const imageUrl = `${BASE_URL}/api/chart-image/${chartKey}`;
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    const body = await imageRes.text().catch(() => '');
    throw new Error(`Chart image fetch failed (${imageRes.status}): ${body.slice(0, 200)}`);
  }
  const imageBuffer = await imageRes.arrayBuffer();

  // Upload directly to Telegram as multipart — avoids Telegram having to fetch our URL
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('photo', new Blob([imageBuffer], { type: 'image/png' }), `${chartKey}-top10.png`);
  form.append('caption', caption);
  form.append('parse_mode', 'Markdown');

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: form,
  });

  const data = await tgRes.json();
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
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[weekly-charts] Error posting ${key}:`, err.message);
      results.push({ chart: key, ok: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.ok);
  return Response.json({ success: allOk, results });
}
