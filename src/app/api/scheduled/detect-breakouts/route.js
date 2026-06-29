import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { BreakoutService } from '@/lib/breakout';

export async function POST() {
  try {
    const { env } = getCloudflareContext();
    const breakout = new BreakoutService(env.DB);

    const stats = await breakout.runDetection();

    if (stats.skipped) {
      console.log('[Breakout] Detection skipped:', stats.reason);
      return NextResponse.json({ ok: true, skipped: true, reason: stats.reason });
    }

    console.log('[Breakout] Detection complete:', stats);

    // Bust the breakouts leaderboard cache so next request reflects new data
    if (env.VIDTRENDS_CACHE) {
      await env.VIDTRENDS_CACHE.delete('/api/leaderboard/breakouts');
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[Breakout] Detection error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
