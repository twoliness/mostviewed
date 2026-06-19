'use client';

import { useState, useEffect } from 'react';
import ChartHero from '@/components/ChartHero';
import ModernChartRanking from '@/components/ModernChartRanking';
import SeoFooter from '@/components/SeoFooter';

export default function ShortsPage() {
  const [shortsVideos, setShortsVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchShortsLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/leaderboard/shorts');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        setShortsVideos(list);
        setLastUpdated(list[0]?.captured_at || null);
      } catch (fetchError) {
        console.error('Error fetching shorts leaderboard:', fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShortsLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ChartHero title="YouTube Shorts leaderboard" subtitle="Most viewed short-form videos today" />

      <div className="mx-auto max-w-[1240px] px-6 pb-16">
        <ModernChartRanking
          videos={shortsVideos}
          title="Global Shorts"
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          isShorts={true}
        />

        <SeoFooter context="shorts" />
      </div>
    </div>
  );
}
