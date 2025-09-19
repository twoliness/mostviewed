/**
 * Format view count for display (e.g., 1234567 -> "1.2M views")
 */
export function formatViewCount(count) {
  if (!count || count === 0) {
    return 'No views';
  }
  if (count >= 1000000000) {
    return `${(count / 1000000000).toFixed(1)}B views`;
  } else if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} views`;
}

/**
 * Format time ago (e.g., "2 hours ago")
 */
export function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Truncate title if too long
 */
export function truncateTitle(title, maxLength = 80) {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength).trim() + '...';
}

/**
 * Generate YouTube video URL
 */
export function getYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Generate YouTube channel URL
 */
export function getYouTubeChannelUrl(channelId) {
  return `https://www.youtube.com/channel/${channelId}`;
}

/**
 * Get category icon based on category ID
 */
export function getCategoryIcon(categoryId) {
  const iconMap = {
    10: '🎵', // Music
    20: '🎮', // Gaming
    17: '⚽', // Sports
    24: '🎭', // Entertainment
    25: '📰', // News & Politics
    26: '💄', // Howto & Style
    23: '😂', // Comedy
    22: '👥', // People & Blogs
    27: '📚', // Education
    28: '🔬', // Science & Technology
    1: '🎬',  // Film & Animation
    2: '🚗',  // Autos & Vehicles
    15: '🐾', // Pets & Animals
    19: '✈️', // Travel & Events
    21: '📹', // Videoblogging
    29: '🤝', // Nonprofits & Activism
    30: '🍿', // Movies
    31: '🌟', // Anime/Animation
    34: '📖', // Documentary
    35: '🎭', // Drama
  };
  
  return iconMap[categoryId] || '📺';
}