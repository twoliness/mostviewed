import Image from 'next/image';
import { formatViewCount, truncateTitle, getYouTubeUrl } from '@/lib/utils';

export default function BillboardCard({ video, rank }) {
  return (
    <div className="flex items-center space-x-4 group hover:bg-gray-50 py-2 px-3 transition-colors">
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className="text-2xl font-bold text-black">{rank}</span>
      </div>
      
      {/* Thumbnail */}
      <div className="flex-shrink-0 relative">
        <a 
          href={getYouTubeUrl(video.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="w-[60px] h-[60px] relative">
            <Image
              src={video.thumb_url}
              alt={video.title}
              fill
              className="rounded-md object-cover hover:opacity-90 transition-opacity"
            />
          </div>
          {!!video.is_short && (
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
          className="block group-hover:text-blue-600 transition-colors"
        >
          <h3 className="font-bold text-black text-base truncate leading-tight">
            {video.title}
          </h3>
        </a>
        
        <p className="text-gray-600 text-sm font-medium truncate leading-tight">
          {video.channel_title}
        </p>
        
        <div className="text-sm text-gray-500 leading-tight">
          <span className="font-medium">
            {formatViewCount(video.view_count)} views
          </span>
        </div>
      </div>
    </div>
  );
}