import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { formatViewCountShort, videoUrl } from '@/lib/utils';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';

const CATEGORY_META = {
  10: { label: 'Music', className: 'bg-pink-500/10 text-pink-600' },
  20: { label: 'Gaming', className: 'bg-emerald-500/10 text-emerald-600' },
  17: { label: 'Sports', className: 'bg-amber-500/10 text-amber-700' },
  24: { label: 'Entertainment', className: 'bg-violet-500/10 text-violet-600' },
  25: { label: 'News & Politics', className: 'bg-sky-500/10 text-sky-600' },
  26: { label: 'Howto & Style', className: 'bg-rose-500/10 text-rose-600' },
  23: { label: 'Comedy', className: 'bg-orange-500/10 text-orange-600' },
  22: { label: 'People & Blogs', className: 'bg-purple-500/10 text-purple-600' },
  28: { label: 'Science & Tech', className: 'bg-blue-500/10 text-blue-600' },
  1: { label: 'Film', className: 'bg-indigo-500/10 text-indigo-600' },
  2: { label: 'Autos', className: 'bg-zinc-500/10 text-zinc-600' },
  15: { label: 'Pets', className: 'bg-lime-500/10 text-lime-600' },
};

const categoryNames = POPULAR_CATEGORIES_DISPLAY.reduce((acc, cat) => {
  acc[cat.id] = cat.name;
  return acc;
}, {});

function getCategoryBadge(categoryId) {
  const id = Number(categoryId);
  const fallbackLabel = categoryNames[id] || 'Category';
  return CATEGORY_META[id] || { label: fallbackLabel, className: 'bg-secondary text-muted-foreground' };
}

function formatDuration(duration) {
  if (!duration) return '0:00';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getStatus(rank) {
  if (rank === 1) return { label: 'Top trending', className: 'text-brand' };
  if (rank <= 5) return { label: 'Trending', className: 'text-muted-foreground' };
  return { label: 'Rising', className: 'text-muted-foreground' };
}

const TABLE_COLS = 'grid-cols-[36px_80px_1fr_100px] md:grid-cols-[40px_84px_1fr_120px_110px]';

function LoadingRows() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={`grid ${TABLE_COLS} items-center gap-4 border-b border-border bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground`}>
        <div className="text-center">#</div>
        <div>Thumb</div>
        <div>Title</div>
        <div className="hidden md:block">Category</div>
        <div className="text-right">Views today</div>
      </div>
      <ul>
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className={`grid ${TABLE_COLS} items-center gap-4 border-b border-border px-3 py-2.5 last:border-b-0`}>
            <div className="mx-auto h-5 w-5 animate-pulse rounded-full bg-secondary" />
            <div className="h-[48px] w-[80px] animate-pulse rounded-md bg-secondary md:h-[48px] md:w-[84px]" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
            </div>
            <div className="hidden h-5 w-20 animate-pulse rounded bg-secondary md:block" />
            <div className="ml-auto h-5 w-14 animate-pulse rounded bg-secondary" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ModernChartRanking({
  videos,
  title,
  loading = false,
  error = null,
  lastUpdated = null,
  isShorts = false,
  metricKey = 'view_count',
  metricLabel = 'views today',
  secondaryMetricKey = null,
  secondaryMetricLabel = '',
}) {
  if (loading) return <LoadingRows />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load {title || 'leaderboard'}: {error}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No videos available yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={`grid ${TABLE_COLS} items-center gap-4 border-b border-border bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground`}>
        <div className="text-center">#</div>
        <div>Thumb</div>
        <div>Title</div>
        <div className="hidden md:block">Category</div>
        <div className="text-right">Views today</div>
      </div>

      <ul>
        {videos.map((video, index) => {
          const rank = index + 1;
          const badge = getCategoryBadge(video.category_id);
          const status = getStatus(rank);
          // Prefer views_today (from video_daily_stats.views_delta) when the
          // API supplies it — matches the "Views today" column label. Falls
          // back to lifetime view_count for legacy callers.
          const viewCount = Number(video?.views_today ?? video?.[metricKey] ?? 0);
          const secondaryValue = secondaryMetricKey ? Number(video?.[secondaryMetricKey] || 0) : null;

          return (
            <li key={video.id} className="border-b border-border last:border-b-0">
              <Link
                href={videoUrl(video)}
                prefetch={false}
                className={`group grid ${TABLE_COLS} items-center gap-4 px-3 py-2.5 transition-colors hover:bg-hover-row focus-visible:bg-hover-row focus-visible:outline-none`}
              >
                <div className="flex items-center justify-center">
                  {rank === 1 ? (
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-brand/12 text-[12px] font-semibold text-brand">
                      1
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium tabular-nums text-muted-foreground">
                      {rank}
                    </span>
                  )}
                </div>

                <div className="relative block">
                  <div
                    className={`relative overflow-hidden rounded-md ring-1 ring-border ${
                      isShorts
                        ? 'h-[72px] w-[42px] mx-auto'
                        : 'aspect-video w-full'
                    }`}
                  >
                    <Image
                      src={video.thumb_url}
                      alt={video.title}
                      fill
                      sizes={isShorts ? '42px' : '(max-width: 768px) 80px, 84px'}
                      className="object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 font-mono text-[9px] font-medium text-white">
                      {formatDuration(video.duration)}
                    </span>
                    <Play className="pointer-events-none absolute inset-0 m-auto h-4 w-4 fill-white text-white opacity-0 transition-opacity group-hover:opacity-90" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground group-hover:text-brand md:text-[14px]">
                    {video.title}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {video.channel_title}
                  </div>
                  <div className="mt-1.5 md:hidden">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-[13px] font-semibold tabular-nums md:text-[14px]">
                    {formatViewCountShort(viewCount)}
                  </div>
                  {secondaryMetricKey && (
                    <div className="text-[10px] text-muted-foreground">
                      {formatViewCountShort(secondaryValue)} {secondaryMetricLabel}
                    </div>
                  )}
                  <div className={`mt-0.5 text-[10px] font-medium uppercase tracking-wide ${status.className}`}>
                    {status.label}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center border-t border-border bg-secondary/40 px-3 py-2 text-[12px] text-muted-foreground">
        <span>Showing {videos.length}</span>
      </div>
    </div>
  );
}
