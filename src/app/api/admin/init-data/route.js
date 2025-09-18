import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request) {
  try {
    const context = getCloudflareContext();
    const env = context.env;
    
    // Forward request to the trigger-collection API route  
    const triggerUrl = new URL('/api/trigger-collection', request.url);
    const response = await fetch(triggerUrl.toString(), {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Trigger API error: ${response.status}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Initial data collection triggered successfully',
      details: result
    }, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error triggering initial data collection:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to trigger initial data collection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}