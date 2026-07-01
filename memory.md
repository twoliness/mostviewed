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

### Tiered approach

| Tier | Charts | Era | Method | Confidence | Status |
|---|---|---|---|---|---|
| 1 | `global:videos`, `global:shorts` | pre-bucket (< 2026-04-15) | First captured_at per cron run | ~99% | **Shipped** |
| 1b | `global:videos` only | bucketed (2026-04-15 → 2026-06-27) | Category-dominance sliding window | ~85% | **Shipped 2026-06-30** |
| 2 | `category:N:*` | both | Majority `category_id` + sequence | ~80% | Deferred |
| 3 | `country:X:*` | both | Sequence within :05 cron run | ~60% | Deferred |

### Tier 1 calibration (real-data thresholds, not intuition)

- `MIN_GLOBAL_SIZE = 20`. Real globals are typically 80+, but smaller batches happen.
- `MIN_DISTINCT_CATS = 3`. Real globals only have 4-6 distinct categories — music + gaming dominate trending. Started at 10, rejected everything.
- **Do NOT require uniform `is_short`**. Earliest era (pre videos/shorts cron split) returned mixed shorts+long-form in a single ranked chart fetch. The split into separate :00/:30 (videos) and :15/:45 (shorts) crons happened later.

### Tier 1b — bucketed-era boundary detection

In the bucketed era the videos cron at :00, countries cron at :05, and shorts cron at :15 all bucket to the same captured_at, so multiple charts share a single timestamp. Within that timestamp, autoincrement `video_stats.id` ASC still preserves chronological insert order — videos cron is first. We detect global→category boundary by a 20-row category-diversity sliding window: when any one category occupies ≥70% of the window, we're inside the first category fetch; cut global there.

- `WINDOW = 20`, `DOMINANCE_DEFAULT = 0.7`, `MIN_GLOBAL_SIZE_DEFAULT = 20`, `MIN_DISTINCT_CATS_DEFAULT = 3`.
- Endpoint accepts overrides via `?dominance=`, `?minSize=`, `?minCats=` for ranges where the strict defaults reject too aggressively.
- SQL filter `WHERE captured_at LIKE '%T__:00:00.000Z' OR captured_at LIKE '%T__:30:00.000Z'` is required to skip ms-precision noise (stale-video refresh path still writes non-bucketed captured_at).
- Auto-loop mode (`?auto=1`) runs batches inside one HTTP call up to a 25s budget; loop pagination across calls is needed beyond that.
- **Critical limitation**: global:shorts and country charts are NOT recoverable in the bucketed era. The countries cron interleaves between the videos/shorts crons inside one bucket and the signal can't be separated cleanly. Treat the recovered chart as **US `mostPopular` head**, not literal global.
- **May 17–28 was a structural Gaming lockout** in US trending — ~94% of buckets reject under default knobs; aggressive knobs (`dominance=0.95, minSize=10, minCats=2`) recover ~54% as a top-25-non-Gaming slice. This is itself a publishable finding, not a data defect.

### Q2 backfill outcome (Apr 15 → Jun 27)

Three passes with `INSERT OR IGNORE` dedupe → ~85k `video_rank_history` rows on `chart='global:videos'`. April: 38,905 rows / 933 buckets. May: 21,565 / 649. June: 74,617 / 1,327 (live capture from Jun 27 + dense backfill).

## Endpoints

