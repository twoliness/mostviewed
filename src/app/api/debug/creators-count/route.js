import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    console.log('[API] Getting creators count for debugging');
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    
    const creatorsCount = await db.getCreatorsCount();
    
    // Also get a sample of creators to see what we're working with
    const sampleCreators = await db.getTopCreators(20);
    
    console.log(`[API] Found ${creatorsCount} unique creators in database`);
    
    return NextResponse.json({
      total_creators: creatorsCount,
      sample_creators: sampleCreators,
      message: `Found ${creatorsCount} unique creators in the database`
    });
  } catch (error) {
    console.error('[API] Error getting creators count:', error);
    return NextResponse.json(
      { error: 'Failed to get creators count' },
      { status: 500 }
    );
  }
}