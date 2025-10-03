'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ModernChartHeader from '@/components/ModernChartHeader';
import ModernChartRanking from '@/components/ModernChartRanking';
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

    // Find country info
    const info = SUPPORTED_COUNTRIES.find(c => c.slug === country.toLowerCase());
    setCountryInfo(info);

    // Fetch country trending data
    const fetchTrendingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch trending videos (limit 100)
        const videosResponse = await fetch(`/api/trending/${country}?limit=100`);
        if (!videosResponse.ok) {
          if (videosResponse.status === 404) {
            throw new Error('Country not found');
          }
          throw new Error(`Failed to fetch videos: ${videosResponse.status}`);
        }
        const videosData = await videosResponse.json();

        // Ensure videosData is an array
        if (!Array.isArray(videosData)) {
          console.error('API returned non-array data:', videosData);
          throw new Error('Invalid data format received from API');
        }

        // Only get regular videos (no shorts)
        const regularVideos = videosData.filter(video => video && video.is_short === 0);

        setTrendingVideos(regularVideos || []);

        // Set last updated to the most recent capture time
        if (videosData.length > 0) {
          setLastUpdated(videosData[0].captured_at);
        }

      } catch (err) {
        console.error('Error fetching trending data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingData();
  }, [country]);

  if (!countryInfo && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
        <ModernChartHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Country Not Found
            </h1>
            <p className="text-gray-600">
              The country &quot;{country}&quot; doesn&apos;t exist or isn&apos;t supported yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const countryName = countryInfo ? `${countryInfo.flag} ${countryInfo.name}` : 'Country';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
      {/* Modern Header */}
      <ModernChartHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trending Videos Chart (Top 100) */}
        <div className="mb-12">
          <ModernChartRanking
            videos={trendingVideos || []}
            title={`${countryName} Trending`}
            loading={loading}
            error={error}
            lastUpdated={lastUpdated}
            isShorts={false}
            showStats={true}
          />
        </div>


      </div>
    </div>
  );
}
