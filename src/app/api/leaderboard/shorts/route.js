import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    const context = getCloudflareContext();
    const env = context.env;

    console.log('[API] Fetching shorts leaderboard from database');
    const db = new DatabaseService(env.DB);
    const data = await db.getGlobalShortsLeaderboard(10);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error fetching shorts leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts leaderboard data' },
      { status: 500 }
    );
  }
}