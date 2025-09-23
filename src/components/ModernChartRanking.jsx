import React from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, Award, Flame } from 'lucide-react';
import { formatViewCount, formatViewCountShort, formatTimeAgo, getYouTubeUrl } from '@/lib/utils';

const ModernChartRanking = ({ 
  videos, 
  title, 
  loading = false, 
  error = null,
  lastUpdated = null,
  isShorts = false,
  showStats = true,
  categorySlug = null 
}) => {
  const getRankChange = (currentRank, lastWeekRank) => {
    if (lastWeekRank === null || lastWeekRank === undefined) {
      return { type: 'new', icon: '★', color: 'text-blue-600' };
    }
    if (lastWeekRank > currentRank) {
      return { 
        type: 'up', 
        icon: <TrendingUp className="w-4 h-4" />, 
        color: 'text-green-600', 
        change: lastWeekRank - currentRank 
      };
    }
    if (lastWeekRank < currentRank) {
      return { 
        type: 'down', 
        icon: <TrendingDown className="w-4 h-4" />, 
        color: 'text-red-600', 
        change: currentRank - lastWeekRank 
      };
    }
    return { type: 'same', icon: <Minus className="w-4 h-4" />, color: 'text-gray-500' };
  };

  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getViewsWithoutText = (views) => {
    return formatViewCountShort(views);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
          <div className="h-6 w-48 bg-pink-200 rounded-full animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6">
              <div className="flex items-center space-x-6">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-2/3 animate-pulse"></div>
                </div>
                <div className="w-20 text-right">
                  <div className="h-5 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-red-400 text-lg mb-2">⚠️ Error loading data</div>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-gray-400 text-lg mb-2">📂 No videos available</div>
          <p className="text-gray-500 text-sm">Check back later for updates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            {lastUpdated && (
              <div className="text-xs text-gray-500 mt-1">
                Updated {formatTimeAgo(lastUpdated)}
              </div>
            )}
          </div>
          {categorySlug ? (
            <a 
              href={`/category/${categorySlug}`}
              className="text-pink-600 hover:text-pink-700 font-medium text-sm transition-colors duration-200"
            >
              View Charts →
            </a>
          ) : (
            <span className="text-gray-400 text-sm">
              View Charts →
            </span>
          )}
        </div>
      </div>


      {/* Rankings */}
      <div className="divide-y divide-gray-50">
        {videos.map((video, index) => {
          const rank = index + 1;
          const rankChange = getRankChange(rank, video.last_rank);
          
          return (
            <div key={video.id} className="p-6 hover:bg-pink-25 transition-colors duration-200">
              <div className="flex items-center space-x-6">
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 font-bold text-sm">
                  {rank}
                </div>

                {/* Thumbnail - Square */}
                <div className="flex-shrink-0 relative">
                  <a href={getYouTubeUrl(video.id)} target="_blank" rel="noopener noreferrer">
                    <img
                      src={video.thumb_url}
                      alt={video.title}
                      className="w-16 h-16 rounded-xl object-cover hover:opacity-90 transition-opacity duration-200 border border-gray-100"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded-md">
                      {formatDuration(video.duration)}
                    </div>
                    {isShorts && (
                      <div className="absolute top-1 left-1">
                        <Clock className="w-3 h-3 text-white bg-pink-500 rounded p-0.5" />
                      </div>
                    )}
                  </a>
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight">
                    <a href={getYouTubeUrl(video.id)} target="_blank" rel="noopener noreferrer" 
                       className="hover:text-pink-600 transition-colors duration-200">
                      {video.title}
                    </a>
                  </h3>
                  <p className="text-gray-600 font-medium text-sm">{video.channel_title}</p>
                </div>

                {/* Views */}
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {getViewsWithoutText(video.view_count)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    views
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ModernChartRanking;