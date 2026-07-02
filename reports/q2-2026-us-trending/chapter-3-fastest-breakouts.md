# Fastest Breakouts

## Q2's peak-velocity leaderboard on US YouTube trending

*Chapter 3 — Q2 2026 YouTube US Trending Playbook*

---

**The single fastest video on YouTube US trending in Q2 2026 hit 9.7M views/hour at peak — LAIKA Studios' "Wildwood" teaser trailer. Every video in the top 15 hit 4M+ v/hr. Football content took 3 of the top 15 spots, all from Celine Dept. Two of the top 15 are MrBeast. This is what fastest actually looked like when the poisoned velocity data is filtered out.**

---

## Why this list is credible for the first time this quarter

Peak-velocity leaderboards from YouTube trend-tracking data are notoriously unreliable. Raw view-count deltas divided by snapshot intervals produce absurd values whenever a snapshot pair is nearly duplicate in time or the underlying view count reads erratically for a moment. The raw `video_summary.peak_velocity` field on our own data had **315 Q2 videos claiming over 20M v/hr, some over 1B v/hr** — a video with 375M lifetime views cannot have gained 1.22B views in an hour, but that's what the raw math said when adjacent snapshots were 200 milliseconds apart with a large view-count jump.

For this chapter, peak velocity was recomputed with two heuristics applied jointly:
1. **Minimum 10-minute floor** between snapshot pairs — filters near-duplicate captured_at pairs from pre-bucketed collection.
2. **Impossible-jump filter** — pairs where view delta exceeds 25% of the prior snapshot's view count (when prior > 100k) are skipped. Real launches don't grow 25% in a snapshot interval; API snapshot glitches do.

After the recompute: **zero Q2 videos claim > 20M v/hr**. The distribution matches what agency benchmarks report for real premiere velocity. Numbers below are from that recompute, published for the first time.

## The top 15

| # | Peak v/hr | Category | Days on chart | Channel | Title |
|:---:|---:|---|:---:|---|---|
| 1 | **9.7M** | Film & Animation | 8 | LAIKA Studios | Wildwood – Official Teaser Trailer |
| 2 | **8.2M** | Entertainment | 6 | MrBeast | I'm Granting Wishes For My Subscribers |
| 3 | **7.4M** | Sports | 14 | Gabriel Janiques | Camisa De Tinta |
| 4 | 6.6M | Sports | 4 | Celine Dept | Who Wins The World Cup? 🤝🔊 |
| 5 | 6.5M | Sports | 11 | Celine Dept | Ronaldo Showed Me How It's Done |
| 6 | 6.1M | Entertainment | 2 | MrBeast | Subscribe for $10,000 |
| 7 | 5.6M | Education | 8 | Cinema Unfold | A Small Act of Kindness, A Lifetime of Joy |
| 8 | 5.3M | Entertainment | 10 | Vriddhi Cinemas | Peddi Official Trailer (Telugu) |
| 9 | 5.2M | People & Blogs | 10 | Veltovate | Stop struggling to make juice for your kids the old way |
| 10 | 5.1M | Science & Tech | 4 | Prototype Leaked | Robot Hair Machine Built a Perfect Bun in Seconds |
| 11 | 5.1M | Sports | 5 | Celine Dept | Can You Unlock The World Cup Footballer? |
| 12 | 5.1M | Film & Animation | 7 | Excel Movies | Mirzapur The Movie — Official Hindi Teaser |
| 13 | 4.9M | Film & Animation | 9 | YRF | ALPHA — Official Trailer |
| 14 | 4.3M | Entertainment | 3 | Mr.Tom.Y.T | Tom Holland React Viral Videos (Part 455) |
| 15 | 4.3M | Autos & Vehicles | 17 | KRTK EDT1 | Hilarious Prank Goes Wrong |

## Four patterns

**1. Film & Animation dominates the top of the velocity leaderboard.**
Four of the top 15 are Film & Animation, and three of those are official movie trailers: Wildwood (LAIKA), Mirzapur The Movie (Excel Movies), ALPHA (YRF). Trailer premieres cluster their view growth in the first ~6 hours as embed-heavy news sites push the video simultaneously. That launch shape produces the cleanest possible high-velocity read.

