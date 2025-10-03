'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModernChartHeader from '@/components/ModernChartHeader';
import ModernChartRanking from '@/components/ModernChartRanking';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [globalVideos, setGlobalVideos] = useState([]);
  const [globalShorts, setGlobalShorts] = useState([]);
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Select specific categories to feature on homepage (avoid showing all in pills)
  const featuredCategories = POPULAR_CATEGORIES_DISPLAY.slice(0, 4); // Music, Gaming, Sports, Entertainment

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
      
      
      // Set last updated to the most recent capture time
      if (globalData.length > 0) {
        setLastUpdated(globalData[0].captured_at);
      }

      // Fetch category data for featured categories (regular videos only)
      const categoryPromises = featuredCategories.map(async (category) => {
        try {
          const response = await fetch(`/api/leaderboard/category/${category.slug}?limit=10`);
          if (response.ok) {
            const data = await response.json();
            return { 
              [category.slug]: data // These are already only regular videos (not shorts)
            };
          }
          return { 
            [category.slug]: []
          };
        } catch (err) {
          console.error(`Error fetching ${category.name}:`, err);
          return { 
            [category.slug]: []
          };
        }
      });

      // Fetch category shorts separately
      const categoryShortPromises = featuredCategories.map(async (category) => {
        try {
          const response = await fetch(`/api/leaderboard/category/${category.slug}/shorts?limit=5`);
          if (response.ok) {
            const data = await response.json();
            return { 
              [`${category.slug}_shorts`]: data
            };
          }
          return { 
            [`${category.slug}_shorts`]: []
          };
        } catch (err) {
          console.error(`Error fetching ${category.name} shorts:`, err);
          return { 
            [`${category.slug}_shorts`]: []
          };
        }
      });

      const categoryResults = await Promise.all(categoryPromises);
      const categoryShortResults = await Promise.all(categoryShortPromises);
      const mergedCategoryData = [...categoryResults, ...categoryShortResults].reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setCategoryData(mergedCategoryData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categorySlug) => {
    router.push(`/category/${categorySlug}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
      {/* Modern Header */}
      <ModernChartHeader />

      {/* Category Navigation Pills */}
      <div className="bg-white/50 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-600 mr-3">Categories:</span>
            {POPULAR_CATEGORIES_DISPLAY.map((category) => (
              <button
                key={category.slug}
                onClick={() => handleCategoryClick(category.slug)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 ease-in-out transform hover:scale-105 shadow-sm"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Global Videos */}
        <div className="mb-12">
          <ModernChartRanking
            videos={globalVideos}
            title="Global Videos"
            loading={loading}
            error={error}
            lastUpdated={lastUpdated}
            isShorts={false}
            showStats={true}
          />
        </div>

        {/* Global Shorts */}
        <div className="mb-12">
          <ModernChartRanking
            videos={globalShorts}
            title="Global Shorts"
            loading={loading}
            error={error}
            lastUpdated={lastUpdated}
            isShorts={true}
            showStats={true}
          />
        </div>

        {/* Featured Categories Section */}
        <div className="space-y-12 mb-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Featured Categories
            </h2>
            <p className="text-gray-600">Discover trending content across different topics</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featuredCategories.map((category) => (
              <div key={category.slug} className="space-y-8">
                {/* Regular Videos */}
                <ModernChartRanking
                  videos={categoryData[category.slug] || []}
                  title={category.name}
                  loading={loading}
                  error={null}
                  lastUpdated={lastUpdated}
                  isShorts={false}
                  showStats={false}
                  categorySlug={category.slug}
                />
                
                {/* Shorts for this category */}
                {categoryData[`${category.slug}_shorts`] && categoryData[`${category.slug}_shorts`].length > 0 && (
                  <ModernChartRanking
                    videos={categoryData[`${category.slug}_shorts`]}
                    title={`${category.name} Shorts`}
                    loading={loading}
                    error={null}
                    lastUpdated={lastUpdated}
                    isShorts={true}
                    showStats={false}
                    categorySlug={category.slug}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
