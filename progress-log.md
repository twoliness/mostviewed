# Progress Log — Q2 2026 Report Prep

Status of the multi-step backfill / recompute work for the Q2 2026 report.
Updated by the person/agent running each job; not auto-generated.

Live data behind every section is queryable via the admin endpoints listed at
the bottom — when in doubt, `curl` those, not this file.

---

## 1. Rank backfill (`video_rank_history`, `chart='global:videos'`)

Fills the gap between the pre-bucket Tier-1 reconstructor (< 2026-04-15) and
the live rollup writer (>= 2026-06-27).

| Pass | Window | Knobs | Validated | Rows added |
|---|---|---|---:|---:|
| Strict | 2026-04-15 → 2026-06-27 | dominance 0.7, minSize 20, minCats 3 | 1,725 | 74,076 |
| Relaxed | 2026-04-26 → 2026-05-28 | dominance 0.85, minSize 20, minCats 2 | 284 | 4,725 |
| Aggressive | 2026-05-17 → 2026-05-28 | dominance 0.95, minSize 10, minCats 2 | 268 | 6,675 |

`INSERT OR IGNORE` dedupes overlap. Final coverage ~85k rank rows.

**Findings:**
- May 17–28 had structural Gaming-category dominance in the head of the US
  trending chart. 231 buckets in that window remain unrecoverable — they are
  literally near-monoculture Gaming. This is itself a publishable finding.
- The chart we recovered is effectively **US `mostPopular` head** for the
  bucketed era. Report needs to frame it as "US trending," not "global".

**Status: DONE.**

Endpoint: `/api/admin/reconstruct-ranks-bucketed?auto=1&limit=500&cursor=...&dominance=...&minSize=...&minCats=...`

---

## 2. Velocity + engagement recompute (`video_summary`)

Fixes two bugs surfaced by sanity-checks:

- **Velocity:** ~5,400 videos had peak_velocity > 20M v/hr (some >1B v/hr).
  Root cause: pre-bucket video_stats had ms-precision near-duplicate
  captured_at, so view deltas got divided by ~0. Memory.md flagged this.
  Recomputed with a 10-min min-delta floor (same rule the live rollup writer
  now applies).
- **Engagement:** `engagement_day1` / `engagement_week1` were pre-filled at
  first sighting (rollups.js INSERT bug). Patched in `src/lib/rollups.js`.
  Existing rows recomputed by sampling the video_stats row closest to
  `first_seen + 24h` / `+ 168h` within a ±6h tolerance.

Scope: Q2 videos (`first_seen` between 2026-04-01 and 2026-07-01) — ~70k
videos. Each video does one full scan of its `video_stats` history
(~218 rows). Per-video latency ~170ms. Total run time ~3 hrs.

**Status: IN PROGRESS.** (See "Live state" below.)

Endpoint: `/api/admin/recompute-summary-stats?auto=1&limit=100&cursor=...`

---

## 3. Watchdog (`*/15 * * * *`)

Telegram alerter on a dedicated bot (`WATCHDOG_TELEGRAM_BOT_TOKEN` /
`WATCHDOG_TELEGRAM_CHAT_ID`, kept separate from the social-post bot).
Checks every 15 min:

- videos cron (max captured_at on `chart='global:videos'`, threshold 40 min)
- shorts cron (same on `global:shorts`)
- countries cron (chart LIKE `country:%:videos`, threshold 75 min)
- creators cron (max `updated_at` on `creators`, threshold 13 hrs)
- newsletter send (optional; on `newsletter_sends.sent_at`, threshold 26 hrs)

Mode: every-occurrence, no dedup. A persistent failure produces 4 alerts/hr.

**Open ops findings:**
- **Creators cron broken since 2026-06-27** (3+ days stale). Most likely
  fallout from the rollups deploy on Jun 27. Worth checking
  `/api/scheduled` route + worker.js cron routing.
- Shorts cron was briefly stale once (43 min vs 40 threshold) during a single
  missed run; self-recovered.

Endpoint: `/api/ops/watchdog?dry=1` to inspect without alerting.

---

## Live state — how to check at any time

```bash
# All recent backfill / recompute batches across all jobs
curl -s "https://mostviewed.today/api/admin/backfill-progress?limit=20" | jq

# Just one job
curl -s "https://mostviewed.today/api/admin/backfill-progress?job=recompute-summary-stats&limit=20" | jq

# Velocity / engagement distribution before-after
curl -s "https://mostviewed.today/api/admin/sanity-checks" | jq

# Watchdog dry-run (does not alert)
curl -s "https://mostviewed.today/api/ops/watchdog?dry=1" | jq

# Inspect any specific captured_at bucket
curl -s "https://mostviewed.today/api/admin/inspect-bucket?ts=2026-05-20T12:00:00.000Z" | jq
```

---

## Next steps once recompute finishes

1. Re-run sanity-checks. Q2 `over_20m` velocity count should drop near zero.
2. `/api/admin/refresh-peak-ranks?onlyChanged=false&limit=2000` (looped) to
   lift backfilled ranks into `video_summary.peak_rank`.
3. Start the Q2 report draft (Option C — US trending framing, with the
   May 17–28 Gaming Lockout as a feature sidebar).
4. Fix the creators cron.
