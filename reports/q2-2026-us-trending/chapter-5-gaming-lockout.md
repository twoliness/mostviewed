# The Gaming Lockout

## How YouTube's US trending chart saturated for 10 days in May 2026

*Chapter 5 — Q2 2026 YouTube US Trending Playbook*

---

**Between May 17 and May 27, 2026, YouTube's US `mostPopular` chart underwent a 10-day category-saturation event. On any 30-minute snapshot during the window, videos in YouTube's Gaming category (cat 20) held 62–75% of the top-40 slots — roughly 1.5× their already-high Q2 baseline. The event was severe enough that our standard chart-head classifier — which reliably resolves the global-chart signal against 12 co-fetched category charts on 95%+ of Q2 buckets — could resolve only 0.8% of buckets in the window at default thresholds, because the global chart head was structurally indistinguishable from a Gaming-only fetch. This is the first published detail on what we're calling the May 2026 Gaming Lockout.**

---

## Gaming is already dominant. This was more than that.

Before the story, one calibration. Across the ranked window of Q2 (April 15 → June 27, chart-head positions rank ≤ 40, excluding the lockout itself):

| Category (top 40, US trending, rest of Q2) | Share |
|---|---:|
| Gaming (cat 20)                            | **43.7%** |

Yes — Gaming is close to half the US trending chart head in any normal week of Q2. Anyone building strategy on "Gaming is a niche" is already wrong. The lockout is not the story of Gaming *arriving*.

The lockout is the story of Gaming going from 43.7% to 62–75%, sustaining that for 10 consecutive days, and doing it severely enough to overwhelm the category-diversity classifier that handles every other week of Q2 without incident.

## What the data shows

We sample YouTube's chart every 30 minutes and preserve the rank order (position in YouTube's response array — YouTube's own trending algorithm, not view-sorted). Below is the category of the first 40 ranked videos from one snapshot in the middle of the lockout, 2026-05-20 at 12:00 UTC:

```
Rank  Category
 1    People & Blogs
 2    Film & Animation
 3    People & Blogs
 4    Entertainment
 5    Music
 6    Gaming            ← Gaming wall begins
 7    Entertainment
 8-19  Gaming × 12 consecutive
20    Entertainment
21-26  Gaming × 6
27    Entertainment
28-36  Gaming × 9
37-40  Music × 4
```

**27 of 40 (67.5%) were Gaming videos.** Not Gaming *content* — videos categorized under YouTube's cat 20.

Seven non-adjacent samples across the window, direct from raw chart snapshots:

| Snapshot (UTC)      | Gaming share of top 40 |
|---------------------|:----------------------:|
| 2026-05-18 12:00    | 27/40 (67.5%)          |
| 2026-05-20 00:30    | 25/40 (62.5%)          |
| 2026-05-20 12:00    | 27/40 (67.5%)          |
| 2026-05-22 15:00    | 25/40 (62.5%)          |
| 2026-05-24 08:30    | 30/40 (75.0%)          |
| 2026-05-26 20:00    | 26/40 (65.0%)          |
| 2026-05-27 14:30    | 27/40 (67.5%)          |

Median across all 480 30-minute buckets in the window: 65% Gaming share of top 40. Peak sustained share (24-hour rolling): 71%.

## How extreme was this — measured against our own classifier

Our historical chart rank is derived by a category-diversity classifier — a sliding window that identifies the global-chart head from the 12 co-fetched category charts by category heterogeneity. On a normal Q2 30-minute bucket, the global chart head shows 5–8 categories in its top 40; a single-category fetch shows 1. The classifier resolves 95%+ of Q2 buckets at default thresholds.

For the lockout window, direct measurement from the classifier log:

| Classifier profile                             | Buckets scanned | Buckets resolved | Resolution rate |
|----------------------------------------------|:---------------:|:-----------------:|:-------------:|
| Default (dominance 0.70, minSize 20, minCats 3) | 500             | 4                 | **0.8%**      |
| Relaxed (dominance 0.85, minSize 20, minCats 2) | 499             | 30                | 6.0%          |
| Aggressive (dominance 0.95, minSize 10, minCats 2) | 499             | 268               | 53.7%         |