```
GET /api/admin/backfill-summary?cursor=&limit=500
    Fills video_summary from video_stats history (no rank fields).
    Resumable. Run once after schema migration.

GET /api/admin/reconstruct-ranks?cursor=&limit=2000&cutoff=2026-04-15T00:00:00.000Z
    Reconstructs global:videos / global:shorts rank rows for pre-bucket era.
    Resumable. Idempotent (INSERT OR IGNORE).

GET /api/admin/reconstruct-ranks-bucketed?cursor=&limit=500&from=&until=&auto=1
                                         &dominance=&minSize=&minCats=
    Tier-1b reconstructor for the bucketed era (Apr 15 → Jun 27). global:videos
    only. Resumable. Auto-loop. INSERT OR IGNORE. Logs each batch to
    backfill_progress.

GET /api/admin/refresh-peak-ranks?cursor=&limit=1000&onlyChanged=true
    Lifts MIN(rank) from video_rank_history into video_summary.peak_rank/_date/_chart.
    Use onlyChanged=false for full sweep after reconstruction completes.

GET /api/admin/recompute-summary-stats?cursor=&limit=100&auto=1&all=1
    Recomputes peak_velocity / peak_velocity_at / engagement_day1 /
    engagement_week1 from raw video_stats per video. Q2 scope by default
    (first_seen 2026-04-01 → 2026-07-01). CONCURRENCY=8 fan-out via
    Promise.allSettled per batch → ~25 videos/s. Now uses strict velocity
    heuristics (see Velocity poisoning section below).

GET /api/admin/lockout-analysis
    Returns Chapter-5 data: reconstruct-ranks-bucketed batch stats for the
    2026-05-17 → 2026-05-28 Gaming Lockout window, top-25 non-Gaming
    survivors of the window, and Gaming category-share of top-40 for the
    lockout vs rest of Q2. Read-only, no writes.

GET /api/admin/q2-report-data
    Returns Chapters 1-4, 6, 7 data for the Q2 report:
    - format ledger (category × duration bucket, median peak/days, n≥30)
    - Q2 champions (creators with ≥2 top-25 videos)
    - fastest breakouts (peak_velocity < 20M cap)
    - engagement holds by category (day1/week1/now medians, n≥50)
    - weekly category rotation (top-25 share by week × category)
    - Q2-close signals (chart holders + breakout candidates from last week)
    Read-only, no writes.

GET /api/admin/inspect-bucket?ts=<captured_at>
    Read-only diagnostic for any bucketed captured_at. Returns row count,
    category histogram, country histogram, id gaps, head40 rows.

GET /api/admin/backfill-progress?job=&limit=50
    Tail the backfill_progress log. Returns summary + recent batch rows.

GET /api/admin/sanity-checks
    Velocity distribution (with Q2 cut), engagement coverage by Q2 month,
    rank coverage by month. No writes — pre-report verification.

GET /api/admin/inspect-bucket?ts=<captured_at>
    Read-only diagnostic for any bucketed captured_at. Returns row count,
    category histogram, country histogram, id gaps, head40 rows.

GET /api/ops/watchdog?dry=1&test=1
    Cron `*/15 * * * *`. Checks freshness of every scheduled endpoint via
    cron_heartbeats (real wall-clock last_ok_at, not bucketed captured_at).
    Alerts to Telegram via WATCHDOG_TELEGRAM_BOT_TOKEN / _CHAT_ID.
    ?dry=1 inspects without alerting; ?test=1 sends a synthetic ping for
    delivery verification.

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
| `*/15 * * * *` | `/api/ops/watchdog` | Telegram ops alerter (separate watchdog bot) |

Routed by exact `event.cron` string in `worker.js` (not wall-clock minute), so crons that share a minute don't collide.

## Social pipelines (SHIPPED 2026-06-30)

Two Telegram pipelines, both using the same `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` Cloudflare secrets:

- **Daily posts** — `/api/social/post` generates 4 text posts via Claude Haiku 4.5 (prompt-cached system prompt), sends each as a Telegram message. Runs `20 9 * * *`. See `src/lib/social-generator.js`.
- **Weekly chart images** — `/api/social/weekly-charts` fetches 4 chart-card SVGs (global, music, entertainment, gaming) from `/api/chart-image/[chart]` and posts each to Telegram via `sendDocument` (not `sendPhoto` — see WASM note below). Runs `0 10 * * 1`. Captions list the top 5 in Markdown.

## Ops watchdog (SHIPPED 2026-06-30, heartbeat table 2026-07-01)

Cron `*/15 * * * *` → `/api/ops/watchdog`. Posts alerts via `src/lib/ops-alert.js` using **separate** `WATCHDOG_TELEGRAM_BOT_TOKEN` / `WATCHDOG_TELEGRAM_CHAT_ID` secrets so ops noise never lands in the social channel. Falls back to `TELEGRAM_*` if watchdog secrets are missing (for local).

**2026-07-01 rewrite: cron_heartbeats table.** Original impl read `MAX(captured_at)` on `video_rank_history` — but captured_at is bucketed to 30 min, lagging wall clock by up to 30 min. Shorts cron at :45 writes captured_at=:30, so just before the next tick MAX(captured_at) is 45 min old at the 40 min threshold — false-positive baked in. New impl uses a heartbeat table upserted by `worker.js` on every cron dispatch (wraps the response, so both success and failure paths are captured). Watchdog reads `last_ok_at` (real ISO timestamp) and alerts on `now - last_ok_at > threshold` OR `last_status='error'`. Missing rows treated as `no_heartbeat_yet` so the post-deploy gap doesn't false-alarm during the transition.

Checks (thresholds = cron interval + slack, no bucket-lag headroom):
- videos cron (`scheduled/videos`) — 40 min
- shorts cron (`scheduled/shorts`) — 40 min
- countries cron (`scheduled/countries`) — 75 min
- creators cron (`scheduled`) — 13 hrs
- detect-breakouts (`scheduled/detect-breakouts`) — 45 min
- refresh-breakouts (`scheduled/refresh-breakouts`) — 45 min
- daily rollups (`scheduled/daily-rollups`) — 25 hrs
- newsletter (`newsletter/send-daily`) — 26 hrs

Mode: every-occurrence, no dedup (a persistent failure produces 4 alerts/hr until fixed — user's explicit choice).

**MarkdownV2 escape gotcha**: every value rendered into a `_..._` italic or `*..*` bold block must run through the `escape()` helper, including the trailing ISO timestamp. Hyphens in dates trigger `Bad Request: can't parse entities` 400s.

