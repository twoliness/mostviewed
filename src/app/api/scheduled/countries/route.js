import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { YouTubeApiService, POPULAR_CATEGORIES } from '@/lib/youtube-api';
import { DatabaseService } from '@/lib/database';

// Countries to collect data for
const COUNTRIES = [
  { code: 'US', name: 'USA' },
  { code: 'GB', name: 'UK' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' }
];

export async function POST(request) {
  try {
    console.log('[Countries API] Manual country data collection triggered');

    const context = getCloudflareContext();
    const env = context.env;

    // Use the countries API key
    if (!env.YOUTUBE_COUNTRIES_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube Countries API key not configured' },
        { status: 500 }
      );
    }

    const youtube = new YouTubeApiService(env.YOUTUBE_COUNTRIES_API_KEY);
    const db = new DatabaseService(env.DB);

    const results = {};

    for (const country of COUNTRIES) {
      console.log(`[Countries API] Collecting data for ${country.name} (${country.code})`);

      try {
        // Collect global trending videos for this country (50 videos)
        console.log(`[Countries API] Fetching trending videos for ${country.name}...`);
        const globalVideos = await youtube.getMostPopularVideosByRegion(country.code, 50);

        const globalData = globalVideos.map(video => {
          const transformed = youtube.transformToDbFormat(video);
          if (transformed) {
            transformed.video.country_code = country.code;
          }
          return transformed;
        }).filter(Boolean);

        await db.batchUpsertVideosWithStats(globalData);
        console.log(`[Countries API] Inserted ${globalData.length} videos for ${country.name}`);

        // Collect global shorts for this country (50 shorts)
        console.log(`[Countries API] Fetching trending shorts for ${country.name}...`);
        const globalShorts = await youtube.getMostPopularShortsByRegion(country.code, 50);

        const shortsData = globalShorts.map(video => {
          const transformed = youtube.transformToDbFormat(video);
          if (transformed) {
            transformed.video.country_code = country.code;
          }
          return transformed;
        }).filter(Boolean);

        await db.batchUpsertVideosWithStats(shortsData);
        console.log(`[Countries API] Inserted ${shortsData.length} shorts for ${country.name}`);

        // Collect category-specific data for this country
        let categoryVideosCount = 0;
        let categoryShortsCount = 0;

        for (const categoryId of POPULAR_CATEGORIES) {
          try {
            // Collect videos for this category (50 videos)
            const categoryVideos = await youtube.getMostPopularVideosByCategoryAndRegion(country.code, categoryId, 50);

            const categoryData = categoryVideos.map(video => {
              const transformed = youtube.transformToDbFormat(video);
              if (transformed) {
                transformed.video.country_code = country.code;
              }
              return transformed;
            }).filter(Boolean);

            if (categoryData.length > 0) {
              await db.batchUpsertVideosWithStats(categoryData);
              categoryVideosCount += categoryData.length;
            }

            // Small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 100));

            // Collect shorts for this category (50 shorts)
            const categoryShorts = await youtube.getMostPopularShortsByCategoryAndRegion(country.code, categoryId, 50);

            const categoryShortsData = categoryShorts.map(video => {
              const transformed = youtube.transformToDbFormat(video);
              if (transformed) {
                transformed.video.country_code = country.code;
              }
              return transformed;
            }).filter(Boolean);

            if (categoryShortsData.length > 0) {
              await db.batchUpsertVideosWithStats(categoryShortsData);
              categoryShortsCount += categoryShortsData.length;
            }

            // Small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`[Countries API] Error fetching category ${categoryId} for ${country.name}:`, error);
          }
        }

        results[country.code] = {
          country: country.name,
          globalVideos: globalData.length,
          globalShorts: shortsData.length,
          categoryVideos: categoryVideosCount,
          categoryShorts: categoryShortsCount,
          total: globalData.length + shortsData.length + categoryVideosCount + categoryShortsCount
        };

        console.log(`[Countries API] Completed ${country.name}: ${results[country.code].total} videos`);

        // Delay between countries to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[Countries API] Error collecting data for ${country.name}:`, error);
        results[country.code] = {
          country: country.name,
          error: error.message
        };
      }
    }

    const summary = {
      success: true,
      message: 'Country data collection completed',
      timestamp: new Date().toISOString(),
      results: results
    };

    console.log('[Countries API] Data collection completed', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('[Countries API] Error in country data collection:', error);

    return NextResponse.json({
      success: false,
      error: 'Country data collection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
