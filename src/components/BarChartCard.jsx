import Image from 'next/image';
import { formatViewCount, truncateTitle, getYouTubeUrl } from '@/lib/utils';

const barColors = [
  'bg-orange-400', // Golden
  'bg-pink-400',   // Rose
  'bg-orange-400', // Orange
  'bg-pink-500',   // Pink
  'bg-orange-400', // Orange
  'bg-green-400',  // Green
  'bg-blue-400',   // Blue
  'bg-orange-500', // Orange
  'bg-purple-400', // Purple
  'bg-purple-500', // Purple
];

export default function BarChartCard({ video, rank, maxViews }) {
  // Calculate bar width as percentage of max views
  const barWidth = (video.view_count / maxViews) * 100;
  const barColor = barColors[(rank - 1) % barColors.length];

  return (
    <div className="flex items-stretch py-1 relative">
      {/* Thumbnail on the left - same height as bar */}
      <div className="w-12 h-12 mr-3 relative z-10 flex-shrink-0">
        <a 
          href={getYouTubeUrl(video.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative h-full"
        >
          <Image
            src={video.thumb_url}
            alt={video.title}
            width={48}
            height={48}
            className="rounded object-cover hover:opacity-90 transition-opacity h-full w-full"
          />
          {video.is_short && (
            <div className="absolute top-0 left-0 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
              SHORT
            </div>
          )}
        </a>
      </div>

      {/* Bar chart container with text overlay */}
      <div className="flex-1 relative h-12">
        {/* Animated bar */}
        <div 
          className={`h-full ${barColor} transition-all duration-1000 ease-out relative flex items-center`}
          style={{ width: `${barWidth}%`, minWidth: '200px' }}
        >
          {/* Video title and channel overlaid on the bar */}
          <div className="px-4 flex-1">
            <a 
              href={getYouTubeUrl(video.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-white hover:text-gray-200 transition-colors"
            >
              <h3 className="font-semibold text-sm leading-tight text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {truncateTitle(video.title, 40)}
              </h3>
              <p className="text-xs text-white text-opacity-90" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {video.channel_title}
              </p>
            </a>
          </div>
        </div>

        {/* View count positioned to the right of the bar with background */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 font-semibold text-sm text-gray-900 ml-4 bg-white bg-opacity-80 px-2 py-1 rounded whitespace-nowrap"
          style={{ left: `${Math.min(barWidth, 80)}%` }}
        >
          {formatViewCount(video.view_count)}
        </div>
      </div>
    </div>
  );
}