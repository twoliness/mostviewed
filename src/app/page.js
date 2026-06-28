'use client';

import Image from 'next/image';
import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  Hash,
  Music2,
  Gamepad2,
  Trophy,
  Clapperboard,
  Newspaper,
  Film,
  Clock,
  TrendingUp,
  Mail,
  Star,
} from 'lucide-react';
import ChartHero from '@/components/ChartHero';
import ModernChartRanking from '@/components/ModernChartRanking';
import StatsBar from '@/components/StatsBar';
import SeoFooter from '@/components/SeoFooter';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { formatViewCountShort, formatTimeAgo, getYouTubeUrl } from '@/lib/utils';

const TAB_ALL = 'all';
const TAB_SHORTS = 'shorts';
const FEATURED_CATEGORIES = POPULAR_CATEGORIES_DISPLAY.slice(0, 5);
const EMAIL_PATTERN = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TAB_ICONS = {
  all: Hash,
  music: Music2,
  gaming: Gamepad2,
  sports: Trophy,
  entertainment: Clapperboard,
  'news-politics': Newspaper,
  shorts: Film,
};

const CATEGORY_COLORS = {
  music: 'var(--brand)',
  entertainment: 'oklch(0.55 0.16 280)',
  gaming: 'oklch(0.55 0.16 180)',
  sports: 'oklch(0.7 0.16 80)',
  'news-politics': 'oklch(0.55 0.05 60)',
};

function formatHeroDate(lastUpdated) {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!lastUpdated) {
    return `${day}`;
  }

  const updatedAt = new Date(lastUpdated);
  const utcTime = updatedAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: true,
  });

  return `${day} · Last updated ${utcTime} UTC`;
}

function buildCategorySummary(categories, videosByCategory) {
  const summaries = categories
    .map((category) => {
      const videos = videosByCategory[category.slug] || [];
      const totalViews = videos.reduce((sum, video) => sum + Number(video.view_count || 0), 0);
      return { ...category, totalViews };
    })
    .filter((entry) => entry.totalViews > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 5);

  const maxViews = summaries[0]?.totalViews || 1;

  return summaries.map((entry) => ({
    ...entry,
    width: Math.max((entry.totalViews / maxViews) * 100, 6),
    color: CATEGORY_COLORS[entry.slug] || 'oklch(0.55 0.05 60)',
  }));
}

function NewsletterCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setEmailError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.message === 'already_subscribed' ? 'already' : 'success');
        setEmail('');
      } else {
        setStatus('error');
        setEmailError(data.error || 'Something went wrong. Try again.');
      }
    } catch {
      setStatus('error');
      setEmailError('Could not connect. Please try again.');
    }
  };

  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-brand/12 text-brand">
          <Mail className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[13px] font-semibold tracking-tight">The Daily Viral Brief</h3>
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        A quick read on what&apos;s breaking out on YouTube — videos, Shorts, creators,
        and patterns worth watching.
      </p>
      <ul className="my-3 space-y-1 text-[11.5px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-brand" />
          Fastest-rising videos &amp; Shorts
        </li>
        <li className="flex items-center gap-1.5">
          <Star className="h-3 w-3 text-brand" />
          Creator patterns before they peak
        </li>
      </ul>
      {status === 'success' ? (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-center text-[12px] font-medium text-emerald-600">
          Check your inbox — confirmation email on its way.
        </p>
      ) : status === 'already' ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-center text-[12px] text-muted-foreground">
          You&apos;re already subscribed.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <input
            type="email"
            required
            pattern={EMAIL_PATTERN}
            value={email}
            onChange={(e) => {
              const nextEmail = e.target.value;
              setEmail(nextEmail);
              if (emailError && EMAIL_REGEX.test(nextEmail.trim())) {
                setEmailError('');
              }
            }}
            onInvalid={(e) => {
              e.preventDefault();
              setEmailError('Enter a valid email address.');
            }}
            placeholder="name@email.com"
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'newsletter-email-error' : undefined}
            className={`h-9 w-full rounded-md border bg-background px-3 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 ${
              emailError
                ? 'border-brand focus:border-brand focus:ring-brand/20'
                : 'border-border focus:border-foreground focus:ring-foreground/15'
            }`}
          />
          {emailError ? (
            <p id="newsletter-email-error" className="text-[11px] font-medium text-brand">
              {emailError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="h-9 w-full rounded-md bg-foreground text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending…' : 'Subscribe'}
          </button>
        </form>
      )}
      <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
        Free · No spam, ever
      </p>
    </section>
  );
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
          if (!response.ok) return [category.slug, []];
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

      const response = await fetch('/api/trigger-collection', { method: 'POST' });

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
      ...FEATURED_CATEGORIES.map((cat) => ({ id: cat.slug, label: cat.name })),
      { id: TAB_SHORTS, label: 'Shorts' },
    ],
    []
  );

  const activeVideos = useMemo(() => {
    if (activeTab === TAB_SHORTS) return globalShorts;
    if (activeTab === TAB_ALL) return globalVideos;
    return categoryVideos[activeTab] || [];
  }, [activeTab, categoryVideos, globalShorts, globalVideos]);

  const activeTabTitle = useMemo(() => {
    if (activeTab === TAB_ALL) return 'All categories';
    if (activeTab === TAB_SHORTS) return 'Trending Shorts';
    const category = FEATURED_CATEGORIES.find((c) => c.slug === activeTab);
    return category ? category.name : 'All categories';
  }, [activeTab]);

  const stats = useMemo(() => {
    const totalTracked = globalVideos.length + globalShorts.length;
    const topViews = globalVideos[0]?.view_count || 0;
    const totalViews = globalVideos.reduce((sum, v) => sum + Number(v.view_count || 0), 0);
    return [
      { label: 'Videos tracked', value: totalTracked.toLocaleString('en-US'), unit: 'records' },
      { label: 'Top video views', value: formatViewCountShort(topViews), unit: 'today' },
      { label: 'Total views today', value: formatViewCountShort(totalViews), unit: 'combined' },
      { label: 'Shorts tracked', value: globalShorts.length.toLocaleString('en-US'), unit: 'global' },
    ];
  }, [globalShorts, globalVideos]);

  const topCategories = useMemo(
    () => buildCategorySummary(FEATURED_CATEGORIES, categoryVideos),
    [categoryVideos]
  );

  const trendingShorts = useMemo(() => globalShorts.slice(0, 5), [globalShorts]);
  const hasNoData = !loading && !error && globalVideos.length === 0 && globalShorts.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ChartHero title="YouTube trending leaderboard" subtitle={formatHeroDate(lastUpdated)} />

      <div className="mx-auto max-w-[1240px] px-6 pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <main>
            <StatsBar stats={stats} />

            {/* Category tabs */}
            <div className="mb-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-0.5 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = TAB_ICONS[tab.id] || Hash;
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition-colors ${
                        isActive
                          ? 'border-foreground font-medium text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {lastUpdated && (
                <div className="hidden shrink-0 items-center gap-1 pb-2 text-[11px] text-muted-foreground md:flex">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(lastUpdated)}
                </div>
              )}
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
          </main>

          <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
            {/* Top categories */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Top categories today
                </h3>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {topCategories.length > 0 ? (
                <ul className="space-y-2.5">
                  {topCategories.map((cat) => (
                    <li key={cat.slug}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                        <span className="text-[12px] tabular-nums text-muted-foreground">
                          {formatViewCountShort(cat.totalViews)}
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.width}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">Loading categories…</p>
              )}
            </section>

            {/* Newsletter */}
            <NewsletterCard />

            {/* Trending shorts */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Trending shorts
              </h3>
              {trendingShorts.length > 0 ? (
                <ul className="space-y-3">
                  {trendingShorts.map((video, idx) => (
                    <li key={video.id} className="group flex items-start gap-3">
                      <a
                        href={getYouTubeUrl(video.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative shrink-0"
                      >
                        <div className="relative h-14 w-10 overflow-hidden rounded-md ring-1 ring-border">
                          <Image
                            src={video.thumb_url}
                            alt={video.title}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                          <span className="absolute bottom-0.5 left-0.5 rounded bg-black/75 px-1 font-mono text-[8px] text-white">
                            #{idx + 1}
                          </span>
                        </div>
                      </a>
                      <div className="min-w-0 flex-1">
                        <a
                          href={getYouTubeUrl(video.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-2 text-[12px] font-medium leading-snug group-hover:text-brand"
                        >
                          {video.title}
                        </a>
                        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          {formatViewCountShort(video.view_count)} views
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  {loading ? 'Loading…' : 'No shorts available right now.'}
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>

      <SeoFooter context="global" />
    </div>
  );
}
