import Image from 'next/image';
import { formatViewCount, getYouTubeUrl } from '@/lib/utils';

export default function VideoPreview({ video, rank, showRank = true }) {
  const thumbnailUrl = video.thumb_url;
  const videoUrl = getYouTubeUrl(video.id);

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Thumbnail with Play Button Overlay */}
      <div className="relative aspect-video bg-gray-100">
        <a 
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative h-full"
        >
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-red-600 rounded-full p-3 transform scale-100 hover:scale-110 transition-transform">
              <svg 
                className="w-8 h-8 text-white ml-1" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>

          {/* Rank Badge */}
          {showRank && (
            <div className="absolute top-2 left-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {rank}
            </div>
          )}

          {/* Duration/Short Badge */}
          <div className="absolute bottom-2 right-2">
            {video.is_short ? (
              <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                SHORT
              </div>
            ) : (
              <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                VIDEO
              </div>
            )}
          </div>
        </a>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <a 
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:text-red-600 transition-colors"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight">
            {video.title}
          </h3>
        </a>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {video.channel_title}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-red-600">
            {formatViewCount(video.view_count)}
          </span>
          {video.is_short && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              📱 Short
            </span>
          )}
        </div>
      </div>
    </div>
  );
}