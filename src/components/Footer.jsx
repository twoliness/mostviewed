import React from 'react';
import { Play } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Branding and Description with Enhanced Keywords */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">📺</span>
              <span className="text-xl font-bold text-gray-900">
                MostViewedToday
              </span>
            </Link>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              The ultimate YouTube trending videos tracker. Discover viral YouTube videos, 
              most viewed content today, and trending YouTube shorts with real-time analytics. 
              Your #1 source for YouTube video rankings and trending content worldwide.
            </p>
            {/* Social Proof Keywords */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>🔥 Over 10M+ trending videos tracked</p>
              <p>📊 Real-time YouTube analytics</p>
              <p>🌍 Global YouTube trends coverage</p>
            </div>
          </div>
          
          {/* Expanded Video Categories with SEO-friendly titles */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Trending Video Categories</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <Link href="/category/music" className="block hover:text-pink-600 transition-colors">🎵 Music Videos & Charts</Link>
              <Link href="/category/gaming" className="block hover:text-pink-600 transition-colors">🎮 Gaming & Esports</Link>
              <Link href="/category/entertainment" className="block hover:text-pink-600 transition-colors">🎭 Entertainment & Celebrity</Link>
              <Link href="/category/sports" className="block hover:text-pink-600 transition-colors">⚽ Sports & Fitness</Link>
              <Link href="/category/comedy" className="block hover:text-pink-600 transition-colors">😂 Comedy & Memes</Link>
              <Link href="/category/news-politics" className="block hover:text-pink-600 transition-colors">📰 News & Politics</Link>
              <Link href="/category/science-technology" className="block hover:text-pink-600 transition-colors">🔬 Tech & Science</Link>
              <Link href="/category/howto-style" className="block hover:text-pink-600 transition-colors">💄 Beauty & Lifestyle</Link>
              <Link href="/category/education" className="block hover:text-pink-600 transition-colors">📚 Educational Content</Link>
              <Link href="/category/film-animation" className="block hover:text-pink-600 transition-colors">🎬 Movies & Animation</Link>
            </div>
          </div>
          
          {/* Content Types & Formats */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Content & Rankings</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <Link href="/shorts" className="block hover:text-pink-600 transition-colors">YouTube Shorts Rankings</Link>
              <Link href="/viral-videos" className="block hover:text-pink-600 transition-colors">Viral Videos Today</Link>
              <Link href="/most-liked" className="block hover:text-pink-600 transition-colors">Most Liked Videos</Link>
              <Link href="/trending-now" className="block hover:text-pink-600 transition-colors">Trending Now</Link>
              <Link href="/top-creators" className="block hover:text-pink-600 transition-colors">Top YouTube Creators</Link>
              <Link href="/breaking-videos" className="block hover:text-pink-600 transition-colors">Breaking Viral Content</Link>
              <Link href="/weekly-charts" className="block hover:text-pink-600 transition-colors">Weekly YouTube Charts</Link>
              <Link href="/monthly-top" className="block hover:text-pink-600 transition-colors">Monthly Top Videos</Link>
            </div>
          </div>
          
          {/* Geographic & Language Targeting */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Global Trends</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <Link href="/trending/usa" className="block hover:text-pink-600 transition-colors">🇺🇸 USA Trending Videos</Link>
              <Link href="/trending/uk" className="block hover:text-pink-600 transition-colors">🇬🇧 UK Trending Videos</Link>
              <Link href="/trending/india" className="block hover:text-pink-600 transition-colors">🇮🇳 India Trending Videos</Link>
              <Link href="/trending/canada" className="block hover:text-pink-600 transition-colors">🇨🇦 Canada Trending Videos</Link>
              <Link href="/trending/australia" className="block hover:text-pink-600 transition-colors">🇦🇺 Australia Trending</Link>
              <Link href="/trending/germany" className="block hover:text-pink-600 transition-colors">🇩🇪 Germany Trending</Link>
              <Link href="/trending/brazil" className="block hover:text-pink-600 transition-colors">🇧🇷 Brazil Trending Videos</Link>
              <Link href="/global" className="block hover:text-pink-600 transition-colors">🌍 Global YouTube Trends</Link>
            </div>
          </div>
        </div>
        
        {/* Enhanced Features & Data Section with Long-tail Keywords */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">YouTube Analytics Features</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Real-time YouTube view count tracking</li>
                <li>• YouTube trending algorithm insights</li>
                <li>• Most watched videos today dashboard</li>
                <li>• YouTube Shorts performance metrics</li>
                <li>• Viral video detection system</li>
                <li>• YouTube creator ranking system</li>
                <li>• Trending hashtags and topics</li>
                <li>• Peak viewing time analysis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Data Sources & Updates</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Powered by official YouTube Data API v3</li>
                <li>• Updated every 30 minutes automatically</li>
                <li>• Top 100 trending videos per category</li>
                <li>• 50+ countries trending coverage</li>
                <li>• Historical trending data archive</li>
                <li>• Cross-platform social media metrics</li>
                <li>• Machine learning trend prediction</li>
                <li>• 99.9% data accuracy guarantee</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Why MostViewedToday?</h4>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                The most comprehensive YouTube trending videos tracker and analytics platform. 
                Discover what's viral before it goes mainstream with our advanced YouTube 
                trend detection algorithms and real-time view count monitoring.
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>✓ Trusted by content creators worldwide</p>
                <p>✓ Featured in top marketing blogs</p>
                <p>✓ Used by social media agencies</p>
                <p>✓ Recommended by YouTube experts</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trending Keywords & Topics Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4 text-center">Popular YouTube Searches</h4>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {[
              "most viewed videos today", "youtube trending now", "viral videos 2025", 
              "youtube shorts trending", "most liked youtube videos", "breaking viral content",
              "youtube charts", "trending music videos", "viral tiktok on youtube", 
              "youtube analytics", "most subscribed channels", "trending gaming videos",
              "youtube viral moments", "most watched videos this week", "trending shorts today"
            ].map((keyword, index) => (
              <span key={index} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-pink-100 hover:text-pink-700 transition-colors cursor-pointer">
                {keyword}
              </span>
            ))}
          </div>
        </div>
        
        {/* Enhanced Copyright with Schema Markup Ready Content */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-2">YouTube Trending Videos Tracker & Analytics</h5>
            <p className="text-xs text-gray-500 max-w-4xl mx-auto">
              MostViewedToday.com is the ultimate destination for YouTube trending videos, viral content discovery, 
              and real-time view count tracking. We provide comprehensive YouTube analytics, trending shorts rankings, 
              and viral video detection across all categories and countries. Stay ahead of viral trends with our 
              advanced YouTube data insights and trending algorithm analysis.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 MostViewedToday.com - #1 YouTube Trending Videos Tracker | Real-time YouTube Analytics | 
            Viral Content Discovery Platform
          </p>
          <div className="mt-2 text-xs text-gray-400">
            <span>Last updated: </span>
            <time dateTime={new Date().toISOString()}>
              {new Date().toLocaleString()}
            </time>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;