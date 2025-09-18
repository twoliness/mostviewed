import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    console.log('[API] Fetching global leaderboard from database');
    const context = getCloudflareContext();
    const env = context.env;    const db = new DatabaseService(env.DB);
    const data = await db.getGlobalLeaderboard(10);
    
    console.log(`[API] Found ${data.length} videos in global leaderboard`);
    
    // If no data, return empty array with appropriate message
    if (data.length === 0) {
      console.log('[API] No data found in database - you may need to run initial data collection');
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, max-age=60', // Shorter cache when no data
        },
      });
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching global leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}