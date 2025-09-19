'use client';

import { useState, useEffect } from 'react';
import BarChartLeaderboard from '@/components/BarChartLeaderboard';
import Champions from '@/components/Champions';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils';

export default function Home() {
  const [globalVideos, setGlobalVideos] = useState([]);
  const [globalShorts, setGlobalShorts] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Select the most popular categories to display
  const featuredCategories = POPULAR_CATEGORIES_DISPLAY.slice(0, 6); // Music, Gaming, Sports, Entertainment, News, Howto

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch global leaderboard
      const globalResponse = await fetch('/api/leaderboard/global');
      if (!globalResponse.ok) {
        throw new Error(`Failed to fetch global: ${globalResponse.status}`);
      }
      const globalData = await globalResponse.json();
      setGlobalVideos(globalData);
      
      // Fetch global shorts
      const shortsResponse = await fetch('/api/leaderboard/shorts');
      if (!shortsResponse.ok) {
        throw new Error(`Failed to fetch shorts: ${shortsResponse.status}`);
      }
      const shortsData = await shortsResponse.json();
      setGlobalShorts(shortsData);
      
      // Fetch top creators
      const creatorsResponse = await fetch('/api/creators/top');
      if (!creatorsResponse.ok) {
        throw new Error(`Failed to fetch creators: ${creatorsResponse.status}`);
      }
      const creatorsData = await creatorsResponse.json();
      setTopCreators(creatorsData);
      
      // Set last updated to the most recent capture time
      if (globalData.length > 0) {
        setLastUpdated(globalData[0].captured_at);
      }

      // Fetch category data for featured categories
      const categoryPromises = featuredCategories.map(async (category) => {
        try {
          const response = await fetch(`/api/leaderboard/category/${category.slug}`);
          if (response.ok) {
            const data = await response.json();
            // Separate shorts and regular videos
            const regularVideos = data.filter(video => !video.is_short).slice(0, 5);
            const shortsVideos = data.filter(video => video.is_short).slice(0, 5);
            return { 
              [category.slug]: regularVideos,
              [`${category.slug}_shorts`]: shortsVideos 
            };
          }
          return { 
            [category.slug]: [],
            [`${category.slug}_shorts`]: []
          };
        } catch (err) {
          console.error(`Error fetching ${category.name}:`, err);
          return { 
            [category.slug]: [],
            [`${category.slug}_shorts`]: []
          };
        }
      });

      const categoryResults = await Promise.all(categoryPromises);
      const mergedCategoryData = categoryResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setCategoryData(mergedCategoryData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Champions Section */}
      <Champions
        creators={topCreators}
        loading={loading}
        error={error}
      />

      {/* Global Rankings - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Video Leaderboard */}
        <BarChartLeaderboard
          title="Global Top 10 Videos"
          videos={globalVideos}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          icon="🏆"
          isGlobal={true}
        />

        {/* Global Shorts Leaderboard */}
        <BarChartLeaderboard
          title="Global Top 10 Shorts"
          videos={globalShorts}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          icon="📱"
          isGlobal={true}
        />
      </div>

      {/* Featured Categories */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
          🔥 Trending by Category
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {featuredCategories.map((category) => (
            <div key={category.slug} className="space-y-6">
              {/* Regular Videos */}
              <BarChartLeaderboard
                title={`${category.name} Top 5`}
                videos={categoryData[category.slug] || []}
                loading={loading}
                error={null}
                lastUpdated={lastUpdated}
                icon={getCategoryIcon(category.id)}
              />
              
              {/* Shorts for this category */}
              {categoryData[`${category.slug}_shorts`] && categoryData[`${category.slug}_shorts`].length > 0 && (
                <BarChartLeaderboard
                  title={`${category.name} Shorts Top 5`}
                  videos={categoryData[`${category.slug}_shorts`]}
                  loading={loading}
                  error={null}
                  lastUpdated={lastUpdated}
                  icon="📱"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        <p>Data refreshed every 30 minutes • Powered by YouTube Data API</p>
      </div>
    </div>
  );
}
