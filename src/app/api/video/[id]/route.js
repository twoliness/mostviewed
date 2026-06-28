import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getVideoDetail } from '@/lib/video-detail';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    if (!id || !VIDEO_ID_RE.test(id)) {
      return NextResponse.json({ error: 'invalid video id' }, { status: 400 });
    }
    const { env } = getCloudflareContext();
    if (!env.DB) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const detail = await getVideoDetail(env.DB, id);
    if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json(detail, {
      headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[GET /api/video/:id] error', error);
    return NextResponse.json({ error: error?.message || 'unknown' }, { status: 500 });
  }
}
