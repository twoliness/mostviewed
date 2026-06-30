# VidTrends — Rollup & Reconstruction Notes

Captures the design decisions behind the rollup layer (Phase 2/3) and the historical rank reconstruction work. Lives in repo so it ships with the code.

## Problem

`video_stats` is full snapshot history — ~218 rows per video on average, 44.5M total, never overwritten. Per-video pages can't query it directly: too slow, too expensive on D1 billing. We needed an MV-equivalent.

## Schema added

| Table | Purpose | Refresh |
|---|---|---|
| `video_summary` | One row per video. Denormalized state for per-video page (current/peak rank, days_on_chart, peak velocity, engagement). | Inline in each cron tick for touched videos |
| `video_rank_history` | Append-only `(video_id, captured_at, chart, rank)`. PK on all three. | Inline in each cron tick |
| `video_daily_stats` | Daily fold of `video_stats`. | Not yet wired |
| `creator_summary` | Per-channel aggregate. | Daily cron `25 3 * * *` |
| `country_daily_summary` + `country_category_daily` | Per-country day aggregates. | Daily cron `25 3 * * *` |

## Why peak rank is the data moat

The product story is the per-video detail page: "Peak Rank #1 for 18 days," "Time at each position," view-velocity trend. That's the monetization angle — competitors don't have 9 months of 30-min YouTube chart snapshots.

