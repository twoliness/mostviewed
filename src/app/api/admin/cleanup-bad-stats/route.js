import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request) {
  try {
    const context = getCloudflareContext();
    const env = context.env;
    const db = env.DB;

    console.log('[Cleanup] Starting cleanup of anomalous view count data...');

    // Find videos where view counts decreased by more than 50% between consecutive captures
    const anomalousStats = await db.prepare(`
      WITH ranked_stats AS (
        SELECT
          video_id,
          captured_at,
          view_count,
          LAG(view_count) OVER (PARTITION BY video_id ORDER BY captured_at) as prev_view_count,
          LAG(captured_at) OVER (PARTITION BY video_id ORDER BY captured_at) as prev_captured_at
        FROM video_stats
      )
      SELECT
        video_id,
        captured_at,
        view_count,
        prev_view_count,
        prev_captured_at,
        (prev_view_count - view_count) * 1.0 / prev_view_count as decrease_pct
      FROM ranked_stats
      WHERE prev_view_count IS NOT NULL
        AND view_count < prev_view_count * 0.5
      ORDER BY decrease_pct DESC
      LIMIT 100
    `).all();

    console.log(`[Cleanup] Found ${anomalousStats.results.length} anomalous stat entries`);

    if (anomalousStats.results.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No anomalous data found',
        deleted: 0
      });
    }

    // Delete the bad stats (keep the later, more accurate ones)
    let deletedCount = 0;
    for (const stat of anomalousStats.results) {
      // Delete the earlier stat with the anomalously high view count
      await db.prepare(`
        DELETE FROM video_stats
        WHERE video_id = ? AND captured_at = ?
      `).bind(stat.video_id, stat.prev_captured_at).run();

      deletedCount++;
      console.log(`[Cleanup] Deleted anomalous stat for ${stat.video_id}: ${stat.prev_view_count} views at ${stat.prev_captured_at}`);
    }

    console.log(`[Cleanup] Deleted ${deletedCount} anomalous stat entries`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} anomalous stat entries`,
      deleted: deletedCount,
      samples: anomalousStats.results.slice(0, 5)
    });

  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup anomalous data',
        details: error.message
      },
      { status: 500 }
    );
  }
}
