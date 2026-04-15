'use client';

import { useEffect, useState } from 'react';
import ChartHero from '@/components/ChartHero';
import ModernChartRanking from '@/components/ModernChartRanking';
import SeoFooter from '@/components/SeoFooter';

export default function LeaderboardPage({
  heroTitle,
  heroSubtitle,
  endpoint,
  rankingTitle,
  footerContext = 'global',
  isShorts = false,
  metricKey = 'view_count',
  metricLabel = 'views today',
  secondaryMetricKey = null,
  secondaryMetricLabel = '',
}) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setVideos(list);
        setLastUpdated(list[0]?.captured_at || null);
      } catch (fetchError) {
        console.error(`Error fetching leaderboard from ${endpoint}:`, fetchError);
        setError(fetchError.message || 'Failed to fetch leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [endpoint]);

  return (
    <div className="min-h-screen bg-slate-100">
      <ChartHero title={heroTitle} subtitle={heroSubtitle} />

      <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6">
        <ModernChartRanking
          videos={videos}
          title={rankingTitle}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          isShorts={isShorts}
          metricKey={metricKey}
          metricLabel={metricLabel}
          secondaryMetricKey={secondaryMetricKey}
          secondaryMetricLabel={secondaryMetricLabel}
        />

        <SeoFooter context={footerContext} />
      </div>
    </div>
  );
}