If your product involves timing content against film-release calendars — advertising, media buys, promotional partnerships — this list is a real-world calibration of what "big trailer premiere" velocity looks like: 5–10M v/hr for a few hours, then decay.

**2. Celine Dept placed three videos in the top 15, all football / World Cup.**
Numbers 4, 5, and 11 are all Celine Dept — a Dutch football/YouTube shorts creator whose Q2 output tracked the 2026 FIFA World Cup content cycle. This is the only channel to appear multiple times in the fastest-15. Celine Dept's format — sub-3-minute football stunts and challenges — appears to be structurally optimized for velocity spikes tied to live-event windows.

If your Q3 strategy includes a live-event tie-in (World Cup finals, Olympics, tentpole releases), Celine Dept's Q2 velocity profile is a template worth studying: repeatable 5-6M v/hr spikes, each on a different topical hook, same channel.

**3. MrBeast has two entries but both are single-video hits, not portfolio pattern.**
"I'm Granting Wishes For My Subscribers" (#2) and "Subscribe for $10,000" (#6). Both hit velocity in the top 10, but MrBeast doesn't appear on Chapter 2's champions list — meaning these Q2 videos didn't sustain top-25 rank *positions* long enough to make him a portfolio champion.

Practically: MrBeast videos in Q2 exploded on release and did not hold position. That's the opposite of the "MrBeast videos dominate for weeks" narrative that agency briefs often assume. This quarter's MrBeast profile is *velocity leader, not chart holder*.

**4. Non-Music content dominated the velocity leaderboard.**
Zero Music videos are in the fastest-15. Music dominates chart *composition* (Chapter 6) and Music channels dominate the champions list (Chapter 2), but Music does not produce the highest single-video velocity spikes. Music growth is durable — see Chapter 4 on engagement holds — but it's not explosive.

This is the mirror image of Gaming's Chapter 1 pattern: Music has high frequency but low velocity spikes. Gaming has high volume but low depth. Trailer premieres, viral MrBeast bets, and football tie-ins produce the actual velocity records.

## What this list is NOT good for

- **Predicting peak chart rank.** Note the "peak" column is `null` for 13 of these 15 videos in the underlying data — meaning the video didn't land in the recovered global chart at all, despite hitting 5-10M v/hr for hours. Velocity spikes don't translate directly to global chart position. Chapter 1's Format Ledger and Chapter 6's Category Rotation are where "chart position" lives.
- **Marketing valuation.** Peak v/hr is a launch-shape signal, not a total-reach signal. A video hitting 5M v/hr for 4 hours delivers 20M views; one at 1M v/hr for 40 hours delivers 40M. Days-on-chart × sustained engagement (Chapter 4) is where reach happens.
- **Benchmarking against other trackers.** The velocity numbers here are anchored to our specific min-delta-floor and impossible-jump-filter parameters. Any other tracker without similar hygiene will publish larger, less trustworthy numbers.

---

## Methodology

- **Sample:** videos with `first_seen` in `[2026-04-15, 2026-06-27)` and `peak_velocity < 20,000,000`. Cap chosen at 20M v/hr because zero videos exceed it after the strict recompute — anything above would be a data quality regression signal.
- **Peak velocity source:** `video_summary.peak_velocity`. Recomputed 2026-07-01 via `/api/admin/recompute-summary-stats` (strict mode) walking each video's full `video_stats` history and applying both filters below.
- **Min-delta floor:** pairs of consecutive video_stats rows less than 10 minutes apart are skipped. Prevents pre-bucketed ms-precision timestamp pairs from producing infinite velocity readings.
- **Impossible-jump filter:** pairs where `view_delta > 0.25 × prev.view_count` are skipped, when `prev.view_count > 100,000`. Videos < 100k views (fresh launches) have no filter applied because early growth can legitimately be > 25% per snapshot.
- **Confidence:** peak_velocity_at is preserved and reported in the underlying data. Top 15 velocities all landed on bucketed 30-minute captured_at values (`:00:00.000Z` or `:30:00.000Z`) — the ms-precision poison population is filtered out.

---

*This is Chapter 3 of the Q2 2026 YouTube US Trending Playbook. Full report: mostviewed.today/reports/q2-2026*
