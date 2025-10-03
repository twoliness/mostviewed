import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

// Country code mapping
const COUNTRY_CODES = {
  'usa': 'US',
  'uk': 'GB',
  'canada': 'CA',
  'australia': 'AU',
  'india': 'IN',
  'germany': 'DE',
  'france': 'FR',
  'japan': 'JP',
  'brazil': 'BR',
  'mexico': 'MX'
};

export async function GET(request, { params }) {
  try {
    const { country, slug } = params;
    const countryCode = COUNTRY_CODES[country.toLowerCase()];

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Invalid country code' },
        { status: 400 }
      );
    }

    const context = getCloudflareContext();
    const env = context.env;

    // Check cache first
    const cacheKey = `/api/trending/${country}/category/${slug}`;
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[API] Returning cached category ${slug} for ${country}`);
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    console.log(`[API] Fetching category ${slug} for ${country} (${countryCode})`);
    const db = new DatabaseService(env.DB);

    // Get category by slug
    const category = await db.getCategoryBySlug(slug);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get trending videos for this category and country
    const data = await db.getCountryCategoryVideos(countryCode, category.id, 50);

    const response = JSON.stringify(data);

    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log(`[API] Cached category ${slug} response for ${country}`);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching category for country:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch category data' },
      { status: 500 }
    );
  }
}
