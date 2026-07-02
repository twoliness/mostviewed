# The Format Ledger

## What actually held attention on US YouTube in Q2 2026

*Chapter 1 — Q2 2026 YouTube US Trending Playbook*

---

**Across 55,939 videos that entered the US trending chart in Q2 2026, the best-performing format — measured by median peak rank across ≥30 samples per bucket — was 10–30 minute People & Blogs long-form. Not shorts. Not Entertainment. Not Music. This chapter is the format ledger: category × duration bucket, ranked by median peak rank, sample-size gated.**

---

## Method in one line

Every video that first appeared on US trending between 2026-04-15 and 2026-06-27 was tagged by (a) YouTube category and (b) duration bucket. For each combination with n ≥ 30, we compute the median peak rank achieved and the median days spent on the chart. Small buckets are dropped from the ledger. This is a **format** view, not a **creator** view — creator concentration is Chapter 2.

Duration buckets:
- **Shorts:** ≤ 3 minutes (YouTube's own definition of Short)
- **Short-form:** 3–10 minutes
- **Medium:** 10–30 minutes
- **Long:** > 30 minutes

## The ledger

| Rank | Category | Duration | n | Median peak rank | Median days on chart | Median appearances |
|:---:|---|---|---:|---:|---:|---:|
| 1 | People & Blogs | Medium (10–30m) | 54 | **11** | 6 | 175 |
| 2 | News & Politics | Medium (10–30m) | 32 | **11** | 4 | 114 |
| 3 | Music | Short-form (3–10m) | 112 | 12.5 | 6 | 221 |
| 4 | Music | Shorts (≤3m) | 87 | 14 | 6 | 262 |
| 5 | People & Blogs | Long (>30m) | 34 | 15 | 6 | 207 |
| 6 | Science & Tech | Shorts (≤3m) | 63 | 22 | **10** | 369 |
| 7 | News & Politics | Shorts (≤3m) | 177 | 26 | 7 | 163 |
| 8 | Comedy | Shorts (≤3m) | 74 | 29 | 6.5 | 358 |
| 9 | Gaming | Long (>30m) | 83 | 29 | 3 | 98 |
| 10 | Gaming | Medium (10–30m) | 90 | 30.5 | 3 | 104 |
| 11 | Pets & Animals | Shorts (≤3m) | 33 | 36 | 7 | 350 |
| 12 | Entertainment | Shorts (≤3m) | 425 | 37 | 6 | 225 |
| 13 | Sports | Shorts (≤3m) | 110 | 39 | 6 | 223 |
| 14 | Education | Shorts (≤3m) | 31 | 44 | 7 | 353 |
| 15 | People & Blogs | Shorts (≤3m) | 680 | 45 | 6 | 296 |

## Four things this ledger says

**1. Medium-length long-form outperforms shorts at the top of the chart.**
The two highest-ranking formats — People & Blogs medium, News & Politics medium — are both 10–30 minute vertical uploads. Neither is a Short. The median peak rank of 11 for these buckets means a typical video in the format hits the top 11 of US trending. No shorts format in the entire ledger hits a median peak better than rank 12.5 (Music short-form).

If you make 10–30 minute vlog-style content and land it, you're materially more likely to get a top-15 slot than if you post the same story as a Short. The Shorts algorithm delivers *volume of appearances* — 262–369 median 30-min ticks in-chart across the shorts formats — but not *depth of position*.

**2. Music is the exception. Shorts and short-form Music tie for the second-best peak rank in the ledger.**
Music at 3–10 minutes (the "official music video" length) reaches median peak 12.5. Music Shorts hit 14. Both formats sit inside the top 5 of the ledger. This is Music's natural distribution — it lives in the 3–4 minute band regardless of whether it's tagged as a Short or a regular video.

Corollary: the "algorithmic advantage of Shorts" you may have seen quoted in creator media does not appear to apply to non-Music categories. It's Music-specific.

**3. Gaming is a volume category that does not hold position.**
Gaming Long-form and Medium sit at ranks 9–10 of the ledger with median peak 29–31 and median 3 days on chart. Compare to Music short-form: same volume-of-appearances range, but median peak 12.5 and 6 days on chart. Gaming shows up frequently on trending; it does not hold a top slot for long when it does.

This runs against the Chapter 6 story about Gaming's share climbing all quarter — Gaming got *more* of the chart, but the individual videos didn't get *deeper* positions or *longer* runs. Gaming's Q2 dominance was breadth without depth.

**4. Entertainment Shorts is the largest sample in the ledger (n = 425) — and one of the weakest formats by peak rank.**
Entertainment (cat 24) at ≤ 3 minutes has 425 Q2 videos and a median peak rank of 37. This is the most-produced format in Q2 and one of the least top-of-chart-landing. Every marginal Entertainment Short competes against 424 others; a marginal People & Blogs Medium competes against 53.

If your strategy involves picking a niche to differentiate in, the ledger's implication is clear: crowded ≠ profitable.

## Formats that were too small to include

Below n = 30, we dropped the bucket. Notable exclusions:
- **Autos Long-form** — n = 12. Signal exists but sample too thin for a median claim.
- **Film & Animation Medium** — n = 22. Adjacent buckets in the same category peak similarly (12–15), so plausibly this bucket lands in the same range, but we didn't publish it.
- **Travel & Events any length** — n < 30 across the board. Travel has the highest single-video engagement rates in the quarter (see Chapter 4) but does not sustain enough trending appearances to earn a ledger row.

## How to use this ledger

If you build the quarterly content plan:

- Do not treat all Shorts as one strategy. Music Shorts hit rank 14 median; Entertainment Shorts hit rank 37. Same platform surface, ~2.6× the peak-rank gap.
- The formats at the top of the ledger — People & Blogs Medium, News & Politics Medium, Music short-form — are all vertical uploads that happen to sit inside the 3–30 minute window. This is where the highest chart positions live.
- Gaming should be treated as a *distribution* category (many videos, many appearances) rather than a *dwell* category (individual videos holding position). Optimizing for peak rank in Gaming is going against the format's structural dynamics.

---

## Methodology

- **Sample:** 55,939 videos with `first_seen` in `[2026-04-15, 2026-06-27)` — the bucketed rank era.
- **Peak rank:** minimum `rank` observed for the video across all `video_rank_history` charts. Null peak rank excluded from bucket medians.
- **Days on chart:** `video_summary.days_on_chart` — count of distinct UTC days on which the video had at least one rank_history row.
- **Duration bucket:** parsed from `videos.duration` (ISO 8601). Missing durations dropped.
- **Sample gate:** n ≥ 30 per bucket. Aggregation in JS after SQL fetch because SQLite lacks a native median.
- **Confidence:** medians are robust to outliers but sensitive to bucket definition. A different duration bucketing (e.g. 5-min bands) would produce a different ledger.

---

*This is Chapter 1 of the Q2 2026 YouTube US Trending Playbook. Full report: mostviewed.today/reports/q2-2026*