**Creators cron bug FIXED 2026-06-30**: `src/app/api/scheduled/route.js:245` had `currentMinute === 0 && currentHour % 12 === 0` to decide creators vs videos collection. But the cron fires at `10 */12 * * *` (:10, not :00), so the check was always false and every creator tick silently ran video collection instead. Was masked before worker.js switched to exact-cron-string routing (Jun 27); after routing fix, the in-handler wall-clock check became the active bug. Fix: worker.js now routes this endpoint only from the 12h cron, so always run creator collection; dropped the legacy fallback and the unused `triggerVideoCollection` function.

## Velocity poisoning + engagement INSERT bug (FIXED 2026-06-30 → strict recompute 2026-07-01)

Pre-bucket `video_stats` had ms-precision near-duplicate captured_at rows. Without a min-delta floor, the velocity calc divides tiny view deltas by tiny time deltas and produces 100M+ views/hr absurdities. Top offenders reached 1.22B v/hr against videos with 375M lifetime views.

`src/lib/rollups.js#computeVelocity` already applies a 10-min floor at write time. The damage is in legacy `video_summary.peak_velocity` values written before the floor was added.

Separately, `src/lib/rollups.js#buildInsertStmt` was pre-filling `engagement_day1` and `engagement_week1` with the current snapshot at first sighting. The `??` chain in `buildUpdateStmt` then never replaced them because they were never null. So both columns were silently "engagement at first sighting," not "engagement at 24h / 168h."

Fix (round 1, 2026-06-30):
1. Patched INSERT to write `null, null, x.engagement` instead of `x.engagement, x.engagement, x.engagement`.
2. Wrote `/api/admin/recompute-summary-stats` to walk `video_stats` per video, recompute peak_velocity with the 10-min floor, and snapshot engagement at the row closest to `first_seen + 24h` / `+ 168h` within ±6h tolerance.
3. `CONCURRENCY=8` Promise.allSettled fan-out inside each batch → ~25 videos/s sustained against remote D1.

**Round-1 caught pair-pollution but not delta-pollution.** After the first recompute, 315 Q2 videos still had peak_velocity > 20M v/hr. The 10-min floor skips ms-duplicated pairs, but pairs correctly spaced 30 min apart with implausibly huge view deltas (YouTube API hiccup snapshots) still pass. MrBeast's "Spiciest Ramen" showed 296M v/hr = 148M views in 30 min, when the video's lifetime is 178M total.

**Round 2 — strict recompute (2026-07-01)** added two more filters to `/api/admin/recompute-summary-stats`:
- **`ABSOLUTE_VELOCITY_CEIL = 10M v/hr`** — real biggest-ever YouTube launches top around 5M v/hr globally. Skip pairs whose computed velocity exceeds 10M as sanity bound.
- **`RELATIVE_DELTA_CEIL = 0.25`** applied when `prev.view_count > 100k` — skip pairs where view delta exceeds 25% of previous view count. Catches "impossible jump" snapshots without penalizing fresh-launch growth (videos < 100k views have no filter).

After strict recompute: **0 videos > 20M v/hr** (was 315). Top Q2 velocity is 9.7M (LAIKA Wildwood trailer) — matches real-world premiere physics.