At default thresholds the classifier declined to label the global fetches as global — because at the head of the chart, they looked identical to single-category fetches. **The classifier's behavior is itself a measurement of the event's extremity: for 10 days, YouTube's US trending head was structurally indistinguishable from a category-specific view.**

## What survived at the top

Top-25 non-Gaming videos that held rank ≤ 40 on `global:videos` at least once during the window, sorted by best rank achieved and days spent in top 40:

| Peak | Days in top 40 | 30-min ticks | Category | Channel | Title |
|:----:|:----:|:----:|---|---|---|
| **1** | 5 | 63 | Howto/Style | shakiraVEVO | Shakira, Burna Boy – Dai Dai (Official Video) |
| **1** | 4 | 114 | Music | OliviaRodrigoVEVO | Olivia Rodrigo – the cure (Official Music Video) |
| **1** | 4 | 60 | Music | MGKVEVO | mgk, Wiz Khalifa – everything tatted (Official Video) |
| **1** | 3 | 60 | People & Blogs | PRESIDENT | PRESIDENT – DOOM LOOP |
| **1** | 3 | 54 | Music | JYP Entertainment | ITZY "Motto" M/V |
| **1** | 3 | 54 | Entertainment | Vriddhi Cinemas | Peddi Official Trailer (Telugu) — Ram Charan, Janhvi Kapoor |
| **1** | 3 | 37 | Music | DrakeVEVO | Drake – 2 Hard 4 The Radio |
| **1** | 3 | 37 | Film & Animation | Screen Junkies | Honest Trailers — Project Hail Mary |
| **1** | 3 | 35 | People & Blogs | The Cinematic | The Neighbourhood – Sweater Weather (Lyrics) |
| **1** | 2 | 26 | Music | KATSEYEVEVO | KATSEYE – PINKY UP (Live From The American Music Awards / 2026) |
| **1** | 1 | 8 | Music | baektowo – Topic | Entre tú y yo |
| **2** | 6 | 109 | People & Blogs | Tasik Yard | Innocent Tumas (Tasik Yard × Wan Jam) 2026 Official PNG Music |
| **2** | 3 | 103 | Music | HYBE LABELS | LE SSERAFIM – BOOMPALA OFFICIAL MV |
| **2** | 3 | 43 | Music | Dead Radio Club | Hoobastank – The Reason (Lyrics) |
| **2** | 3 | 43 | Music | Echo Lyrics | Romeo Santos – Necio (Letra) |
| **2** | 2 | 29 | Entertainment | Emergency Awesome | The Boys Season 5 Ep 8 Finale Trailer |
| **2** | 2 | 28 | Music | Ren | Inpatient (Ren x Chris Webby) – Caskets |
| **2** | 2 | 26 | Music | bill wurtz | i'm going off the map |
| **2** | 2 | 21 | Film & Animation | Screen Junkies | Honest Trailers — Super Mario Galaxy |
| **2** | 2 | 15 | Music | PaulMcCartneyVEVO | Paul McCartney – Band on the Run (Saturday Night Live / 2026) |
| **2** | 2 | 11 | Entertainment | Think Music Telugu | Maa Inti Bangaaram – Official Trailer |
| **2** | 1 | 11 | Entertainment | XLOV | XLOV 엑스러브 'SERVE' MV |
| **2** | 1 | 1 | News & Politics | Ryan Hall, Y'all | The May 18, 2026 Severe Weather Coverage, As It Happened |
| **3** | 3 | 74 | Music | LosTorosBandVEVO | Los Toros Band – Quizás Si, Quizás No (Visualizer) |
| **3** | 3 | 70 | Music | kwnVEVO | kwn – touch myself (Official Video) |

Three patterns worth flagging:

