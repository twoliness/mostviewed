'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';

export default function ShortsPage() {
  const [shortsVideos, setShortsVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchShortsLeaderboard();
  }, []);

  const fetchShortsLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/leaderboard/shorts');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      setShortsVideos(data);
      
      // Set last updated to the most recent capture time
      if (data.length > 0) {
        setLastUpdated(data[0].captured_at);
      }
      
    } catch (err) {
      console.error('Error fetching shorts leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Shorts Header */}
      <div className="text-center py-8 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-lg">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-4xl font-bold mb-4">
          Trending YouTube Shorts
        </h1>
        <p className="text-xl opacity-90 max-w-2xl mx-auto">
          Discover the most popular short-form videos under 60 seconds
        </p>
      </div>

      {/* Shorts Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">⏱️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Under 60 Seconds</h3>
          <p className="text-gray-600 dark:text-gray-400">Quick, engaging content</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">🔥</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Viral Content</h3>
          <p className="text-gray-600 dark:text-gray-400">Most viewed shorts</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="text-3xl mb-2">📈</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Updates</h3>
          <p className="text-gray-600 dark:text-gray-400">Fresh every 30 minutes</p>
        </div>
      </div>

      {/* Shorts Leaderboard */}
      <Leaderboard
        title="Top 10 Trending Shorts"
        videos={shortsVideos}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        icon="📱"
        compact={true}
      />

      {/* About Shorts */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📋 About YouTube Shorts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">What are Shorts?</h4>
            <p>
              YouTube Shorts are vertical videos that are 60 seconds or less in length. 
              They&apos;re designed for mobile viewing and quick consumption.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Why Track Shorts?</h4>
            <p>
              Shorts represent the fastest-growing format on YouTube, often going viral 
              quickly and reaching massive audiences in short time periods.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🚀 Explore More
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/"
            className="flex items-center space-x-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">Global Top 10</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">All video types</div>
            </div>
          </Link>
          
          <Link
            href="/category/music"
            className="flex items-center space-x-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🎵</span>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">Music Trending</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Top music videos</div>
            </div>
          </Link>
          
          <Link
            href="/category/gaming"
            className="flex items-center space-x-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🎮</span>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">Gaming Trending</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Gaming highlights</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}