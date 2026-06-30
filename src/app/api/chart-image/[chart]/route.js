import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';
import { MVT_ICON_BASE64 } from '@/lib/mvt-icon-base64';

export const dynamic = 'force-dynamic';

const CHART_CONFIG = {
  global:        { label: 'GLOBAL TOP 10',         chart: 'global:videos',       emoji: '🌍' },
  music:         { label: 'MUSIC TOP 10',          chart: 'category:10:videos',  emoji: '🎵' },
  entertainment: { label: 'ENTERTAINMENT TOP 10',  chart: 'category:24:videos',  emoji: '🎬' },
  gaming:        { label: 'GAMING TOP 10',         chart: 'category:20:videos',  emoji: '🎮' },
};

const W = 800;
const H = 1040;
const HEADER_H = 240;
const ROW_H = 64;
const ROW_PADDING_X = 36;
const FOOTER_H = 36;
const COLHEADER_H = 36;

const BRAND     = '#F97316'; // orange
const HEADER_FG = '#ffffff';
const BG        = '#0a0a0a';
const CARD      = '#141414';
const DIVIDER   = '#222222';
const WHITE     = '#ffffff';
const GRAY      = '#888888';

const FONT_STACK = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
  .replace(/'/g, '&apos;'); // SVG attributes are double-quoted, so apostrophes need escaping for the inner quoting

function fmtViews(n) {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function fmtWeekDate() {
  return new Date()
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function renderRow(v, i) {
  const isTop = i === 0;
  const rank = v.rank ?? i + 1;
  const y = HEADER_H + COLHEADER_H + i * ROW_H;

  return `
    ${isTop ? `<rect x="0" y="${y}" width="${W}" height="${ROW_H}" fill="${CARD}"/>` : ''}
    <text x="${ROW_PADDING_X}" y="${y + 38}" font-size="${isTop ? 30 : 22}" font-weight="800" fill="${isTop ? BRAND : WHITE}">${rank}</text>
    <text x="${ROW_PADDING_X + 56}" y="${y + 26}" font-size="${isTop ? 15 : 14}" font-weight="700" fill="${WHITE}">${esc(truncate(v.title || '', 50).toUpperCase())}</text>
    <text x="${ROW_PADDING_X + 56}" y="${y + 46}" font-size="11" font-weight="400" fill="${GRAY}">${esc(truncate(v.channel_title || '', 38))}</text>
    <text x="${W - ROW_PADDING_X}" y="${y + 30}" font-size="${isTop ? 18 : 16}" font-weight="800" fill="${isTop ? BRAND : WHITE}" text-anchor="end">${fmtViews(v.view_count)}</text>
    <text x="${W - ROW_PADDING_X}" y="${y + 46}" font-size="9" font-weight="600" fill="${GRAY}" text-anchor="end" letter-spacing="1">VIEWS</text>
    <line x1="0" y1="${y + ROW_H}" x2="${W}" y2="${y + ROW_H}" stroke="${DIVIDER}" stroke-width="1"/>
  `;
}

function renderSvg(config, videos, weekDate) {
  const rows = (videos.length === 0)
    ? `<text x="${W / 2}" y="${HEADER_H + COLHEADER_H + 200}" font-size="16" fill="${GRAY}" text-anchor="middle">No data yet — check back soon</text>`
    : videos.slice(0, 10).map(renderRow).join('');

  const logoDataUrl = `data:image/png;base64,${MVT_ICON_BASE64}`;

  // Inter font is loaded via @import — works in browsers that have outbound
  // network access. Falls back gracefully to Helvetica/Arial otherwise.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT_STACK}">
  <defs>
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&amp;display=swap');
      text { font-family: ${FONT_STACK.replace(/&apos;/g, "'")}; }
    </style>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Header (brand orange) -->
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="${BRAND}"/>

  <!-- Logo (mvt-icon.png embedded) + wordmark -->
  <image href="${logoDataUrl}" xlink:href="${logoDataUrl}" x="${ROW_PADDING_X}" y="22" width="40" height="40"/>
  <text x="${ROW_PADDING_X + 50}" y="50" font-size="20" font-weight="800" fill="${HEADER_FG}" letter-spacing="-0.3">mostviewed<tspan font-weight="400" fill-opacity="0.85">.today</tspan></text>

  <!-- Chart dated -->
  <text x="${W - ROW_PADDING_X}" y="38" font-size="10" font-weight="500" fill="${HEADER_FG}" fill-opacity="0.75" letter-spacing="1.5" text-anchor="end">CHART DATED</text>
  <text x="${W - ROW_PADDING_X}" y="56" font-size="13" font-weight="700" fill="${HEADER_FG}" text-anchor="end">${esc(weekDate)}</text>

  <!-- Title box -->
  <rect x="${ROW_PADDING_X}" y="92" width="${W - ROW_PADDING_X * 2}" height="84" fill="none" stroke="${HEADER_FG}" stroke-width="3"/>
  <text x="${ROW_PADDING_X + 22}" y="150" font-size="44" font-weight="900" fill="${HEADER_FG}" letter-spacing="-1.5">${esc(config.label)}</text>
  <text x="${W - ROW_PADDING_X - 22}" y="150" font-size="44" text-anchor="end">${config.emoji}</text>

  <!-- Subtitle -->
  <text x="${ROW_PADDING_X}" y="206" font-size="12" font-weight="500" fill="${HEADER_FG}" fill-opacity="0.75" letter-spacing="1.5">MOST VIEWED VIDEOS THIS WEEK · mostviewed.today</text>

  <!-- Column headers -->
  <text x="${ROW_PADDING_X + 56}" y="${HEADER_H + 22}" font-size="10" font-weight="700" fill="${GRAY}" letter-spacing="1.5">TITLE / CHANNEL</text>
  <text x="${W - ROW_PADDING_X}" y="${HEADER_H + 22}" font-size="10" font-weight="700" fill="${GRAY}" letter-spacing="1.5" text-anchor="end">VIEWS</text>
  <line x1="0" y1="${HEADER_H + COLHEADER_H}" x2="${W}" y2="${HEADER_H + COLHEADER_H}" stroke="${DIVIDER}" stroke-width="1"/>

  <!-- Rows -->
  ${rows}

  <!-- Footer -->
  <rect x="0" y="${H - FOOTER_H}" width="${W}" height="${FOOTER_H}" fill="${CARD}"/>
  <text x="${ROW_PADDING_X}" y="${H - 14}" font-size="11" fill="${GRAY}">mostviewed.today</text>
  <text x="${W - ROW_PADDING_X}" y="${H - 14}" font-size="11" fill="${GRAY}" text-anchor="end">Data refreshed every 30 min · YouTube trending chart</text>
</svg>`;
}

export async function GET(request, { params }) {
  const { chart: chartKey } = await params;
  const config = CHART_CONFIG[chartKey];
  if (!config) return new Response('Unknown chart', { status: 404 });

  const context = getCloudflareContext();
  const db = new DatabaseService(context.env.DB);
  const videos = await db._chartLeaderboard(config.chart, 10);

  const svg = renderSvg(config, videos, fmtWeekDate());

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
