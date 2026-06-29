import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { BreakoutService } from '@/lib/breakout';

export async function POST() {
  try {
    const { env } = getCloudflareContext();
    const breakout = new BreakoutService(env.DB);
    const stats = await breakout.refreshCandidatesLayer2(env.YOUTUBE_API_KEY);

    console.log('[Breakout L2] Refresh complete:', stats);

    if (env.VIDTRENDS_CACHE && stats.refreshed > 0) {
      await env.VIDTRENDS_CACHE.delete('/api/leaderboard/breakouts');
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error('[Breakout L2] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
