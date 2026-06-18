// Generates /public/llms.txt, /public/llms-full.txt, and /public/ai/{slug}.md
// per the llms.txt convention (llmstxt.org) so AI assistants/answer engines
// can discover and cite this site's pages.
//
// Re-run after adding/removing leaderboard pages, categories, or countries:
//   node scripts/generate-ai-files.mjs
//
// Category/country lists are mirrored from src/lib/types.js (kept inline here
// since this script runs in plain Node, outside the Next.js build pipeline).

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const AI_DIR = path.join(PUBLIC_DIR, 'ai');

const BASE_URL = 'https://mostviewed.today';
const GENERATED_AT = new Date().toISOString().slice(0, 10);

const SITE_NAME = 'Most Viewed Today';
const SITE_DESCRIPTION =
  'A YouTube trending tracker that ranks the most viewed videos and Shorts worldwide, refreshed roughly every 30 minutes from live YouTube Data API snapshots.';

const LEADERBOARD_PAGES = [
  {
    slug: 'global-leaderboard',
    path: '/',
    title: 'Global YouTube Trending Leaderboard',
    description:
      'All-categories leaderboard of the most viewed YouTube videos right now, with tabs for top categories and trending Shorts.',
  },
  {
    slug: 'shorts',
    path: '/shorts',
    title: 'YouTube Shorts Leaderboard',
    description: 'Most viewed short-form YouTube videos today, ranked globally.',
  },
  {
    slug: 'global',
    path: '/global',
    title: 'Global YouTube Trends',
    description:
      'Global YouTube trending leaderboard with the most viewed videos worldwide, updated frequently.',
  },
  {
    slug: 'trending-now',
    path: '/trending-now',
    title: 'Trending Now',
    description: 'What is trending right now on YouTube, ranked by live, high-velocity view growth.',
  },
  {
    slug: 'viral-videos',
    path: '/viral-videos',
    title: 'Viral Videos Today',
    description:
      'The most viral YouTube videos today, based on rapid high-view performance from newly published content.',
  },
  {
    slug: 'breaking-videos',
    path: '/breaking-videos',
    title: 'Breaking Viral Content',
    description: 'Breaking viral YouTube videos from very recent uploads that are already pulling high views.',
  },
  {
    slug: 'most-liked',
    path: '/most-liked',
    title: 'Most Liked Videos',
    description: 'Most liked YouTube videos today, ranked by engagement alongside view context.',
  },
  {
    slug: 'monthly-top',
    path: '/monthly-top',
    title: 'Monthly Top Videos',
    description: 'Top YouTube videos ranked by peak performance over the last 30 days.',
  },
  {
    slug: 'weekly-charts',
    path: '/weekly-charts',
    title: 'Weekly YouTube Charts',
    description: 'Top performing YouTube videos ranked by peak view counts over the past 7 days.',
  },
  {
    slug: 'top-creators',
    path: '/top-creators',
    title: 'Top YouTube Creators',
    description: 'Top YouTube creators ranked by total views across their leading videos and channels.',
  },
];

// Mirrors src/lib/types.js POPULAR_CATEGORIES_DISPLAY
const CATEGORIES = [
  { id: 10, name: 'Music', slug: 'music' },
  { id: 20, name: 'Gaming', slug: 'gaming' },
  { id: 17, name: 'Sports', slug: 'sports' },
  { id: 24, name: 'Entertainment', slug: 'entertainment' },
  { id: 25, name: 'News & Politics', slug: 'news-politics' },
  { id: 26, name: 'Howto & Style', slug: 'howto-style' },
  { id: 23, name: 'Comedy', slug: 'comedy' },
  { id: 22, name: 'People & Blogs', slug: 'people-blogs' },
  { id: 28, name: 'Science & Technology', slug: 'science-technology' },
  { id: 27, name: 'Education', slug: 'education' },
  { id: 1, name: 'Film & Animation', slug: 'film-animation' },
  { id: 2, name: 'Autos & Vehicles', slug: 'autos-vehicles' },
  { id: 15, name: 'Pets & Animals', slug: 'pets-animals' },
];

