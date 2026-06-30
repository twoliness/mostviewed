const BASE_URL = 'https://mostviewed.today';

const CHARTS = [
  { key: 'global',        title: '🌍 Global Top 10 Most Viewed Videos' },
  { key: 'music',         title: '🎵 Music Top 10 Most Viewed Videos' },
  { key: 'entertainment', title: '🎬 Entertainment Top 10 Most Viewed Videos' },
  { key: 'gaming',        title: '🎮 Gaming Top 10 Most Viewed Videos' },
];

const CHART_KEY_TO_DB = {
  global:        'global:videos',
  music:         'category:10:videos',
  entertainment: 'category:24:videos',
  gaming:        'category:20:videos',
};

function fmtViewsShort(n) {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function escMd(s) {
  if (!s) return '';
  return String(s).replace(/([_*`\[\]()])/g, '\\$1');
}

function buildCaption(title, videos) {
  const top = videos.slice(0, 5).map((v, i) => {
    const rank = v.rank ?? i + 1;
    const t = (v.title || '').length > 50 ? v.title.slice(0, 49) + '…' : (v.title || '');
    return `*${rank}.* ${escMd(t)} — ${fmtViewsShort(v.view_count)}`;
  }).join('\n');

  return `${title}\nThis week's chart on mostviewed.today\n\n${top}\n\nFull chart: ${BASE_URL}/api/chart-image/${title.includes('Global') ? 'global' : title.includes('Music') ? 'music' : title.includes('Entertainment') ? 'entertainment' : 'gaming'}`;
}

async function sendChartToTelegram(botToken, chatId, chartKey, title, videos) {
  // Fetch the SVG image from our own endpoint
  const imageUrl = `${BASE_URL}/api/chart-image/${chartKey}`;
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    const body = await imageRes.text().catch(() => '');
    throw new Error(`Chart image fetch failed (${imageRes.status}): ${body.slice(0, 200)}`);
  }
  const imageBuffer = await imageRes.arrayBuffer();

  // Telegram sendPhoto requires PNG/JPEG/WebP. SVG → use sendDocument
  // with a caption. Recipients see a file with a preview that opens in their browser.
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', new Blob([imageBuffer], { type: 'image/svg+xml' }), `${chartKey}-top10.svg`);
  form.append('caption', buildCaption(title, videos));
  form.append('parse_mode', 'Markdown');

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: form,
  });

  const data = await tgRes.json();
  if (!data.ok) {
    throw new Error(`Telegram sendDocument failed for ${chartKey}: ${data.description}`);
  }
  return data;
}

export async function POST() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return Response.json({ error: 'Telegram env vars not configured' }, { status: 500 });
  }

  // Fetch chart data once for each chart for the caption
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { DatabaseService } = await import('@/lib/database');
  const { env } = await getCloudflareContext({ async: true });
  const db = new DatabaseService(env.DB);

  const results = [];
  for (const { key, title } of CHARTS) {
    try {
      const videos = await db._chartLeaderboard(CHART_KEY_TO_DB[key], 10);
      await sendChartToTelegram(botToken, chatId, key, title, videos);
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
