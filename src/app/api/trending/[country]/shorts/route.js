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
    const { country } = params;
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
    const cacheKey = `/api/trending/${country}/shorts`;
    const cached = await env.VIDTRENDS_CACHE.get(cacheKey);
    if (cached) {
      console.log(`[API] Returning cached shorts for ${country}`);
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    console.log(`[API] Fetching trending shorts for ${country} (${countryCode})`);
    const db = new DatabaseService(env.DB);

    // Get trending shorts for this country
    const data = await db.getCountryTrendingShorts(countryCode, 50);

    const response = JSON.stringify(data);

    // Cache the response for 5 minutes
    await env.VIDTRENDS_CACHE.put(cacheKey, response, { expirationTtl: 300 });
    console.log(`[API] Cached shorts response for ${country}`);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error(`[API] Error fetching shorts for country:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts data' },
      { status: 500 }
    );
  }
}
