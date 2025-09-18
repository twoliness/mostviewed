import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseService } from '@/lib/database';

export async function GET(request) {
  try {
    console.log('[API] Fetching categories from database');
    const context = getCloudflareContext();
    const env = context.env;
    const db = new DatabaseService(env.DB);
    const data = await db.getCategories();
    
    console.log(`[API] Found ${data.length} categories in database`);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories data' },
      { status: 500 }
    );
  }
}