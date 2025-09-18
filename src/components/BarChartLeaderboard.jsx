import BarChartCard from './BarChartCard';
import { formatTimeAgo } from '@/lib/utils';

export default function BarChartLeaderboard({ 
  title, 
  videos, 
  loading = false, 
  error = null,
  lastUpdated = null,
  icon = '🏆'
}) {
  if (loading) {
    return (
      <div className="bg-amber-50 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse py-2">
            <div className="flex items-center space-x-4">
              <div className="w-48 h-12 bg-gray-300 rounded"></div>
              <div className="flex-1 h-12 bg-gray-300 rounded"></div>
              <div className="w-16 h-12 bg-gray-300 rounded"></div>
              <div className="w-20 h-6 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">❌ Error loading {title.toLowerCase()}</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-amber-50 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">📭 No videos available</div>
          <p className="text-gray-600">Check back later for updates</p>
        </div>
      </div>
    );
  }

  // Find max views for bar scaling
  const maxViews = Math.max(...videos.map(v => v.view_count));

  return (
    <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        
        {lastUpdated && (
          <p className="text-sm text-gray-600">
            Updated {formatTimeAgo(lastUpdated)}
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        {videos.map((video, index) => (
          <BarChartCard 
            key={video.id} 
            video={video} 
            rank={index + 1}
            maxViews={maxViews}
          />
        ))}
      </div>
    </div>
  );
}