import VideoCard from './VideoCard';
import { formatTimeAgo } from '@/lib/utils';

export default function Leaderboard({ 
  title, 
  videos, 
  loading = false, 
  error = null,
  lastUpdated = null,
  icon = '🏆',
  layout = 'single', // 'single' or 'two-column'
  compact = false, // for smaller visuals
  noShadow = false // remove shadows from cards
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="w-30 h-20 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
              <div className="flex-grow space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">❌ Error loading {title.toLowerCase()}</div>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg">📭 No videos available</div>
        <p className="text-gray-600 dark:text-gray-400">Check back later for updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        
        {lastUpdated && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Updated {formatTimeAgo(lastUpdated)}
          </p>
        )}
      </div>
      
      {layout === 'two-column' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* First column - ranks 1-5 */}
          <div className="space-y-4">
            {videos.slice(0, 5).map((video, index) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                rank={index + 1}
                compact={compact}
                noShadow={noShadow}
              />
            ))}
          </div>
          
          {/* Second column - ranks 6-10 */}
          <div className="space-y-4">
            {videos.slice(5, 10).map((video, index) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                rank={index + 6}
                compact={compact}
                noShadow={noShadow}
              />
            ))}
          </div>
        </div>
      ) : (
        videos.map((video, index) => (
          <VideoCard 
            key={video.id} 
            video={video} 
            rank={index + 1}
            compact={compact}
            noShadow={noShadow}
          />
        ))
      )}
    </div>
  );
}