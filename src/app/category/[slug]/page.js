'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChartHero from '@/components/ChartHero';
import ModernChartRanking from '@/components/ModernChartRanking';
import SeoFooter from '@/components/SeoFooter';
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

    const categoryInfo = POPULAR_CATEGORIES_DISPLAY.find((entry) => entry.slug === slug);
    setCategory(categoryInfo || null);

    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        const videosResponse = await fetch(`/api/leaderboard/category/${slug}?limit=100`);
        if (!videosResponse.ok) {
          if (videosResponse.status === 404) {
            throw new Error('Category not found');
          }
          throw new Error(`Failed to fetch videos: ${videosResponse.status}`);
        }

        const videosData = await videosResponse.json();
        if (!Array.isArray(videosData)) {
          throw new Error('Invalid data format received from API');
        }

        const regularVideos = videosData.filter((video) => video && video.is_short === 0);
        setCategoryVideos(regularVideos);
        setLastUpdated(videosData[0]?.captured_at || null);
      } catch (fetchError) {
        console.error('Error fetching category data:', fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [slug]);

  if (!category && !loading && !error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ChartHero title="Category not found" subtitle={`The category "${slug}" isn't supported yet.`} />
      </div>
    );
  }

  const categoryName = category?.name || 'Category';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ChartHero title={`${categoryName} leaderboard`} subtitle="Trending now on YouTube" />

      <div className="mx-auto max-w-[1240px] px-6 pb-16">
        <ModernChartRanking
          videos={categoryVideos}
          title={`${categoryName} videos`}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          isShorts={false}
        />

        {category && <SeoFooter context="category" category={category} />}
      </div>
    </div>
  );
}
