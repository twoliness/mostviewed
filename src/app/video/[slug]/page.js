import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getVideoDetail } from '@/lib/video-detail';
import { maybeRefreshStaleVideo } from '@/lib/refresh-stale-video';
import {
  videoIdFromSlug, videoSlug, videoUrl,
  formatViewCount, formatViewCountShort,
  getYouTubeUrl,
} from '@/lib/utils';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import RankTimelineChart from '@/components/RankTimelineChart';

const BASE_URL = 'https://mostviewed.today';

const STALE_MS = 24 * 60 * 60 * 1000;

async function loadDetail(slug) {
  const id = videoIdFromSlug(slug);
  if (!id) return { id: null, detail: null, refresh: null };
  const { env } = getCloudflareContext();
  if (!env?.DB) return { id, detail: null, refresh: null };
  let detail = await getVideoDetail(env.DB, id);
  if (!detail) return { id, detail: null, refresh: null };

  // If the video is stale (off all charts for >24h), try to refresh view counts
  // from YouTube inline. Falls back silently to stale data on any failure.
  let refresh = null;
  const lastSeenMs = detail.summary?.last_seen ? Date.parse(detail.summary.last_seen) : null;
  const isStale = lastSeenMs ? (Date.now() - lastSeenMs) > STALE_MS : false;
  if (isStale) {
    refresh = await maybeRefreshStaleVideo(env, id);
    if (refresh?.refreshed) {
      // Re-fetch to pick up the new current_views/updated_at written by the refresh.
      detail = await getVideoDetail(env.DB, id);
    }
  }
  return { id, detail, refresh };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { detail } = await loadDetail(slug);
  if (!detail) return { title: 'Video not found · mostviewed.today' };
  const { video, summary } = detail;
  const canonicalPath = videoUrl(video);
  const peak = summary?.peak_rank ? `Peak Rank #${summary.peak_rank} — ` : '';
  const title = `${peak}${video.title} — ${video.channel_title} · mostviewed.today`;
  const description = summary
    ? `Peak rank #${summary.peak_rank ?? '—'}${summary.peak_rank_date ? ` on ${summary.peak_rank_date}` : ''}. ${formatViewCount(summary.current_views ?? 0)}. Tracked on Most Viewed Today.`
    : `${video.channel_title} — tracked on Most Viewed Today.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}${canonicalPath}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${canonicalPath}`,
      type: 'video.other',
      images: video.thumb_url ? [{ url: video.thumb_url, width: 1280, height: 720 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: video.thumb_url ? [video.thumb_url] : [],
    },
  };
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DAY_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FMT.format(d);
}

function formatShortDate(iso) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return DAY_FMT.format(d);
}

