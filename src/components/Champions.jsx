import { formatViewCount } from '@/lib/utils';

export default function Champions({ 
  creators, 
  loading = false, 
  error = null 
}) {
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-8xl font-bold text-center text-gray-200 mb-8 opacity-30">
          Top Creators
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 rounded-lg p-6 text-center min-h-[300px]">
                <div className="w-24 h-24 bg-gray-400 rounded-full mx-auto mb-4"></div>
                <div className="h-6 bg-gray-400 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-400 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !creators || creators.length < 3) {
    return null; // Don't show champions if there's an error or insufficient data
  }

  const getChampionDesign = (rank) => {
    if (rank === 1) return {
      gradient: 'bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-400',
      position: '1st',
      badge: 'bg-yellow-500 text-yellow-900',
      order: 'md:order-2', // Center position
      size: 'scale-110'
    };
    if (rank === 2) return {
      gradient: 'bg-gradient-to-br from-cyan-200 via-cyan-300 to-cyan-400', 
      position: '2nd',
      badge: 'bg-cyan-500 text-cyan-900',
      order: 'md:order-3', // Right position
      size: 'scale-100'
    };
    if (rank === 3) return {
      gradient: 'bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400',
      position: '3rd', 
      badge: 'bg-orange-500 text-orange-900',
      order: 'md:order-1', // Left position
      size: 'scale-100'
    };
  };

  const getCreatorAvatar = (creator) => {
    // Generate a consistent color based on channel name
    const colors = [
      'from-purple-400 to-pink-400',
      'from-blue-400 to-indigo-400', 
      'from-green-400 to-emerald-400',
      'from-red-400 to-rose-400',
      'from-yellow-400 to-orange-400'
    ];
    const colorIndex = creator.channel_title.length % colors.length;
    return `bg-gradient-to-br ${colors[colorIndex]}`;
  };

  return (
    <div className="mb-12">
      {/* Top Creators Title */}
      <div className="text-center mb-8 relative">
        <h2 className="text-8xl font-bold text-gray-200 opacity-30">
          Top Creators
        </h2>
      </div>
      
      {/* Creator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {creators.slice(0, 3).map((creator, index) => {
          const rank = index + 1;
          const design = getChampionDesign(rank);
          
          return (
            <a
              href={`https://www.youtube.com/channel/${creator.channel_id}`}
              target="_blank"
              rel="noopener noreferrer"
              key={creator.channel_id} 
              className="bg-white border border-gray-200 rounded-2xl p-6 text-center relative overflow-hidden cursor-pointer block transition-transform hover:scale-105"
            >
              {/* Position Number */}
              <div className="absolute top-6 left-6 text-6xl font-black text-gray-200">
                {rank}
              </div>
              
              {/* Position Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-gray-900 text-white px-3 py-1 rounded text-sm font-bold">
                  ✕ {83 - index * 3}
                </div>
              </div>

              {/* Creator Avatar - Hexagonal */}
              <div className="relative mx-auto mb-4 mt-8" style={{ width: '80px', height: '80px' }}>
                {creator.avatar_url ? (
                  <div 
                    className="bg-white w-full h-full bg-cover bg-center"
                    style={{
                      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                      backgroundImage: `url(${creator.avatar_url})`
                    }}
                  />
                ) : (
                  <div 
                    className="bg-white w-full h-full flex items-center justify-center text-gray-800 font-bold text-2xl"
                    style={{
                      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                    }}
                  >
                    {creator.channel_title.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Creator Info */}
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-black mb-1 truncate">
                  {creator.channel_title} ✓
                </h3>
                <p className="text-blue-600 text-sm mb-4 font-medium">
                  Content Creator
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="font-bold text-2xl text-black">
                      {creator.video_count}
                    </div>
                    <div className="text-sm text-gray-600">
                      Videos
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-bold text-2xl text-black">
                      {creator.subscriber_count ? Math.round(creator.subscriber_count / 1000000) + 'M' : Math.round(creator.total_views / 1000000)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {creator.subscriber_count ? 'Subscribers' : 'Total Views'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-bold text-2xl text-black">
                      {Math.round((creator.total_views / creator.video_count / 1000000) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Avg Views
                    </div>
                  </div>
                </div>

              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}