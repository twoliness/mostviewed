import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    console.log('[API] Fetching top creators from database');
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    const data = await db.getTopCreators(10);
    
    console.log(`[API] Found ${data.length} top creators`);
    
    // If no data, return empty array with appropriate message
    if (data.length === 0) {
      console.log('[API] No creator data found in database');
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      });
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching top creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top creators data' },
      { status: 500 }
    );
  }
}