## Category leaderboard architecture (REFACTORED 2026-07-01)

Old flow read `category:N:videos` chart from rank_history, filtered by `videos.category_id`, and fell through to a lifetime-view supplement (`ORDER BY view_count DESC`) when the chart was thin. For Entertainment (cat 24), the supplement was the only signal because YouTube's `videoCategoryId=24` fetch has near-zero true-cat-24 videos. Result: leaderboard showed months-old MrBeast hits (Apr 30 → Jun 30 captured_at, lifetime view_count labeled "Views today").

Audit of all 12 category leaderboards found: Entertainment/Howto/Pets 100% supplement contamination, Comedy/Film 90%, Sports/Autos partial, others clean. **Root cause is YouTube's `videoCategoryId=N` fetch returning ~50-70% cross-category videos** — the homogeneity filter discards cross-category leakage but for some categories almost nothing remains.

**New strategy** in `src/lib/database.js#_categoryLeaderboardImpl`:
1. **Trending** = appeared in ANY `rank_history` chart in the last 6 hrs. Picks up videos regardless of which chart YouTube surfaced them on (home cat, cross-cat, country).
2. **Filter** by `videos.category_id` — true home category only.
3. **`views_today` on-the-fly** = current view_count − MIN(view_count since 00:00 UTC today). Uses `idx_video_stats_video_captured` covering index. Bounded to trending set (~50-200 videos). Cannot use `video_daily_stats` because `daily-rollups` writes only yesterday's completed row (03:25 UTC); labeling yesterday's delta as "Views today" would be misleading.
4. **Sort** by views_today DESC, tiebreak on lifetime view_count DESC.
5. **No supplement.** Better to show a short honest leaderboard than a padded one with old videos.

Two-pass SQL shape (JS enrichment) instead of CTE-to-CTE join, which D1 rejected. UI (`src/components/ModernChartRanking.jsx`) prefers `video.views_today` over `video[metricKey]` when present.

## Video detail page fallback chart (FIXED 2026-07-01)

Videos whose only rank_history rows landed on cross-category charts (e.g. MrBeast Entertainment videos peaking #1 on `category:23` Comedy + `category:26` Howto with 122 appearances each) used to render "Off chart / Peak Rank — / Days on chart 0" on their detail pages. Page only inspected `global:videos` + `category:<home>:videos`.

Fix in `src/app/video/[slug]/page.js`: when both `globalStats` and `categoryStats` (home category) are null, fall back to `summary.peak_rank_chart` — the chart where the video actually peaked. `primary = globalStats || categoryStats || fallbackStats`. Same fallback threads through the rank-timeline path and the off-chart check.

## Q2 report shipped (2026-07-01)

**"YouTube US Trending Q2 2026: The Format Report"** — 7 chapters + front matter + pitch copy, ~13k words in `reports/q2-2026-us-trending/`. Priced at $99, 14-day refund. ICP: content strategists at agencies (highest budget, lowest friction, exact-fit data question).

Every chapter is backed by a specific query against a persistent admin endpoint:
- Chapter 5 (Gaming Lockout) — `/api/admin/lockout-analysis`
- Chapters 1, 2, 3, 4, 6, 7 — `/api/admin/q2-report-data`

Key findings the report defends with data:
- **Gaming climbed 24% → 46% top-25 share across Q2** (Chapter 6). May 17–28 Gaming Lockout was the peak of a quarter-long rise, not an isolated event.
- **10–30min People & Blogs long-form has best median peak rank** (Chapter 1) at rank 11. No Shorts format better than 12.5.
- **Music has 44% engagement decay Day 1 → Now; Gaming has 3%** (Chapter 4). Opposite sponsor-pricing profiles.
- **14 of 25 Q2 champion channels are Indian-market** (Chapter 2). US `mostPopular` chart is not what most agency briefs assume.
- **MrBeast #2 on peak velocity but not on champions list** (Chapters 2, 3). Q2 MrBeast was one big hit, not multiple.

Framing: **"US trending" not "global"** — because bucketed-era backfill recovered only `regionCode=US mostPopular`, not literal worldwide. Chapter 7 deliberately not a prediction chapter; closes with "The three questions Q3 will answer" (HYBE extend? Gaming stabilize? Detector base rates?) as forward hook without unfounded calls.

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
