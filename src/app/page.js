'use client';

import Image from 'next/image';
import { useMemo, useEffect, useState, useCallback } from 'react';
import ChartHero from '@/components/ChartHero';
import ModernChartRanking from '@/components/ModernChartRanking';
import StatsBar from '@/components/StatsBar';
import SeoFooter from '@/components/SeoFooter';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { formatViewCountShort } from '@/lib/utils';

const TAB_ALL = 'all';
const TAB_SHORTS = 'shorts';
const FEATURED_CATEGORIES = POPULAR_CATEGORIES_DISPLAY.slice(0, 5);

const CATEGORY_BADGE = {
  music: { icon: '♪', iconClass: 'bg-rose-100 text-rose-700' },
  gaming: { icon: '⬛', iconClass: 'bg-indigo-100 text-indigo-700' },
  sports: { icon: '◆', iconClass: 'bg-amber-100 text-amber-700' },
  entertainment: { icon: '▶', iconClass: 'bg-fuchsia-100 text-fuchsia-700' },
  'news-politics': { icon: '⬤', iconClass: 'bg-emerald-100 text-emerald-700' },
};

function formatHeroDate(lastUpdated) {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!lastUpdated) {
    return `Most viewed videos today, ${day}`;
  }

  const updatedAt = new Date(lastUpdated);
  const utcTime = updatedAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: true,
  });

  return `Most viewed videos today, ${day} · Last updated ${utcTime} UTC`;
}

function buildCategorySummary(categories, videosByCategory) {
  const summaries = categories
    .map((category) => {
      const videos = videosByCategory[category.slug] || [];
      const totalViews = videos.reduce((sum, video) => sum + Number(video.view_count || 0), 0);

      return {
        ...category,
        totalViews,
      };
    })
    .filter((entry) => entry.totalViews > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 5);

  const maxViews = summaries[0]?.totalViews || 1;

  return summaries.map((entry) => {
    const width = Math.max((entry.totalViews / maxViews) * 100, 6);

    return {
      ...entry,
      width,
    };
  });
}

