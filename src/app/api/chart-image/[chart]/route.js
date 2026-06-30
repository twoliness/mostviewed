import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export const dynamic = 'force-dynamic';

const CHART_CONFIG = {
  global:        { label: 'GLOBAL TOP 10',        chart: 'global:videos',       emoji: '🌍' },
  music:         { label: 'MUSIC TOP 10',          chart: 'category:10:videos',  emoji: '🎵' },
  entertainment: { label: 'ENTERTAINMENT TOP 10',  chart: 'category:24:videos',  emoji: '🎬' },
  gaming:        { label: 'GAMING TOP 10',         chart: 'category:20:videos',  emoji: '🎮' },
};

const W = 800;
const H = 1040;
const HEADER_H = 220;
const ROW_H = 64;
const ROW_PADDING_X = 36;
const FOOTER_H = 36;
const COLHEADER_H = 36;

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
  const fontFamily = 'Helvetica, Arial, sans-serif';

  return `
    ${isTop ? `<rect x="0" y="${y}" width="${W}" height="${ROW_H}" fill="#141414"/>` : ''}
    <text x="${ROW_PADDING_X}" y="${y + 38}" font-family="${fontFamily}" font-size="${isTop ? 30 : 22}" font-weight="800" fill="${isTop ? '#00ff7f' : '#ffffff'}">${rank}</text>
    <text x="${ROW_PADDING_X + 56}" y="${y + 26}" font-family="${fontFamily}" font-size="${isTop ? 15 : 14}" font-weight="700" fill="#ffffff">${esc(truncate(v.title || '', 50).toUpperCase())}</text>
    <text x="${ROW_PADDING_X + 56}" y="${y + 46}" font-family="${fontFamily}" font-size="11" font-weight="400" fill="#888888">${esc(truncate(v.channel_title || '', 38))}</text>
    <text x="${W - ROW_PADDING_X}" y="${y + 30}" font-family="${fontFamily}" font-size="${isTop ? 18 : 16}" font-weight="800" fill="${isTop ? '#00ff7f' : '#ffffff'}" text-anchor="end">${fmtViews(v.view_count)}</text>
    <text x="${W - ROW_PADDING_X}" y="${y + 46}" font-family="${fontFamily}" font-size="9" font-weight="600" fill="#888888" text-anchor="end" letter-spacing="1">VIEWS</text>
    <line x1="0" y1="${y + ROW_H}" x2="${W}" y2="${y + ROW_H}" stroke="#222222" stroke-width="1"/>
  `;
}

function renderSvg(config, videos, weekDate) {
  const fontFamily = 'Helvetica, Arial, sans-serif';

  const rows = (videos.length === 0)
    ? `<text x="${W / 2}" y="${HEADER_H + COLHEADER_H + 200}" font-family="${fontFamily}" font-size="16" fill="#888888" text-anchor="middle">No data yet — check back soon</text>`
    : videos.slice(0, 10).map(renderRow).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>

  <!-- Header (brand green) -->
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#00ff7f"/>

  <!-- Tiny logo bars -->
  <rect x="${ROW_PADDING_X}" y="38" width="6" height="10" fill="#000000"/>
  <rect x="${ROW_PADDING_X + 10}" y="32" width="6" height="16" fill="#000000"/>
  <rect x="${ROW_PADDING_X + 20}" y="26" width="6" height="22" fill="#000000"/>
  <text x="${ROW_PADDING_X + 38}" y="46" font-family="${fontFamily}" font-size="18" font-weight="700" fill="#000000">mostviewed.today</text>

  <!-- Chart dated -->
  <text x="${W - ROW_PADDING_X}" y="32" font-family="${fontFamily}" font-size="10" font-weight="400" fill="#000000" fill-opacity="0.6" letter-spacing="1.5" text-anchor="end">CHART DATED</text>
  <text x="${W - ROW_PADDING_X}" y="48" font-family="${fontFamily}" font-size="12" font-weight="700" fill="#000000" text-anchor="end">${esc(weekDate)}</text>

  <!-- Title box -->
  <rect x="${ROW_PADDING_X}" y="84" width="${W - ROW_PADDING_X * 2}" height="76" fill="none" stroke="#000000" stroke-width="3"/>
  <text x="${ROW_PADDING_X + 20}" y="138" font-family="${fontFamily}" font-size="40" font-weight="900" fill="#000000" letter-spacing="-1">${esc(config.label)}</text>
  <text x="${W - ROW_PADDING_X - 20}" y="138" font-size="40" text-anchor="end">${config.emoji}</text>

  <!-- Subtitle -->
  <text x="${ROW_PADDING_X}" y="190" font-family="${fontFamily}" font-size="12" font-weight="400" fill="#000000" fill-opacity="0.6" letter-spacing="1">MOST VIEWED VIDEOS THIS WEEK · mostviewed.today</text>

  <!-- Column headers -->
  <text x="${ROW_PADDING_X + 56}" y="${HEADER_H + 22}" font-family="${fontFamily}" font-size="10" font-weight="700" fill="#888888" letter-spacing="1.5">TITLE / CHANNEL</text>
  <text x="${W - ROW_PADDING_X}" y="${HEADER_H + 22}" font-family="${fontFamily}" font-size="10" font-weight="700" fill="#888888" letter-spacing="1.5" text-anchor="end">VIEWS</text>
  <line x1="0" y1="${HEADER_H + COLHEADER_H}" x2="${W}" y2="${HEADER_H + COLHEADER_H}" stroke="#222222" stroke-width="1"/>

  <!-- Rows -->
  ${rows}

  <!-- Footer -->
  <rect x="0" y="${H - FOOTER_H}" width="${W}" height="${FOOTER_H}" fill="#141414"/>
  <text x="${ROW_PADDING_X}" y="${H - 14}" font-family="${fontFamily}" font-size="11" fill="#888888">mostviewed.today</text>
  <text x="${W - ROW_PADDING_X}" y="${H - 14}" font-family="${fontFamily}" font-size="11" fill="#888888" text-anchor="end">Data refreshed every 30 min · YouTube trending chart</text>
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
