import { POPULAR_CATEGORIES_DISPLAY, SUPPORTED_COUNTRIES } from '@/lib/types';

const BASE_URL = 'https://mostviewed.today';

export default function sitemap() {
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

  return [...staticRoutes, ...categoryRoutes, ...countryRoutes].map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
