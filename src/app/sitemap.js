import { getCloudflareContext } from '@opennextjs/cloudflare';
import { POPULAR_CATEGORIES_DISPLAY, SUPPORTED_COUNTRIES } from '@/lib/types';
import { videoSlug } from '@/lib/utils';

const BASE_URL = 'https://mostviewed.today';

export default async function sitemap() {
  const now = new Date();

  const staticRoutes = [
    { path: '/', changeFrequency: 'hourly', priority: 1.0 },
    { path: '/shorts', changeFrequency: 'hourly', priority: 0.9 },
    { path: '/global', changeFrequency: 'daily', priority: 0.7 },
    { path: '/trending-now', changeFrequency: 'daily', priority: 0.7 },
    { path: '/viral-videos', changeFrequency: 'daily', priority: 0.7 },
    { path: '/breaking-videos', changeFrequency: 'daily', priority: 0.7 },
    { path: '/most-liked', changeFrequency: 'daily', priority: 0.7 },
    { path: '/monthly-top', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/weekly-charts', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/top-creators', changeFrequency: 'daily', priority: 0.8 },
  ];

  const categoryRoutes = POPULAR_CATEGORIES_DISPLAY.map((category) => ({
    path: `/category/${category.slug}`,
    changeFrequency: 'hourly',
    priority: 0.85,
  }));

  const countryRoutes = SUPPORTED_COUNTRIES.map((country) => ({
    path: `/trending/${country.slug}`,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  let videoRoutes = [];
  try {
    const { env } = getCloudflareContext();
    const result = await env.DB.prepare(`
      SELECT v.id, v.title, vs.last_seen
      FROM video_summary vs
      JOIN videos v ON v.id = vs.video_id
      WHERE vs.last_seen > datetime('now', '-30 days')
      ORDER BY vs.current_views DESC
      LIMIT 500
    `).all();
    videoRoutes = (result.results || []).map((video) => ({
      url: `${BASE_URL}/video/${videoSlug(video)}`,
      lastModified: video.last_seen ? new Date(video.last_seen) : now,
      changeFrequency: 'daily',
      priority: 0.75,
    }));
  } catch {
    // DB unavailable at build time — video routes omitted
  }

  const staticEntries = [...staticRoutes, ...categoryRoutes, ...countryRoutes].map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return [...staticEntries, ...videoRoutes];
}
