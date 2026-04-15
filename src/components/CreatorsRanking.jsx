import Image from 'next/image';
import { formatTimeAgo, formatViewCountShort, getYouTubeChannelUrl, getYouTubeUrl } from '@/lib/utils';

function LoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[28px_44px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[28px_56px_minmax(0,1fr)_auto] sm:items-start sm:gap-4"
        >
          <div className="h-6 w-6 animate-pulse rounded-full bg-slate-200" />
          <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200 sm:h-14 sm:w-14" />
          <div className="space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="hidden h-8 w-20 animate-pulse rounded bg-slate-200 sm:block" />
        </div>
      ))}
    </div>
  );
}

export default function CreatorsRanking({ creators, loading = false, error = null, lastUpdated = null }) {
  if (loading) {
    return <LoadingRows />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load top creators: {error}
      </div>
    );
  }

  if (!creators || creators.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No creators available yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Top creators</h2>
        {lastUpdated && <p className="text-xs text-slate-500">Updated {formatTimeAgo(lastUpdated)}</p>}
      </div>

      <div className="space-y-2">
        {creators.map((creator, index) => {
          const rank = index + 1;
          const initials = (creator.channel_title || '?').slice(0, 1).toUpperCase();

          return (
            <article
              key={creator.channel_id}
              className={`grid grid-cols-[28px_44px_minmax(0,1fr)] gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[28px_56px_minmax(0,1fr)_auto] sm:items-start sm:gap-4 ${
                rank === 1 ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <div className={`text-center text-lg font-medium ${rank === 1 ? 'text-red-600' : 'text-slate-500'}`}>
                {rank}
              </div>

              <a
                href={getYouTubeChannelUrl(creator.channel_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="relative h-11 w-11 overflow-hidden rounded-full bg-slate-200 sm:h-14 sm:w-14">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.channel_title || 'Creator avatar'}
                      fill
                      sizes="56px"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600">
                      {initials}
                    </div>
                  )}
                </div>
              </a>

              <div className="min-w-0">
                <a
                  href={getYouTubeChannelUrl(creator.channel_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium text-slate-900 hover:text-red-600"
                >
                  {creator.channel_title}
                </a>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatViewCountShort(creator.total_views)} total views • {Number(creator.video_count || 0).toLocaleString('en-US')} videos
                </p>
                {creator.subscriber_count ? (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatViewCountShort(creator.subscriber_count)} subscribers
                  </p>
                ) : null}

                {Array.isArray(creator.videos) && creator.videos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {creator.videos.slice(0, 3).map((video) => (
                      <a
                        key={video.id}
                        href={getYouTubeUrl(video.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[11px] text-slate-600 hover:text-slate-900"
                      >
                        • {video.title} ({formatViewCountShort(video.view_count)} views)
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2 text-right sm:col-span-1">
                <p className="text-lg font-medium text-slate-900">{formatViewCountShort(creator.total_views)}</p>
                <p className="text-[11px] text-slate-500">creator views</p>
                <p className="mt-0.5 text-[10px] font-medium text-red-600">{rank === 1 ? 'Top creator' : 'Leading'}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
