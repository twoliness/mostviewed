import Image from 'next/image';
import { formatViewCount, truncateTitle, getYouTubeUrl } from '@/lib/utils';

export default function VideoCard({ video, rank, compact = false, noShadow = false }) {
  const thumbnailWidth = compact ? 80 : 120;
  const thumbnailHeight = compact ? 60 : 90;
  const padding = compact ? "p-3" : "p-4";
  const spacing = compact ? "space-x-3" : "space-x-4";
  const rankSize = compact ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  const shadowClass = noShadow ? "" : "shadow-md hover:shadow-lg transition-shadow";

  return (
    <div className={`flex items-center ${spacing} ${padding} bg-white dark:bg-gray-800 rounded-lg ${shadowClass}`}>
      {/* Rank */}
      <div className={`flex-shrink-0 ${rankSize} bg-red-600 text-white rounded-full flex items-center justify-center font-bold`}>
        {rank}
      </div>
      
      {/* Thumbnail */}
      <div className="flex-shrink-0 relative">
        <a 
          href={getYouTubeUrl(video.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Image
            src={video.thumb_url}
            alt={video.title}
            width={thumbnailWidth}
            height={thumbnailHeight}
            className="rounded-md object-cover hover:opacity-90 transition-opacity"
          />
          {video.is_short && (
            <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
              SHORT
            </div>
          )}
        </a>
      </div>
      
      {/* Video Info */}
      <div className="flex-grow min-w-0">
        <a 
          href={getYouTubeUrl(video.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:text-red-600 transition-colors"
        >
          <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
            {truncateTitle(video.title, compact ? 60 : 80)}
          </h3>
        </a>
        
        <p className={`text-gray-600 dark:text-gray-300 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {video.channel_title}
        </p>
        
        <div className={`flex items-center text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
          <span className="font-medium text-red-600">
            {formatViewCount(video.view_count)}
          </span>
        </div>
      </div>
    </div>
  );
}