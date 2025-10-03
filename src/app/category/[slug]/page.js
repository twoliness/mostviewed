'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ModernChartHeader from '@/components/ModernChartHeader';
import ModernChartRanking from '@/components/ModernChartRanking';
import Footer from '@/components/Footer';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';

export default function CategoryPage() {
  const params = useParams();
  const { slug } = params;
  
  const [categoryVideos, setCategoryVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    if (!slug) return;
    
    // Find category info
    const categoryInfo = POPULAR_CATEGORIES_DISPLAY.find(cat => cat.slug === slug);
    setCategory(categoryInfo);
    
    // Fetch category data
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch category videos (limit 100)
        const videosResponse = await fetch(`/api/leaderboard/category/${slug}?limit=100`);
        if (!videosResponse.ok) {
          if (videosResponse.status === 404) {
            throw new Error('Category not found');
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
        
        setCategoryVideos(regularVideos || []);
        
        // Set last updated to the most recent capture time
        if (videosData.length > 0) {
          setLastUpdated(videosData[0].captured_at);
        }
        
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategoryData();
  }, [slug]);

  if (!category && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
        <ModernChartHeader />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Category Not Found
            </h1>
            <p className="text-gray-600">
              The category &quot;{slug}&quot; doesn&apos;t exist or isn&apos;t supported yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const categoryName = category?.name || 'Category';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
      {/* Modern Header */}
      <ModernChartHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Videos Chart (Top 100) */}
        <div className="mb-12">
          <ModernChartRanking
            videos={categoryVideos || []}
            title={categoryName}
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