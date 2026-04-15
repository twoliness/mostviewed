import Image from 'next/image';
import { formatTimeAgo, formatViewCountShort, getYouTubeUrl } from '@/lib/utils';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';

const CATEGORY_META = {
  10: { label: 'Music', className: 'bg-rose-100 text-rose-700' },
  20: { label: 'Gaming', className: 'bg-indigo-100 text-indigo-700' },
  17: { label: 'Sports', className: 'bg-amber-100 text-amber-700' },
  24: { label: 'Entertainment', className: 'bg-fuchsia-100 text-fuchsia-700' },
  25: { label: 'News', className: 'bg-emerald-100 text-emerald-700' },
};

const categoryNames = POPULAR_CATEGORIES_DISPLAY.reduce((acc, category) => {
  acc[category.id] = category.name;
  return acc;
}, {});

function getCategoryBadge(categoryId) {
  const numericCategory = Number(categoryId);
  const fallbackLabel = categoryNames[numericCategory] || 'Category';
  const fallback = { label: fallbackLabel, className: 'bg-slate-100 text-slate-600' };
  return CATEGORY_META[numericCategory] || fallback;
}

function formatDuration(duration) {
  if (!duration) return '0:00';

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function LoadingRows({ isShorts = false }) {
  const rowClass = isShorts
    ? 'grid grid-cols-[28px_72px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[28px_88px_minmax(0,1fr)_auto] sm:items-center sm:gap-4'
    : 'grid grid-cols-[28px_112px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[28px_160px_minmax(0,1fr)_auto] sm:items-center sm:gap-4';

  const thumbClass = isShorts
    ? 'h-[96px] animate-pulse rounded-md bg-slate-200 sm:h-[122px]'
    : 'h-[64px] animate-pulse rounded-md bg-slate-200 sm:h-[90px]';

  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={rowClass}>
          <div className="h-6 w-6 animate-pulse rounded-full bg-slate-200" />
          <div className={thumbClass} />
          <div className="space-y-2">
            <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="hidden h-8 w-16 animate-pulse rounded bg-slate-200 sm:block" />
        </div>
      ))}
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
  if (loading) {
    return <LoadingRows isShorts={isShorts} />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load {title || 'leaderboard'}: {error}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No videos available yet.
      </div>
    );
  }

  return (
    <div>
      {(title || lastUpdated) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          {title ? (
            <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{title}</h2>
          ) : (
            <div />
          )}
          {lastUpdated && <p className="text-xs text-slate-500">Updated {formatTimeAgo(lastUpdated)}</p>}
        </div>
      )}

      <div className="space-y-2">
        {videos.map((video, index) => {
          const rank = index + 1;
          const categoryBadge = getCategoryBadge(video.category_id);
          const primaryMetricValue = Number(video?.[metricKey] || 0);
          const secondaryMetricValue = secondaryMetricKey ? Number(video?.[secondaryMetricKey] || 0) : null;
          const rowClass = isShorts
            ? 'grid grid-cols-[28px_72px_minmax(0,1fr)] gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[28px_88px_minmax(0,1fr)_auto] sm:items-center sm:gap-4'
            : 'grid grid-cols-[28px_112px_minmax(0,1fr)] gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[28px_160px_minmax(0,1fr)_auto] sm:items-center sm:gap-4';
          const thumbWrapClass = isShorts
            ? 'relative h-[96px] w-[72px] overflow-hidden rounded-md bg-slate-100 sm:h-[122px] sm:w-[88px]'
            : 'relative h-[64px] w-[112px] overflow-hidden rounded-md bg-slate-100 sm:h-[90px] sm:w-[160px]';
          const imageSizes = isShorts ? '(max-width: 640px) 72px, 88px' : '(max-width: 640px) 112px, 160px';

          return (
            <article
              key={video.id}
              className={`${rowClass} ${
                rank === 1 ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <div className={`text-center text-lg font-medium ${rank === 1 ? 'text-red-600' : 'text-slate-500'}`}>
                {rank}
              </div>

              <a href={getYouTubeUrl(video.id)} target="_blank" rel="noopener noreferrer" className="group block">
                <div className={thumbWrapClass}>
                  <Image
                    src={video.thumb_url}
                    alt={video.title}
                    fill
                    sizes={imageSizes}
                    className="object-cover transition group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(video.duration)}
                  </span>
                </div>
              </a>

              <div className="min-w-0">
                <a
                  href={getYouTubeUrl(video.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm font-medium leading-5 text-slate-900 hover:text-red-600"
                >
                  {video.title}
                </a>
                <p className="mt-1 truncate text-xs text-slate-500">{video.channel_title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {isShorts && <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">#Shorts</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryBadge.className}`}>
                    {categoryBadge.label}
                  </span>
                </div>
              </div>

              <div className="col-span-2 text-right sm:col-span-1">
                <p className="text-lg font-medium text-slate-900">{formatViewCountShort(primaryMetricValue)}</p>
                <p className="text-[11px] text-slate-500">{metricLabel}</p>
                {secondaryMetricKey && (
                  <p className="text-[10px] text-slate-400">
                    {formatViewCountShort(secondaryMetricValue)} {secondaryMetricLabel}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] font-medium text-red-600">{rank === 1 ? 'Top trending' : 'Trending'}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