YouTube's `chart=mostPopular` is **not view-sorted** — it's their trending algorithm. View counts in the response jump around (rank #1 with 29M views, rank #4 with 39M views). The position in the response array IS the rank. The existing leaderboard endpoints (`/api/leaderboard/global/route.js`) sort by view count — that's fine for "biggest videos right now" but cannot be used for the per-video peak-rank widget.

## Historical rank reconstruction

Going forward (from 2026-06-26), rank is captured live by Phase 2 code into `video_rank_history`. For the 7+ months of prior data, rank had to be reconstructed.

**Discovery**: pre-bucketing era (before 2026-04-15), the cron called `new Date().toISOString()` per chart fetch, so every chart fetch shares an exact millisecond captured_at across its rows. Within that timestamp, autoincrement `video_stats.id` ASC = YouTube's actual chart rank order.

After 2026-04-15, captured_at is bucketed to 30-min, so multiple charts share a captured_at — id ordering still works but boundary detection is harder. Reconstruction for the bucketed era is deferred.

### Tiered approach (Tier 1 shipped, 2/3 deferred)

| Tier | Charts | Method | Confidence | Status |
|---|---|---|---|---|
| 1 | `global:videos`, `global:shorts` | First captured_at per cron run | ~99% | **Shipped** |
| 2 | `category:N:*` | Majority `category_id` + sequence | ~80% | Deferred |
| 3 | `country:X:*` | Sequence within :05 cron run | ~60% | Deferred |

### Tier 1 calibration (real-data thresholds, not intuition)

- `MIN_GLOBAL_SIZE = 20`. Real globals are typically 80+, but smaller batches happen.
- `MIN_DISTINCT_CATS = 3`. Real globals only have 4-6 distinct categories — music + gaming dominate trending. Started at 10, rejected everything.
- **Do NOT require uniform `is_short`**. Earliest era (pre videos/shorts cron split) returned mixed shorts+long-form in a single ranked chart fetch. The split into separate :00/:30 (videos) and :15/:45 (shorts) crons happened later.

## Endpoints

```
GET /api/admin/backfill-summary?cursor=&limit=500
    Fills video_summary from video_stats history (no rank fields).
    Resumable. Run once after schema migration.

GET /api/admin/reconstruct-ranks?cursor=&limit=2000&cutoff=2026-04-15T00:00:00.000Z
    Reconstructs global:videos / global:shorts rank rows for pre-bucket era.
    Resumable. Idempotent (INSERT OR IGNORE).

GET /api/admin/refresh-peak-ranks?cursor=&limit=1000&onlyChanged=true
    Lifts MIN(rank) from video_rank_history into video_summary.peak_rank/_date/_chart.
    Use onlyChanged=false for full sweep after reconstruction completes.

POST /api/scheduled/daily-rollups
    Cron 25 3 * * *. Rebuilds creator_summary and country_daily_summary.
```

## D1 gotchas learned the hard way

- **No materialized views.** Hand-roll rollup tables maintained by cron writes.
- **~100 bound-parameter limit on `?` placeholders.** Chunk IN-clause lookups (see `D1_PARAM_LIMIT = 90`).
- **GROUP BY over millions of rows OOMs even with the right index.** Paginate with `DISTINCT col ORDER BY col LIMIT N` and classify in JS.
- **Velocity calc needs a min-delta floor (10 min).** Pre-bucketing video_stats has near-duplicate timestamps that otherwise produce 351M views/hour absurdities.
- **`wrangler d1 export` does not scale.** 6.3GB dump terminated at 83% because R2 pre-signed URLs expire after 1 hour. Work against remote D1 directly via the chunked admin endpoints.

## Cron schedule (`wrangler.jsonc`)

| Cron | Handler | Writes |
|---|---|---|
| `0,30 * * * *` | `/api/scheduled/videos` | ~340 rows (global + 12 categories) |
| `15,45 * * * *` | `/api/scheduled/shorts` | ~1300 rows |
| `5 * * * *` | `/api/scheduled/countries` | ~5000 rows (5 countries × 26 charts) |
| `10 */12 * * *` | `/api/scheduled` | creator profiles only (no video_stats) |
| `0 14 * * *` | `/api/newsletter/send-daily` | newsletter |
| `25 3 * * *` | `/api/scheduled/daily-rollups` | creator + country summaries |
| `2,32 * * * *` | `/api/scheduled/detect-breakouts` | breakout_candidates upserts |
| `17,47 * * * *` | `/api/scheduled/refresh-breakouts` | breakout velocity refresh |
| `20 9 * * *` | `/api/social/post` | daily Telegram social posts (Haiku → 4 posts) |
| `0 10 * * 1` | `/api/social/weekly-charts` | Monday Billboard-style SVG charts to Telegram |

Routed by exact `event.cron` string in `worker.js` (not wall-clock minute), so crons that share a minute don't collide.

## Social pipelines (SHIPPED 2026-06-30)

Two Telegram pipelines, both using the same `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` Cloudflare secrets:

- **Daily posts** — `/api/social/post` generates 4 text posts via Claude Haiku 4.5 (prompt-cached system prompt), sends each as a Telegram message. Runs `20 9 * * *`. See `src/lib/social-generator.js`.
- **Weekly chart images** — `/api/social/weekly-charts` fetches 4 chart-card SVGs (global, music, entertainment, gaming) from `/api/chart-image/[chart]` and posts each to Telegram via `sendDocument` (not `sendPhoto` — see WASM note below). Runs `0 10 * * 1`. Captions list the top 5 in Markdown.

## Image generation on Cloudflare Workers

**Use pure SVG. Do not use satori/resvg-based libs.** Cloudflare Workers refuses runtime `WebAssembly.compile()` ("Wasm code generation disallowed by embedder"), and OpenNext's bundling pipeline does not statically include the wasm files that next/og, workers-og, and @cf-wasm/og depend on.

- `next/og` — OpenNext rejects the `edge` runtime directive entirely.
- `workers-og` / `@cf-wasm/og` — fail with the wasm-compile error or hang the Worker at runtime.

`/api/chart-image/[chart]/route.js` hand-templates SVG as a string. Returns `image/svg+xml`. SVG is a real shareable image format — browsers render it, file managers preview it, Telegram accepts it via `sendDocument`. If PNG becomes a hard requirement, the realistic paths are Cloudflare Browser Rendering (headless Chrome binding) or an external screenshot service.

**SVG attribute gotchas:**
- SVG attributes are double-quoted; `font-family` values containing `"Helvetica Neue"` (with double quotes inside) break the parser. Use single-word fonts or escape inner quotes to `&apos;`.
- Load Inter via `@import` in a `<style>` block inside `<defs>`; degrade to Helvetica/Arial for offline viewers.

## Next feature: Breakout discovery (pre-trending monetisation layer)

Not built yet. Belongs in a future iteration. Tied to the monetisation flywheel:
the newsletter's "Today's Breakout" section, Pro tier Pattern Alerts, and the
Monthly Deep Dive Report's "Breakout creators — first-timers" all need this.

### Goal

Catch videos breaking out **before** they hit the global top — including those
from creators we've never seen trend before. Avoid top-creator bias.

### Design principle

YouTube's chart system itself is the discovery surface. We already pull ~50
charts per cron tick (global + 12 categories + 5 country videos + 5 country
shorts + 60 country-categories). Any video gaining traction lands in at least
one of those, even briefly. The first appearance of a video in any chart IS the
breakout signal — channel size doesn't matter.

This is why we do NOT seed discovery from "top creators." That would bias us
toward known names and miss exactly the first-timer narrative the product
needs.

### Three-layer approach

**Layer 1 — Velocity on new arrivals (FREE, no new API calls)**
- Detect candidates where `first_seen >= now() - 24h` and views/hour is in the
  95th percentile for its age bracket.
- Excludes already-famous videos (those whose first_seen was years ago).
- Pure SQL over existing video_summary + video_stats.

**Layer 2 — Velocity oversampling (~100 units/day)**
- For Layer 1 candidates (~20-50/day), call `videos.list?id=...&part=statistics`
  every 15 min instead of waiting 30 min for the next cron.
- Batches of 50 = 1 quota unit. 96 calls/day worst case.

**Layer 3 — Off-platform discovery (EXPENSIVE, surgical use)**
- `search.list?q=<topic>&publishedAfter=24h&order=viewCount` for videos that
  went viral on X / Reddit / TikTok rather than via YouTube's chart system.
- Topic input comes from analyzing rising `tags` / `topic_categories` in
  video_summary (free).
- 100 quota units per query. Cap at 1-3 queries/day.

### Proposed schema

```sql
CREATE TABLE breakout_candidates (
  video_id TEXT PRIMARY KEY,
  detected_at TEXT NOT NULL,
  source_chart TEXT NOT NULL,         -- chart where we first saw it
  source_rank INTEGER NOT NULL,
  age_hours_at_detection REAL NOT NULL,
  velocity_at_detection REAL NOT NULL, -- views/hour
  current_velocity REAL,
  peak_velocity REAL,
  score REAL NOT NULL,                -- composite breakout score
  status TEXT NOT NULL,               -- 'watching' | 'confirmed' | 'killed' | 'graduated'
  promoted_at TEXT,                   -- when it hit global top 50 (graduated)
  updated_at TEXT NOT NULL
);
```

### Endpoint

`/api/scheduled/detect-breakouts` — runs at end of each videos/shorts/countries
collection (or its own cron). Computes Layer 1 candidates and upserts.

### Feeds into monetisation

| Product | How it uses breakout_candidates |
|---|---|
| Newsletter "Today's Breakout" | Top-scored row from last 24h |
| Pro Pattern Alerts | Push when score crosses threshold |
| Monthly Report — "First-timer breakouts" | `JOIN creators WHERE subscriber_count < 1M` |
| MVT Score | Early-velocity is a leading indicator of peak rank — feed back into score formula |

### Open questions for when this gets built

- Percentile lookup needs an "age-bracket" baseline (a 2h-old breakout has
  different velocity than an 18h-old one). Seed from 9 months of historical
  `video_stats` — easy, just bin by age and compute percentiles per bracket.
- Should `breakout_candidates` retain killed candidates for analytics? Probably
  yes (so we can measure false-positive rate over time).

## YouTube API quirks

- `videos.list` quota is 1 unit per call regardless of `part`. Adding `topicDetails` and storing `snippet.tags` is free — both stored as JSON in `videos.tags` / `videos.topic_categories`.
- `videos.list` caps at 50 per call. `chart=mostPopular` often has no further pages.
- `videoCategoryId=N` returns cross-category videos (~50-70% homogeneous, not 100%) — relevant for Tier 2 reconstruction noise.
- Working categories only: `[10, 20, 17, 24, 25, 26, 23, 22, 28, 1, 2, 15]`. Others 400/403/404.
- Shorts detection by `duration <= 180s` only — thumbnails are always 16:9 so portrait detection is unreliable.