// Mirrors src/lib/types.js SUPPORTED_COUNTRIES
const COUNTRIES = [
  { code: 'US', name: 'United States', slug: 'usa' },
  { code: 'GB', name: 'United Kingdom', slug: 'uk' },
  { code: 'CA', name: 'Canada', slug: 'canada' },
  { code: 'AU', name: 'Australia', slug: 'australia' },
  { code: 'IN', name: 'India', slug: 'india' },
  { code: 'DE', name: 'Germany', slug: 'germany' },
  { code: 'BR', name: 'Brazil', slug: 'brazil' },
];

function categoryPage(category) {
  return {
    slug: `category-${category.slug}`,
    path: `/category/${category.slug}`,
    title: `${category.name} – YouTube Trending Videos`,
    description: `Most viewed YouTube videos right now in the ${category.name} category.`,
  };
}

function countryPage(country) {
  return {
    slug: `trending-${country.slug}`,
    path: `/trending/${country.slug}`,
    title: `YouTube Trending in ${country.name}`,
    description: `Most viewed YouTube videos trending in ${country.name} (${country.code}) right now.`,
  };
}

function pageMarkdown(page, type) {
  const url = `${BASE_URL}${page.path}`;
  return `---
title: "${page.title}"
description: "${page.description}"
url: "${url}"
site: "${SITE_NAME}"
type: "${type}"
data_refresh: "Rankings are refreshed roughly every 30 minutes from live YouTube Data API snapshots; Shorts and country/trending data refresh on their own faster or hourly cycles."
generated: "${GENERATED_AT}"
---

# ${page.title}

${page.description}

This is a live, continuously updated leaderboard page on ${SITE_NAME} (${BASE_URL}). Numbers on this static summary are not live — view the canonical URL below for current rankings, view counts, and timestamps.

Canonical page: ${url}
`;
}

function buildPages() {
  const pages = [
    ...LEADERBOARD_PAGES.map((p) => ({ ...p, type: 'leaderboard' })),
    ...CATEGORIES.map((c) => ({ ...categoryPage(c), type: 'category' })),
    ...COUNTRIES.map((c) => ({ ...countryPage(c), type: 'country' })),
  ];
  return pages;
}

function buildLlmsTxt(pages) {
  const leaderboards = pages.filter((p) => p.type === 'leaderboard');
  const categories = pages.filter((p) => p.type === 'category');
  const countries = pages.filter((p) => p.type === 'country');

  const section = (title, items) =>
    `## ${title}\n` +
    items.map((p) => `- [${p.title}](${BASE_URL}/ai/${p.slug}.md): ${p.description}`).join('\n') +
    '\n';

  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} (${BASE_URL}) tracks YouTube video and Shorts performance globally and by category and country, using periodic snapshots from the YouTube Data API. Each link below points to a clean Markdown summary of that page; for current rankings and view counts, follow the canonical URL inside each summary.

${section('Leaderboards', leaderboards)}
${section('Categories', categories)}
${section('Countries', countries)}
## Optional

- [Full combined content](${BASE_URL}/llms-full.txt): all page summaries above concatenated into a single Markdown file.
`;
}

function buildLlmsFullTxt(pages) {
  const header = `# ${SITE_NAME} — Full Content

> ${SITE_DESCRIPTION}

Generated: ${GENERATED_AT}
`;
  const bodies = pages.map((p) => pageMarkdown(p, p.type));
  return [header, ...bodies].join('\n---\n\n');
}

function main() {
  mkdirSync(AI_DIR, { recursive: true });

  const pages = buildPages();

  for (const page of pages) {
    writeFileSync(path.join(AI_DIR, `${page.slug}.md`), pageMarkdown(page, page.type));
  }

  writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), buildLlmsTxt(pages));
  writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), buildLlmsFullTxt(pages));

  console.log(`Generated llms.txt, llms-full.txt, and ${pages.length} files in /public/ai`);
}

main();