function timeAgoShort(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

// Per-chart stats derived from the rank_history + chart_totals already loaded.
function chartStats(chart, rankHistory, chartTotals) {
  const ct = chartTotals.find((c) => c.chart === chart);
  const series = rankHistory.filter((r) => r.chart === chart);
  if (!ct && series.length === 0) return null;
  const sortedAsc = series.slice().sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  const sortedDesc = series.slice().sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  const peak = ct?.peak_rank ?? Math.min(...series.map((r) => r.rank));
  const daysAtPeak = new Set(
    series.filter((r) => r.rank === peak).map((r) => r.captured_at.slice(0, 10))
  ).size;
  const daysOnChart = new Set(series.map((r) => r.captured_at.slice(0, 10))).size;
  const latest = sortedDesc[0];
  const latestMs = latest ? Date.parse(latest.captured_at) : null;
  const isCurrent = latestMs ? (Date.now() - latestMs) < 2 * 60 * 60 * 1000 : false;
  return {
    chart,
    peak,
    peakDate: series.find((r) => r.rank === peak)?.captured_at?.slice(0, 10),
    daysAtPeak,
    daysOnChart,
    appearances: ct?.appearances ?? series.length,
    firstSeen: ct?.first_seen ?? sortedAsc[0]?.captured_at,
    lastSeen: ct?.last_seen ?? sortedDesc[0]?.captured_at,
    currentRank: isCurrent ? latest?.rank : null,
    sortedAsc,
  };
}

// Build SVG path data for ONE chart series. Coordinates are in 0..w / 0..h.
function buildSvgPath(series, sharedMinRank, sharedMaxRank, w = 300, h = 90, padTop = 8, padBottom = 8) {
  if (series.length < 2) return null;
  const innerH = h - padTop - padBottom;
  const rankRange = Math.max(1, sharedMaxRank - sharedMinRank);
  const stepX = w / (series.length - 1);
  const pts = series.map((r, i) => {
    const x = Math.round(i * stepX);
    const y = padTop + Math.round(((r.rank - sharedMinRank) / rankRange) * innerH);
    return { x, y, rank: r.rank, captured_at: r.captured_at };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const polygon = `${pts[0].x},${h} ${polyline} ${pts[pts.length - 1].x},${h}`;
  const peakPt = pts.reduce((best, p) => (p.rank < best.rank ? p : best), pts[0]);
  return { polyline, polygon, peakPt, pts };
}

// Pretty-print a chart key for display, e.g. "category:10:videos" -> "Music · Videos".
const CATEGORY_NAME_BY_ID = {
  10: 'Music', 20: 'Gaming', 17: 'Sports', 24: 'Entertainment', 25: 'News',
  26: 'Howto', 23: 'Comedy', 22: 'People', 28: 'Tech', 1: 'Film', 2: 'Autos', 15: 'Pets',
};
function chartLabel(chart) {
  if (!chart) return '';
  if (chart === 'global:videos') return 'Global · Videos';
  if (chart === 'global:shorts') return 'Global · Shorts';
  const cat = chart.match(/^category:(\d+):(videos|shorts)$/);
  if (cat) return `${CATEGORY_NAME_BY_ID[Number(cat[1])] || `Cat ${cat[1]}`} · ${cat[2] === 'videos' ? 'Videos' : 'Shorts'}`;
  const country = chart.match(/^country:([A-Z]{2})(?::(.*))?$/);
  if (country) return `${country[1]}${country[2] ? ' · ' + country[2] : ''}`;
  return chart;
}

export default async function VideoDetailPage({ params }) {
  const { slug } = await params;
  const { id, detail, refresh } = await loadDetail(slug);
  if (!id) notFound();
  if (!detail) notFound();

  const canonical = videoSlug(detail.video);
  if (canonical !== slug) redirect(`/video/${canonical}`);

  const { video, summary, creator, rank_history, chart_totals, more_from_creator } = detail;
  const category = POPULAR_CATEGORIES_DISPLAY.find((c) => c.id === video.category_id);
  const youtubeUrl = getYouTubeUrl(video.id);
  const embedUrl = `https://www.youtube.com/embed/${video.id}`;
  const isShort = !!video.is_short;
  const globalChartKey = isShort ? 'global:shorts' : 'global:videos';
  const categoryChartKey = video.category_id
    ? `category:${video.category_id}:${isShort ? 'shorts' : 'videos'}` : null;
  const globalStats = chartStats(globalChartKey, rank_history, chart_totals);
  const categoryStats = categoryChartKey ? chartStats(categoryChartKey, rank_history, chart_totals) : null;
  // Build a shared-axis overlay if either chart has enough data.
  const allSeries = [
    ...(globalStats?.sortedAsc ?? []),
    ...(categoryStats?.sortedAsc ?? []),
  ];
  const sharedMin = allSeries.length ? Math.min(...allSeries.map((r) => r.rank)) : 1;
  const sharedMax = allSeries.length ? Math.max(...allSeries.map((r) => r.rank)) : 1;
  const globalPath = globalStats ? buildSvgPath(globalStats.sortedAsc, sharedMin, sharedMax) : null;
  const categoryPath = categoryStats ? buildSvgPath(categoryStats.sortedAsc, sharedMin, sharedMax) : null;
  const firstAll = allSeries.length
    ? formatShortDate(allSeries.map((r) => r.captured_at).sort()[0]) : null;
  const lastAll = allSeries.length
    ? formatShortDate(allSeries.map((r) => r.captured_at).sort().slice(-1)[0]) : null;
  // "Off chart" = video isn't currently ranked anywhere we track. last_seen
  // tells us when it last appeared on a chart — never bumped by the inline
  // YouTube refresh, so it stays as the chart-presence end date.
  const lastSeenMs = summary?.last_seen ? Date.parse(summary.last_seen) : null;
  const isOffChart = !(globalStats?.currentRank || categoryStats?.currentRank)
    || (lastSeenMs ? (Date.now() - lastSeenMs) > STALE_MS : false);
  // updated_at IS bumped by the YouTube refresh, so "Total views" recency
  // reflects the latest refresh, not the last chart appearance. A video is
  // "fresh" if updated_at is meaningfully after last_seen — that means a
  // YouTube refresh has happened.
  const viewsUpdatedAgo = timeAgoShort(summary?.updated_at);
  const updatedMs = summary?.updated_at ? Date.parse(summary.updated_at) : null;
  const viewsAreFresh = isOffChart && updatedMs && lastSeenMs
    && (updatedMs - lastSeenMs) > 60 * 60 * 1000; // updated >1h after going off chart = refreshed
  const currentRankAgo = isOffChart
    ? `off chart since ${formatShortDate(summary.last_seen)}`
    : timeAgoShort(summary?.updated_at);
  const viewsAsOf = !isOffChart
    ? 'all-time'
    : (viewsAreFresh ? `refreshed ${viewsUpdatedAgo}` : `as of ${formatShortDate(summary.last_seen)}`);
  const isTrending = !isOffChart && (summary?.current_rank ?? 999) <= 10;
  // Historical tracking window (B).
  const trackedWindow = (summary?.first_seen && summary?.last_seen)
    ? `${formatShortDate(summary.first_seen)} → ${formatShortDate(summary.last_seen)}`
    : null;

  return (
    <div className="bg-secondary/40 min-h-screen text-foreground">
      <main className="mx-auto max-w-[680px] px-4 pb-20 pt-3">
        {/* Hero card with YouTube embed */}
        <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={embedUrl}
              title={video.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <div className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {isTrending ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
                  🔥 Trending Now
                </span>
              ) : null}
              {category ? (
                <Link
                  href={`/category/${category.slug}`}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {category.name}
                </Link>
              ) : null}
              {summary?.last_seen && (Date.now() - new Date(summary.last_seen).getTime()) < 4 * 60 * 60 * 1000 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              ) : null}
            </div>
            <h1 className="text-[17px] font-extrabold leading-snug text-foreground">{video.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <span>{video.channel_title}</span>
              {video.published_at ? <><span>·</span><span>{formatDate(video.published_at)}</span></> : null}
              <span>·</span>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                Watch on YouTube ↗
              </a>
            </div>
          </div>
        </section>

        {/* Tracking-window note for off-chart videos (B) */}
        {isOffChart && trackedWindow ? (
          <section className="mb-3 rounded-xl border border-amber-300/40 bg-amber-50/50 p-3 text-[12px] text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="font-semibold">Tracked {trackedWindow}</span> — view count
            {viewsAreFresh
              ? ' refreshed live from YouTube.'
              : ' frozen at the last chart appearance; YouTube totals today may be higher.'}
          </section>
        ) : null}

        {/* Core stat grid — matches the reference mockup layout. Numbers now
            come from per-chart stats (globalStats / categoryStats) so they
            reconcile with the leaderboard. Picks the chart with stronger
            signal: current rank if active globally; otherwise category. */}
        <section className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border">
          {(() => {
            // Prefer global stats; fall back to category if global has no data.
            const primary = globalStats || categoryStats;
            const isCurrent = primary?.currentRank != null;
            return (
              <>
                <StatCell
                  label="Current Rank"
                  value={isCurrent ? `#${primary.currentRank}` : 'Off chart'}
                  valueClass={isCurrent ? '' : 'text-muted-foreground'}
                  sub={isCurrent
                    ? `${chartLabel(primary.chart)} · ${viewsUpdatedAgo}`
                    : (primary?.lastSeen ? `since ${formatShortDate(primary.lastSeen)}` : null)}
                />
                <StatCell
                  label="Total Views"
                  value={formatViewCountShort(summary?.current_views ?? 0)}
                  sub={viewsAsOf}
                />
                <StatCell
                  label="Peak Rank"
                  value={primary?.peak ? `#${primary.peak}` : '—'}
                  valueClass="text-brand"
                  sub={primary?.peakDate
                    ? `${formatShortDate(primary.peakDate)} · ${chartLabel(primary.chart)}`
                    : null}
                />
                <StatCell
                  label="Days on Chart"
                  value={String(primary?.daysOnChart ?? 0)}
                  sub={isCurrent ? 'and counting' : null}
                />
              </>
            );
          })()}
        </section>

        {/* Rank timeline — shows global + category series when available */}
        <section className="mb-3 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rank timeline
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {globalPath ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-brand" />
                  Global
                </span>
              ) : null}
              {categoryPath ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
                  {chartLabel(categoryStats.chart)}
                </span>
              ) : null}
            </div>
          </div>

          {(globalPath || categoryPath) ? (
            <RankTimelineChart
              globalSeries={globalStats?.sortedAsc ?? []}
              categorySeries={categoryStats?.sortedAsc ?? []}
              categoryLabel={categoryStats ? chartLabel(categoryStats.chart) : 'Category'}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">
              Not enough rank history yet to draw a timeline.
            </div>
          )}

          {/* Summary pills (per reference mockup) */}
          {(() => {
            const primary = globalStats || categoryStats;
            if (!primary) return null;
            return (
              <div className="mt-4 flex flex-wrap gap-1.5">
                <SummaryPill value={`#${primary.peak}`} label="Peak rank" highlight />
                <SummaryPill value={String(primary.daysOnChart)} label="Days on chart" />
                <SummaryPill value={primary.daysAtPeak ? `${primary.daysAtPeak}d` : '—'} label={`At #${primary.peak}`} />
              </div>
            );
          })()}
        </section>

        {/* More from creator */}
        {more_from_creator?.length > 0 ? (
          <section className="mb-3 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              More from {video.channel_title}
            </div>
            <ul>
              {more_from_creator.map((v) => (
                <li key={v.id} className="border-b border-border/50 last:border-b-0">
                  <Link
                    href={`/video/${videoSlug(v)}`}
                    prefetch={false}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-secondary/50"
                  >
                    {v.thumb_url ? (
                      // YouTube thumbnails are always 16:9 (see youtube-api-quirks memory),
                      // so render all rows in a wide aspect regardless of is_short.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumb_url}
                        alt=""
                        className="h-[44px] w-[72px] flex-shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-[44px] w-[72px] flex-shrink-0 rounded bg-secondary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-foreground">{v.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        {v.peak_rank ? <span className="font-semibold text-brand">Peak #{v.peak_rank}</span> : null}
                        {v.days_on_chart ? <span>{v.days_on_chart} days</span> : null}
                        {v.current_views ? <span>{formatViewCountShort(v.current_views)} views</span> : null}
                      </div>
                    </div>
                    {v.current_rank && v.last_seen && (Date.now() - Date.parse(v.last_seen)) < 2 * 60 * 60 * 1000 ? (
                      <span className="flex-shrink-0 rounded-md bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
                        Now #{v.current_rank}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function RankCard({ label, stats, accent }) {
  const accentClass = accent === 'blue' ? 'text-sky-600 dark:text-sky-400' : 'text-brand';
  const isCurrent = stats.currentRank != null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        {isCurrent ? (
          <span className="text-[10px] font-medium text-emerald-600">live</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">off chart</span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</div>
          <div className={`text-[22px] font-bold leading-none ${isCurrent ? accentClass : 'text-muted-foreground'}`}>
            {isCurrent ? `#${stats.currentRank}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak</div>
          <div className={`text-[22px] font-bold leading-none ${accentClass}`}>
            #{stats.peak}
          </div>
          {stats.peakDate ? (
            <div className="mt-0.5 text-[10px] text-muted-foreground">{formatShortDate(stats.peakDate)}</div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span><span className="font-semibold text-foreground">{stats.daysOnChart}</span> days on chart</span>
        <span><span className="font-semibold text-foreground">{stats.daysAtPeak || 0}d</span> at #{stats.peak}</span>
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, valueClass = '' }) {
  return (
    <div className="bg-card p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[20px] font-bold leading-none ${valueClass}`}>{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function SummaryPill({ value, label, highlight }) {
  return (
    <div className={`flex-1 min-w-[100px] rounded-lg px-3 py-2 text-center ${highlight ? 'bg-brand/10' : 'border border-border bg-secondary/50'}`}>
      <div className={`text-[16px] font-extrabold ${highlight ? 'text-brand' : 'text-foreground'}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