export default function Home() {
  const [globalVideos, setGlobalVideos] = useState([]);
  const [globalShorts, setGlobalShorts] = useState([]);
  const [categoryVideos, setCategoryVideos] = useState({});
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [globalResponse, shortsResponse] = await Promise.all([
        fetch('/api/leaderboard/global'),
        fetch('/api/leaderboard/shorts'),
      ]);

      if (!globalResponse.ok) {
        throw new Error(`Failed to fetch global leaderboard: ${globalResponse.status}`);
      }

      if (!shortsResponse.ok) {
        throw new Error(`Failed to fetch shorts leaderboard: ${shortsResponse.status}`);
      }

      const [globalData, shortsData] = await Promise.all([
        globalResponse.json(),
        shortsResponse.json(),
      ]);

      setGlobalVideos(Array.isArray(globalData) ? globalData : []);
      setGlobalShorts(Array.isArray(shortsData) ? shortsData : []);

      const latestCapture = [globalData?.[0]?.captured_at, shortsData?.[0]?.captured_at]
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      setLastUpdated(latestCapture || null);

      const categoryResults = await Promise.all(
        FEATURED_CATEGORIES.map(async (category) => {
          const response = await fetch(`/api/leaderboard/category/${category.slug}?limit=10`);
          if (!response.ok) {
            return [category.slug, []];
          }

          const data = await response.json();
          return [category.slug, Array.isArray(data) ? data : []];
        })
      );

      setCategoryVideos(Object.fromEntries(categoryResults));
    } catch (fetchError) {
      console.error('Error fetching homepage data:', fetchError);
      setError(fetchError.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleCollectInitialData = async () => {
    try {
      setCollecting(true);
      setCollectError(null);

      const response = await fetch('/api/trigger-collection', {
        method: 'POST',
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to trigger collection (${response.status})`);
      }

      await fetchAllData();
    } catch (collectionError) {
      console.error('Error collecting initial data:', collectionError);
      setCollectError(collectionError.message || 'Failed to collect initial data');
    } finally {
      setCollecting(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: TAB_ALL, label: 'All' },
      ...FEATURED_CATEGORIES.map((category) => ({ id: category.slug, label: category.name })),
      { id: TAB_SHORTS, label: 'Shorts' },
    ],
    []
  );

  const activeVideos = useMemo(() => {
    if (activeTab === TAB_SHORTS) {
      return globalShorts;
    }

    if (activeTab === TAB_ALL) {
      return globalVideos;
    }

    return categoryVideos[activeTab] || [];
  }, [activeTab, categoryVideos, globalShorts, globalVideos]);

  const activeTabTitle = useMemo(() => {
    if (activeTab === TAB_ALL) return 'All categories';
    if (activeTab === TAB_SHORTS) return 'Trending Shorts';

    const category = FEATURED_CATEGORIES.find((entry) => entry.slug === activeTab);
    return category ? category.name : 'All categories';
  }, [activeTab]);

  const stats = useMemo(() => {
    const totalTracked = globalVideos.length + globalShorts.length;
    const topViews = globalVideos[0]?.view_count || 0;
    const totalViews = globalVideos.reduce((sum, video) => sum + Number(video.view_count || 0), 0);

    return [
      {
        label: 'Videos tracked',
        value: totalTracked.toLocaleString('en-US'),
        unit: 'records',
      },
      {
        label: 'Top video views',
        value: formatViewCountShort(topViews),
        unit: 'today',
      },
      {
        label: 'Total views today',
        value: formatViewCountShort(totalViews),
        unit: 'combined',
      },
      {
        label: 'Shorts tracked',
        value: globalShorts.length.toLocaleString('en-US'),
        unit: 'global',
      },
    ];
  }, [globalShorts, globalVideos]);

  const topCategories = useMemo(
    () => buildCategorySummary(FEATURED_CATEGORIES, categoryVideos),
    [categoryVideos]
  );

  const trendingShorts = useMemo(() => globalShorts.slice(0, 6), [globalShorts]);
  const hasNoData = !loading && !error && globalVideos.length === 0 && globalShorts.length === 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <ChartHero title="YouTube trending leaderboard" subtitle={formatHeroDate(lastUpdated)} />
      <StatsBar stats={stats} />

      <div className="mx-auto grid w-full max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="px-4 py-5 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{activeTabTitle}</h2>

            <div className="inline-flex w-full flex-wrap gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 sm:w-auto">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded px-3 py-1.5 text-xs transition ${
                      isActive
                        ? 'border border-slate-200 bg-white font-medium text-slate-900'
                        : 'text-slate-500 hover:bg-white/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ModernChartRanking
            videos={activeVideos}
            title={null}
            loading={loading}
            error={error}
            lastUpdated={lastUpdated}
            isShorts={activeTab === TAB_SHORTS}
          />

          {hasNoData && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">No leaderboard data yet.</p>
              <p className="mt-1 text-amber-800">
                Run initial collection to populate your local database.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCollectInitialData}
                  disabled={collecting}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {collecting ? 'Collecting data...' : 'Collect Initial Data'}
                </button>
                {collectError && <span className="text-xs text-red-700">{collectError}</span>}
              </div>
            </div>
          )}

        </section>

        <aside className="border-t border-slate-200 bg-white px-4 py-5 lg:border-l lg:border-t-0">
          <section className="mb-7">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Top categories today</h3>
            <div>
              {topCategories.map((category) => {
                const badge = CATEGORY_BADGE[category.slug] || { icon: '•', iconClass: 'bg-slate-100 text-slate-700' };

                return (
                  <div key={category.slug} className="border-b border-slate-200 py-2 last:border-b-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-slate-800">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] ${badge.iconClass}`}
                        >
                          {badge.icon}
                        </span>
                        {category.name}
                      </div>
                      <span className="text-xs text-slate-500">{formatViewCountShort(category.totalViews)} views</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-200">
                      <div className="h-1 rounded-full bg-red-500" style={{ width: `${category.width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Trending Shorts</h3>
            <div className="space-y-2">
              {trendingShorts.map((shortVideo) => (
                <a
                  key={shortVideo.id}
                  href={`https://www.youtube.com/watch?v=${shortVideo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md bg-slate-50 px-2.5 py-2 hover:bg-slate-100"
                >
                  <div className="relative h-20 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-200">
                    <Image
                      src={shortVideo.thumb_url}
                      alt={shortVideo.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                      #S
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-medium leading-4 text-slate-900">{shortVideo.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{formatViewCountShort(shortVideo.view_count)} views</p>
                  </div>
                </a>
              ))}

              {!loading && trendingShorts.length === 0 && (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No shorts available right now.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 sm:px-6">
        <SeoFooter context="global" />
      </div>
    </div>
  );
}
