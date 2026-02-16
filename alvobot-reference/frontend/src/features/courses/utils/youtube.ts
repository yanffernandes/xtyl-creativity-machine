// YouTube utility functions
// Feature: 027-courses-system

/**
 * Regex pattern to extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Extract YouTube video ID from a URL
 * @param url - YouTube URL in any supported format
 * @returns Video ID (11 characters) or null if invalid
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

/**
 * Check if a URL is a valid YouTube URL
 * @param url - URL to validate
 * @returns true if valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Get YouTube thumbnail URL from video ID
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality (default: mqdefault)
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(
  videoId: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'mqdefault'
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Get YouTube embed URL from video ID
 * @param videoId - YouTube video ID
 * @param options - Embed options
 * @returns Embed URL
 */
export function getEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    enablejsapi?: boolean;
    modestbranding?: boolean;
    rel?: boolean;
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.autoplay) params.set('autoplay', '1');
  if (options.enablejsapi !== false) params.set('enablejsapi', '1');
  if (options.modestbranding !== false) params.set('modestbranding', '1');
  if (options.rel === false) params.set('rel', '0');

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Format duration in minutes to human readable string
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "1h 30min" or "45min")
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '';

  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}
