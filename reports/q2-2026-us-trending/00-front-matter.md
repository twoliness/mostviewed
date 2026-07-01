# YouTube US Trending Q2 2026

## The Format Report

*What actually held YouTube's attention April through June 2026 — sourced from 30-minute rank snapshots on 200,000+ videos, published on the day Q2 closed.*

---

**Author:** Most Viewed Today (mostviewed.today)
**Publication date:** 2026-07-01
**Report version:** 1.0
**Data window:** 2026-04-15 → 2026-06-27 (bucketed rank era, US region)
**Underlying sample:** 55,939 videos entered US trending in the window; 86,896 recovered rank snapshots on `chart=mostPopular&regionCode=US`; 11,429 videos with valid Day-1 and Week-1 engagement anchors.
**Price:** $99
**Refund policy:** Full refund within 14 days of purchase, no questions asked.

---

## Executive summary

**Five findings this report defends with data.**

**1. Gaming climbed from 24% to 46% of the US trending top-25 across Q2** *(Chapter 6)*.
The Gaming Lockout of May 17–28 was not an isolated anomaly — it was the peak of a quarter-long rise. Gaming displaced Music as the plurality category the week of May 11 and has held first place every week since.

**2. Ten-to-thirty-minute People & Blogs long-form is the best-performing format on the chart** *(Chapter 1)*.
Not Shorts. Not Music videos. Not Entertainment. The 54 Q2 videos in this bucket hit a median peak rank of 11 with a median 6 days on chart. No Shorts format in the ledger peaks better than rank 12.5.

**3. Music has the highest Day-1 engagement rate on YouTube — and by far the fastest decay** *(Chapter 4)*.
Median Music engagement: 3.22% Day 1, 2.05% Week 1, 1.81% Now. That's a 44% drop in retained engagement over one week. Gaming, by contrast, holds 97% of its Day-1 engagement at Week 1. If your sponsorship math assumes flat engagement across a video's lifecycle, Music-inventory pricing is roughly 2× wrong.

**4. Half of the 25 Q2 champion channels are Indian-market music and news** *(Chapter 2)*.
The US `mostPopular` chart is not what most agency briefs assume it is. 14 of the 25 channels that placed two or more videos in the Q2 top-25 are Tamil, Telugu, Punjabi, or Hindi content producers. If your Q3 "US YouTube reach" plan does not budget for Indian-diaspora content, it under-represents the surface by roughly half.

**5. The May 17–28 Gaming Lockout broke the historical reconstruction pipeline** *(Chapter 5)*.
Under standard boundary-detection parameters, only 4 of 500 30-minute snapshots (0.8%) in the window were recoverable. Under aggressive parameters, 268 of 499 (54%). Direct sampling of raw buckets showed Gaming holding 62–75% of the top-40 slots for 10 consecutive days — the algorithm's monoculture failure mode is documented for the first time in this report.

---

## What this report is

A quarterly data document on YouTube's `mostPopular?regionCode=US` chart. Every finding is a defensible query against a preserved dataset. Where the data has known limits, the chapter says so. Where a finding could be misused, the chapter flags the misuse. Every methodology footer specifies the query, sample size, and confidence level.

## What this report is not

- **Not a global report.** The data source is US-region trending. Findings do not claim global coverage.
- **Not a prediction report.** Chapter 7 documents Q2-close signals; it does not predict Q3 outcomes.
- **Not derived from Social Blade, TubeBuddy, or third-party trackers.** Every number in this report is computed against 30-minute chart snapshots collected continuously by Most Viewed Today since October 2025.
- **Not comprehensive across every category.** Categories with fewer than 30–50 samples per bucket are excluded from category-level medians. Small-sample buckets are named as excluded in each chapter's methodology.

## Who this report is for

- **Content strategists at agencies.** Chapters 1, 2, 6 map directly to the "what should we make next quarter" briefing question. Chapter 4 changes the pricing math on Music sponsorship.
- **MCN / talent managers.** Chapter 2's champion list and Chapter 3's velocity leaders name specific channels worth reviewing before Q3 roster decisions.
- **Solo creators planning Q3.** Chapter 1's format ledger is a direct answer to "what format has the best odds of peaking high?" Chapter 4 changes the format-choice math on retention KPIs.
- **Brands allocating YouTube sponsorship budget.** Chapter 4's engagement decay data is a direct input to sponsor pricing. Chapters 2 and 3 name the specific channels a Q3 budget should be tested against.

## Table of contents

| Chapter | Title | Length |
|---|---|---|
| Front matter | Cover, executive summary, TOC | this page |
| 1 | [The Format Ledger — What Actually Held Attention This Quarter](chapter-1-format-ledger.md) | ~1,500 words |
| 2 | [Champions and Holders — The 25 Creators Who Landed Multiple Videos in Q2 Top 25](chapter-2-champions-and-holders.md) | ~1,400 words |
| 3 | [Fastest Breakouts — Q2's Peak-Velocity Leaderboard](chapter-3-fastest-breakouts.md) | ~1,600 words |
| 4 | [Engagement Holds — Which Formats Kept Their Audience After the First Day](chapter-4-engagement-holds.md) | ~1,600 words |
| 5 | [The Gaming Lockout — How YouTube's US Trending Chart Saturated for 10 Days in May 2026](chapter-5-gaming-lockout.md) | ~1,900 words |
| 6 | [Category Rotation — The Weekly Composition of the US Trending Head](chapter-6-category-rotation.md) | ~1,700 words |
| 7 | [Signals at Q2 Close — What Was Climbing, Holding, or Breaking Out on June 27, 2026](chapter-7-signals-at-close.md) | ~1,700 words |

## How to read this report

- **Reading in order** gives you the format → creator → velocity → engagement → anomaly → composition → close-of-quarter arc. Each chapter is designed to stand alone but they connect.
- **If you have 15 minutes,** read the executive summary above, Chapter 5 (Gaming Lockout), and Chapter 6 (Category Rotation). Those three surfaces expose the quarter's single biggest story.
- **If you're using this to inform a Q3 pitch or brief,** Chapters 1, 2, and 4 have the material with the clearest "so here's what to do" implication.
- **If you're checking methodology,** every chapter has a methodology footer specifying the query, sample size, filters applied, and confidence caveats. All numbers were produced by two internal admin endpoints (`/api/admin/q2-report-data` and `/api/admin/lockout-analysis`) that are re-runnable — the same numbers can be reproduced from the underlying data window on demand.

## Publisher information

**Most Viewed Today** is a YouTube trending intelligence platform at mostviewed.today. We collect the YouTube `mostPopular` chart at 30-minute resolution across 7 country regions (US, UK, Canada, Australia, India, Germany, Brazil) continuously since October 2025. This report is our first quarterly deep-dive publication.

For methodology questions, data reproduction requests, or bulk-license inquiries, contact karen.redona@gmail.com.

For quarterly report subscription (Q3 2026 report will publish 2026-10-01 at $99 or $89 annual), sign up at mostviewed.today/reports.

---

*Report © 2026 Most Viewed Today. Data © YouTube (collected via public YouTube Data API v3 in compliance with API Terms of Service).*
