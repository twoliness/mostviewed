import BillboardCard from './BillboardCard';
import { formatTimeAgo } from '@/lib/utils';

export default function BillboardLeaderboard({ 
  title, 
  videos, 
  loading = false, 
  error = null,
  lastUpdated = null,
  viewChartText = "VIEW CHART",
  limit = 5
}) {
  if (loading) {
    return (
      <div className="bg-white">
        {/* Header */}
        <div className="bg-[#00ff7f] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black uppercase tracking-wide">{title}</h2>
          <button className="text-xs font-semibold text-black uppercase tracking-wider hover:underline">
            {viewChartText}
          </button>
        </div>
        
        {/* Loading Content */}
        <div className="px-6 pb-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4 py-3">
              <div className="w-12 h-12 bg-gray-300 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white">
        <div className="bg-[#00ff7f] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black uppercase tracking-wide">{title}</h2>
          <button className="text-xs font-semibold text-black uppercase tracking-wider hover:underline">
            {viewChartText}
          </button>
        </div>
        <div className="px-6 pb-6 text-center">
          <div className="text-red-500 text-lg mb-2">❌ Error loading data</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-white">
        <div className="bg-[#00ff7f] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black uppercase tracking-wide">{title}</h2>
          <button className="text-xs font-semibold text-black uppercase tracking-wider hover:underline">
            {viewChartText}
          </button>
        </div>
        <div className="px-6 pb-6 text-center">
          <div className="text-gray-500 text-lg">📭 No videos available</div>
          <p className="text-gray-600">Check back later for updates</p>
        </div>
      </div>
    );
  }

  const displayVideos = videos.slice(0, limit);

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-[#00ff7f] px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-black uppercase tracking-wide">{title}</h2>
        <button className="text-xs font-semibold text-black uppercase tracking-wider hover:underline">
          {viewChartText}
        </button>
      </div>
      
      {/* Content */}
      <div className="px-6 pb-6">
        {displayVideos.map((video, index) => (
          <BillboardCard 
            key={video.id} 
            video={video} 
            rank={index + 1}
          />
        ))}
        
        {lastUpdated && (
          <div className="mt-4 pt-3">
            <p className="text-xs text-gray-500 text-center">
              Updated {formatTimeAgo(lastUpdated)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}