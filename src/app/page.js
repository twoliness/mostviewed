'use client';

import { useState, useEffect } from 'react';
import BarChartLeaderboard from '@/components/BarChartLeaderboard';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils';

export default function Home() {
  const [globalVideos, setGlobalVideos] = useState([]);
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
            return { [category.slug]: data.slice(0, 5) }; // Get top 5 for each category
          }
          return { [category.slug]: [] };
        } catch (err) {
          console.error(`Error fetching ${category.name}:`, err);
          return { [category.slug]: [] };
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
      {/* Hero Section */}
      <div className="text-center py-8 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-4">
          🏆 YouTube Trending Leaderboard
        </h1>
        <p className="text-xl opacity-90 max-w-2xl mx-auto">
          Discover the most popular YouTube videos updated every 30 minutes. 
          Track global trends, explore categories, and find viral Shorts.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">🌍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Global Top 10</h3>
          <p className="text-gray-600 dark:text-gray-400">Most viewed videos worldwide</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">📂</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">20+ Categories</h3>
          <p className="text-gray-600 dark:text-gray-400">Music, Gaming, Sports & more</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">📱</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trending Shorts</h3>
          <p className="text-gray-600 dark:text-gray-400">Most popular short-form content</p>
        </div>
      </div>

      {/* Global Leaderboard */}
      <BarChartLeaderboard
        title="Global Top 10 Most Viewed"
        videos={globalVideos}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        icon="🏆"
      />

      {/* Featured Categories */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
          🔥 Trending by Category
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {featuredCategories.map((category) => (
            <BarChartLeaderboard
              key={category.slug}
              title={`${category.name} Top 5`}
              videos={categoryData[category.slug] || []}
              loading={loading}
              error={null}
              lastUpdated={lastUpdated}
              icon={getCategoryIcon(category.id)}
            />
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
