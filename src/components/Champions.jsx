import { formatViewCount } from '@/lib/utils';

export default function Champions({ 
  creators, 
  loading = false, 
  error = null 
}) {
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-center text-gray-400 mb-8 opacity-20">
          Champions
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
      {/* Champions Title */}
      <div className="text-center mb-8 relative">
        <h2 className="text-6xl font-bold text-gray-300 opacity-20 absolute inset-0 flex items-center justify-center">
          Champions
        </h2>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white relative z-10 pt-4">
          🏆 Top Creators
        </h2>
      </div>
      
      {/* Champions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {creators.slice(0, 3).map((creator, index) => {
          const rank = index + 1;
          const design = getChampionDesign(rank);
          const avatarGradient = getCreatorAvatar(creator);
          
          return (
            <a
              href={`https://www.youtube.com/channel/${creator.channel_id}`}
              target="_blank"
              rel="noopener noreferrer"
              key={creator.channel_id} 
              className={`${design.gradient} ${design.order} ${design.size} rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden cursor-pointer block`}
            >
              {/* Position Badge */}
              <div className="absolute top-4 right-4">
                <div className={`${design.badge} px-3 py-1 rounded-full text-sm font-bold shadow-md`}>
                  {design.position}
                </div>
              </div>

              {/* Large Position Number */}
              <div className="absolute top-8 left-8 text-6xl font-black text-white text-opacity-30">
                {rank}
              </div>
              
              {/* Creator Avatar - Hexagonal */}
              <div className="relative mx-auto mb-6" style={{ width: '96px', height: '96px' }}>
                <div 
                  className={`${avatarGradient} w-full h-full flex items-center justify-center text-white font-bold text-2xl shadow-lg`}
                  style={{
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                  }}
                >
                  {creator.channel_title.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Creator Info */}
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
                  {creator.channel_title}
                </h3>
                <p className="text-gray-700 text-sm mb-4 opacity-80">
                  Content Creator
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <div className="font-bold text-lg text-gray-900">
                      {creator.video_count}
                    </div>
                    <div className="text-xs text-gray-700 opacity-80">
                      Videos
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-bold text-lg text-gray-900">
                      {Math.round(creator.total_views / 1000000)}M
                    </div>
                    <div className="text-xs text-gray-700 opacity-80">
                      Total Views
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-bold text-lg text-gray-900">
                      {Math.round((creator.total_views / creator.video_count / 1000000) * 10) / 10}M
                    </div>
                    <div className="text-xs text-gray-700 opacity-80">
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