'use client';

import { useEffect, useState } from 'react';
import ChartHero from '@/components/ChartHero';
import CreatorsRanking from '@/components/CreatorsRanking';
import SeoFooter from '@/components/SeoFooter';

export default function TopCreatorsPage() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/creators/top?include_videos=true&limit=50&videos_per_creator=3');
        if (!response.ok) {
          throw new Error(`Failed to fetch top creators: ${response.status}`);
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setCreators(list);
        setLastUpdated(list[0]?.latest_capture || null);
      } catch (fetchError) {
        console.error('Error fetching top creators:', fetchError);
        setError(fetchError.message || 'Failed to load creator leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <ChartHero title="Top YouTube creators" subtitle="Creators ranked by total views across their top videos" />

      <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6">
        <CreatorsRanking creators={creators} loading={loading} error={error} lastUpdated={lastUpdated} />
        <SeoFooter context="global" />
      </div>
    </div>
  );
}
