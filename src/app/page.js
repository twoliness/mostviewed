'use client';

import { useState, useEffect } from 'react';
import ModernChartHeader from '@/components/ModernChartHeader';
import ModernChartRanking from '@/components/ModernChartRanking';
import Footer from '@/components/Footer';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils';

export default function Home() {
  const [globalVideos, setGlobalVideos] = useState([]);
  const [globalShorts, setGlobalShorts] = useState([]);
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
            
            // Map category slugs to chart navigation slugs
            const chartSlug = category.slug.replace('-', '-');
            
            return { 
              [category.slug]: regularVideos,
              [`${category.slug}_shorts`]: shortsVideos,
              // Also store with chart navigation compatible names
              [chartSlug]: regularVideos,
              [`${chartSlug}_shorts`]: shortsVideos
            };
          }
          return { 
            [category.slug]: [],
            [`${category.slug}_shorts`]: [],
            [category.slug.replace('-', '-')]: [],
            [`${category.slug.replace('-', '-')}_shorts`]: []
          };
        } catch (err) {
          console.error(`Error fetching ${category.name}:`, err);
          return { 
            [category.slug]: [],
            [`${category.slug}_shorts`]: [],
            [category.slug.replace('-', '-')]: [],
            [`${category.slug.replace('-', '-')}_shorts`]: []
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
    <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
      {/* Modern Header */}
      <ModernChartHeader />

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
