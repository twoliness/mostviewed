import VideoPreview from './VideoPreview';
import { formatTimeAgo } from '@/lib/utils';

export default function VideoGrid({ 
  title, 
  videos, 
  loading = false, 
  error = null,
  lastUpdated = null,
  icon = '🏆',
  columns = 2
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-300 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">❌ Error loading {title.toLowerCase()}</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200">
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">📭 No videos available</div>
          <p className="text-gray-600">Check back later for updates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        
        {lastUpdated && (
          <p className="text-sm text-gray-600">
            Updated {formatTimeAgo(lastUpdated)}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.slice(0, 6).map((video, index) => (
          <VideoPreview 
            key={video.id} 
            video={video} 
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}