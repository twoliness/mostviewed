'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChartHero from '@/components/ChartHero';
import ModernChartRanking from '@/components/ModernChartRanking';
import SeoFooter from '@/components/SeoFooter';
import { SUPPORTED_COUNTRIES } from '@/lib/types';

export default function CountryTrendingPage() {
  const params = useParams();
  const { country } = params;

  const [trendingVideos, setTrendingVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countryInfo, setCountryInfo] = useState(null);

  useEffect(() => {
    if (!country) return;

    const info = SUPPORTED_COUNTRIES.find((entry) => entry.slug === country.toLowerCase());
    setCountryInfo(info || null);

    const fetchTrendingData = async () => {
      try {
        setLoading(true);
        setError(null);

        const videosResponse = await fetch(`/api/trending/${country}?limit=100`);
        if (!videosResponse.ok) {
          if (videosResponse.status === 404) {
            throw new Error('Country not found');
          }
          throw new Error(`Failed to fetch videos: ${videosResponse.status}`);
        }

        const videosData = await videosResponse.json();
        if (!Array.isArray(videosData)) {
          throw new Error('Invalid data format received from API');
        }

        const regularVideos = videosData.filter((video) => video && video.is_short === 0);
        setTrendingVideos(regularVideos);
        setLastUpdated(videosData[0]?.captured_at || null);
      } catch (fetchError) {
        console.error('Error fetching trending data:', fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingData();
  }, [country]);

  if (!countryInfo && !loading && !error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ChartHero title="Country not found" subtitle={`The country "${country}" isn't supported yet.`} />
      </div>
    );
  }

  const countryName = countryInfo ? `${countryInfo.flag} ${countryInfo.name}` : 'Country';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ChartHero title={`${countryName} trending leaderboard`} subtitle="Most viewed videos today" />

      <div className="mx-auto max-w-[1240px] px-6 pb-16">
        <ModernChartRanking
          videos={trendingVideos}
          title={`${countryName} videos`}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          isShorts={false}
        />

        {countryInfo && <SeoFooter context="country" country={countryInfo} />}
      </div>
    </div>
  );
}
