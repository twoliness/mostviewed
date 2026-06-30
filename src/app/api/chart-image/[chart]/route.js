import { ImageResponse } from 'next/og';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export const runtime = 'edge';

const CHART_CONFIG = {
  global:        { label: 'GLOBAL TOP 10',        chart: 'global:videos',       emoji: '🌍' },
  music:         { label: 'MUSIC TOP 10',          chart: 'category:10:videos',  emoji: '🎵' },
  entertainment: { label: 'ENTERTAINMENT TOP 10',  chart: 'category:24:videos',  emoji: '🎬' },
  gaming:        { label: 'GAMING TOP 10',         chart: 'category:20:videos',  emoji: '🎮' },
};

const BRAND    = '#00ff7f';
const BG       = '#0a0a0a';
const CARD     = '#141414';
const DIVIDER  = '#222222';
const WHITE    = '#ffffff';
const GRAY     = '#888888';

function fmtViews(n) {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function fmtWeekDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export async function GET(request, { params }) {
  const { chart: chartKey } = await params;
  const config = CHART_CONFIG[chartKey];
  if (!config) {
    return new Response('Unknown chart', { status: 404 });
  }

  // Fetch fonts
  const [boldFont, regularFont] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2').then(r => r.arrayBuffer()),
  ]).catch(() => [null, null]);

  const context = getCloudflareContext();
  const db = new DatabaseService(context.env.DB);
  const videos = await db._chartLeaderboard(config.chart, 10);

  const weekDate = fmtWeekDate();

  const fontConfig = boldFont && regularFont ? [
    { name: 'Inter', data: boldFont,   weight: 700, style: 'normal' },
    { name: 'Inter', data: regularFont, weight: 400, style: 'normal' },
  ] : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: 800,
          height: 1040,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif',
          background: BG,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: BRAND,
            display: 'flex',
            flexDirection: 'column',
            padding: '28px 36px 24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Logo bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                <div style={{ width: 6, height: 10, background: '#000', borderRadius: 1 }} />
                <div style={{ width: 6, height: 16, background: '#000', borderRadius: 1 }} />
                <div style={{ width: 6, height: 22, background: '#000', borderRadius: 1 }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#000', letterSpacing: -0.5 }}>
                mostviewed.today
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 10, fontWeight: 400, color: '#000', letterSpacing: 1.5, opacity: 0.6 }}>
                CHART DATED
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#000', letterSpacing: 0.5 }}>
                {weekDate}
              </span>
            </div>
          </div>

          {/* Chart title box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '3px solid #000',
              padding: '12px 20px',
            }}
          >
            <span style={{ fontSize: 42, fontWeight: 700, color: '#000', letterSpacing: -1, lineHeight: 1 }}>
              {config.label}
            </span>
            <span style={{ fontSize: 42, lineHeight: 1 }}>{config.emoji}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 400, color: '#000', opacity: 0.6, letterSpacing: 1 }}>
            MOST VIEWED VIDEOS THIS WEEK · mostviewed.today
          </div>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: BG }}>
          {/* Column headers */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 36px',
              borderBottom: `1px solid ${DIVIDER}`,
            }}
          >
            <div style={{ width: 52 }} />
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: GRAY, letterSpacing: 1.5 }}>
              TITLE / CHANNEL
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, letterSpacing: 1.5 }}>
              VIEWS
            </div>
          </div>

          {videos.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: GRAY, fontSize: 16 }}>
              No data yet — check back soon
            </div>
          ) : (
            videos.slice(0, 10).map((v, i) => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 36px',
                  borderBottom: `1px solid ${DIVIDER}`,
                  background: i === 0 ? CARD : BG,
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: 52,
                    fontSize: i === 0 ? 32 : 24,
                    fontWeight: 700,
                    color: i === 0 ? BRAND : WHITE,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {v.rank ?? i + 1}
                </div>

                {/* Title + channel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, paddingRight: 16 }}>
                  <span
                    style={{
                      fontSize: i === 0 ? 15 : 14,
                      fontWeight: 700,
                      color: WHITE,
                      lineHeight: 1.3,
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                    }}
                  >
                    {truncate(v.title, 58)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: GRAY }}>
                    {truncate(v.channel_title, 40)}
                  </span>
                </div>

                {/* Views */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: i === 0 ? 18 : 16,
                      fontWeight: 700,
                      color: i === 0 ? BRAND : WHITE,
                    }}
                  >
                    {fmtViews(v.view_count)}
                  </span>
                  <span style={{ fontSize: 10, color: GRAY, letterSpacing: 0.5 }}>VIEWS</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 36px',
            background: CARD,
            borderTop: `1px solid ${DIVIDER}`,
          }}
        >
          <span style={{ fontSize: 11, color: GRAY }}>mostviewed.today</span>
          <span style={{ fontSize: 11, color: GRAY }}>Data refreshed every 30 minutes · YouTube trending chart</span>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 1040,
      fonts: fontConfig,
    },
  );
}