- **Music was the primary survivor.** 15 of 25 rows are cat 10 (Music). If a Gaming saturation event happens, Music is the format most likely to hold its slot — the audience for a new Olivia Rodrigo or Drake video appears to be non-substitutable with the Gaming audience YouTube's algorithm was favoring.
- **Honest Trailers appears twice at peak rank 1–2.** Screen Junkies is the only channel to place two videos in the survivor list, both format-driven (film & animation category). Format-native content outperformed algorithmic favor.
- **A 2013 lyrics upload — The Neighbourhood's "Sweater Weather" — held peak rank 1 for 3 days.** Old catalog Music can and does surface at the top of US trending; the algorithm's Gaming preference does not extend to blocking legacy Music that already has passive-view momentum.

## Three takeaways for strategists

**1. Q2 US category share numbers are skewed by this window.** Anything reporting Q2 US YouTube composition without excluding May 17–28 will overstate Gaming's real Q2 share by ~3 percentage points at the chart head. If you're planning Q3 spend on "Gaming won Q2," you're extrapolating from an anomalous 10-day window layered on top of an already Gaming-heavy baseline.

**2. YouTube's trending algorithm has monoculture failure modes.** Whatever tipped the ranker into Gaming saturation, it stayed there for 10 days without self-correcting. "Diverse trending surface" is not a load-bearing assumption for planning — treat it as an input that can degrade for a week and a half at a time.

**3. Videos that held top-40 during the lockout are outperformers by definition.** Any non-Gaming title that spent ≥3 days in the head during May 17–28 was competing against a much steeper slope than usual. The Music-dominance of the survivor list is a real signal: when the algorithm has picked a favorite, Music is the format most likely to defect from that favorite. That's a formatting decision worth acting on.

## Why nobody else could have caught this

Chart-composition analysis at 30-minute resolution over months isn't something YouTube publishes. Social Blade, TubeBuddy, and VidIQ track per-video and per-channel metrics but discard rank order in favor of view counts. To notice a chart-wide saturation event you need three things at once:

1. 30-minute-resolution snapshots of the chart itself
2. Rank order preserved per snapshot (not derived from view counts, which don't correlate to YouTube's trending rank)
3. Multi-month baseline for anomaly detection

We've collected continuously since October 2025. Q2 2026 is the first quarter with enough baseline to identify events like May 17–28 confidently.

---

## Methodology

- **Source:** YouTube Data API v3, `videos.list?chart=mostPopular&regionCode=US`, fetched every 30 minutes.
- **Rank preservation:** position in YouTube's response array is treated as rank. YouTube's own trending algorithm, not view-sorted.
- **Historical rank derivation:** for 2026-04-15 → 2026-06-27, chart-fetches share a 30-minute bucketed `captured_at` with 12 category fetches and 5 country fetches. Global-chart rank is derived by isolating the global fetch inside the shared bucket via a sliding-window category-diversity classifier over the `video_stats` insert-order sequence, then reading rank as the position in that fetch. Resolution rates cited above are directly from the classifier log.
- **Category share:** computed as `COUNT(rank_history rows where chart='global:videos' AND rank ≤ 40 AND category_id = 20) ÷ COUNT(rank_history rows where chart='global:videos' AND rank ≤ 40)` over the two windows. Lockout window measured over 6,467 resolved rank rows; rest of Q2 over 64,017 resolved rank rows.
- **Survivor list:** `video_rank_history` rows with `chart='global:videos'` AND `captured_at BETWEEN '2026-05-17' AND '2026-05-28'` AND `rank ≤ 40`, joined to `videos` where `category_id != 20`. Grouped by video, ranked by `MIN(rank)` ASC then `COUNT(DISTINCT day)` DESC then tick count DESC.
- **Chart depth:** ~50 rows per bucket in May 2026 (expanded to 200 late June via a schema change).
- **Window studied:** 2026-05-17 00:00 UTC → 2026-05-28 00:00 UTC (10 days, 480 30-minute buckets).

For methodology questions or requests to reproduce specific numbers against the underlying data, contact the author.

---

*This is Chapter 5 of the Q2 2026 YouTube US Trending Playbook — an analysis of what actually held YouTube's US trending chart April through June 2026, sourced from 30-minute rank snapshots on 200,000+ videos. Full report: mostviewed.today/reports/q2-2026*
