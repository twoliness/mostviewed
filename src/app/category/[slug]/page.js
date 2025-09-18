'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils';

export default function CategoryPage() {
  const params = useParams();
  const { slug } = params;
  
  const [categoryVideos, setCategoryVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    if (slug) {
      // Find category info
      const categoryInfo = POPULAR_CATEGORIES_DISPLAY.find(cat => cat.slug === slug);
      setCategory(categoryInfo);
      fetchCategoryLeaderboard();
    }
  }, [slug]);

  const fetchCategoryLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/leaderboard/category/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Category not found');
        }
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      setCategoryVideos(data);
      
      // Set last updated to the most recent capture time
      if (data.length > 0) {
        setLastUpdated(data[0].captured_at);
      }
      
    } catch (err) {
      console.error('Error fetching category leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!category && !loading) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Category Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          The category &quot;{slug}&quot; doesn&apos;t exist or isn&apos;t supported yet.
        </p>
      </div>
    );
  }

  const categoryName = category?.name || 'Category';
  const categoryIcon = category ? getCategoryIcon(category.id) : '📂';

  return (
    <div className="space-y-8">
      {/* Category Header */}
      <div className="text-center py-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg">
        <div className="text-6xl mb-4">{categoryIcon}</div>
        <h1 className="text-4xl font-bold mb-4">
          {categoryName} Trending
        </h1>
        <p className="text-xl opacity-90 max-w-2xl mx-auto">
          Discover the most popular {categoryName.toLowerCase()} videos on YouTube right now
        </p>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top 10 Videos</h3>
          <p className="text-gray-600 dark:text-gray-400">Most viewed in {categoryName}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">🔄</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Updated Every 30min</h3>
          <p className="text-gray-600 dark:text-gray-400">Fresh trending data</p>
        </div>
      </div>

      {/* Category Leaderboard */}
      <Leaderboard
        title={`Top 10 ${categoryName} Videos`}
        videos={categoryVideos}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        icon={categoryIcon}
        compact={true}
      />

      {/* Other Categories */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🔍 Explore Other Categories
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {POPULAR_CATEGORIES_DISPLAY.filter(cat => cat.slug !== slug).slice(0, 12).map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <span>{getCategoryIcon(cat.id)}</span>
              <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}