# mostviewed.today — Monetisation Strategy

> Last updated: June 2026  
> Status: Pre-revenue, building toward first dollar

---

## The Core Asset

**204,101 videos** tracked over 9 months (Oct 2025 – Jun 2026)  
**44.5M stat rows** in `video_stats`, captured every 30 minutes  
**7 months of fully recoverable rank history** via `video_stats` insertion order  
**Rank reconstruction** underway via `video_rank_history` backfill job

This is the moat. Nobody else has this data. YouTube doesn't even surface it in their own UI.

---

## The MVT Score

### What it is
**MVT Score — Most Viewed Today Score**

A proprietary video impact index measuring a video's trending influence — not just how many views it got, but how meaningfully it trended.

### Why it's proprietary
The formula can be replicated. The **data cannot**. 9 months of 30-minute rank snapshots on 204k videos is a multi-year head start. Competitors would need to start collecting today and wait years to catch up.

### Formula components
| Signal | What it measures |
|---|---|
| Peak position score | Best rank achieved (100 / peak_rank) |
| Duration score | Days on chart (log scale) |
| Velocity score | Peak views/hour |
| Engagement score | Day 1 like/view ratio vs current |

Future additions:
- YouTube comment sentiment (via Claude API)
- Reddit mentions (free API)
- Cross-platform social signal

### Naming
- **Full name:** Most Viewed Today Score
- **Short form:** MVT Score (how people will refer to it)
- **Tagline:** *Powered by MVT Score*
- **Not to be confused with:** MIV (Launchmetrics, fashion industry)

### Trademark
- File **MVT Score** as a trademark at IPOPHL (Philippines)
- File **mostviewed.today** separately
- Class 42 — scientific/technological services, data analysis
- Estimated cost: ₱4,000–8,000 total
- Rights established from filing date

### Methodology page
Publish a public methodology page explaining the score at a high level. Keep exact coefficient weights private (trade secret). This is what turns a formula into an industry metric.

---

## Revenue Streams

### 1. Sponsorships (first dollar — start now)

**Current stats (May 27 – Jun 25, 2026):**
- 4,800 pageviews / 3,700 unique visitors
- Ranking #1 on Bing, DuckDuckGo, Yahoo for "YouTube trending videos"
- 32% US traffic, 57% desktop (research intent)
- Traffic from 6+ search engines including Ecosia, Qwant, ChatGPT referrals

**Packages:**
| Package | Price | What's included |
|---|---|---|
| Site placement | $100/mo | Banner on leaderboard page (4k+ impressions) |
| Newsletter mention | $50/issue | Sponsored slot in The Daily Viral Brief |
| Bundle | $150/mo | Site banner + newsletter mention + "Presented by" |

**Target sponsors:**
- VidIQ — vidiq.com/contact or LinkedIn partnerships
- TubeBuddy — same approach
- Epidemic Sound / Artlist — music licensing for creators
- Descript / CapCut — video editing tools
- Beehiiv / Kit — newsletter tools
- DistroKid — music distribution

**When to pitch:**
Now. Lead with SEO ranking, not subscriber count.
> *"mostviewed.today ranks #1 across Bing, DuckDuckGo, and Yahoo for YouTube trending searches — 4.8k pageviews last 30 days, 32% US audience."*

**Scale targets:**
- 10k pageviews/mo → charge $300–500/mo per sponsor
- 100k pageviews/mo → charge $2,000–5,000/mo per sponsor

---

### 2. Pro Subscription — $9/mo

**Free tier (indexed by Google, drives SEO):**
- Current rank
- Peak rank
- Days on chart
- Rank timeline chart (sparkline)
- Basic summary — peak rank, days on chart, total days at #1

**Pro tier ($9/mo):**
- Full rank timeline breakdown (time at each position — the moat)
- View velocity chart (views/hour over time)
- Engagement rate trend (Day 1 → Week 1 → now)
- Pattern of the Week full archive
- Creator intelligence pages
- Pattern alerts

**Implementation:**
- Blur/lock overlay on Pro sections (SimilarWeb model)
- Page is publicly accessible and Google-indexable
- Premium data visible but blurred with signup prompt
- Auth required to unlock

---

### 3. Monthly Deep Dive Report — $49

**Format:** PDF report, automated monthly release

**Content:**
- Top 10 formats that dominated the month
- Breakout creators — first-timers, how long they stayed
- AI video dominance section (emerging category)
- MrBeast outlier breakdown — why his format works at scale
- Category shifts — Music vs Entertainment vs Shorts
- The one format to watch next month (predictive)
- MVT Score leaderboard for the month
- Raw stats — peak positions, days on chart, velocity leaders

**Automation:**
- Pull top stats from DB for the month
- Feed to Claude with report template prompt
- Generate narrative + format as PDF
- Distribute via Gumroad or email

**First step:**
Write the June 2026 report manually. Use newsletter content as base. Sell on Gumroad for $49. Post on X and Reddit (r/NewTubers, r/youtubers). Validate before automating.

**Pricing ladder:**
| Product | Price | Cadence |
|---|---|---|
| Monthly Report | $49 one-time or $39/mo | Monthly |
| Quarterly Deep Dive | $99 | Quarterly |
| Annual YouTube Trends Report | $149 | January each year |

**Annual report angle:**
*"YouTube 2026: What Actually Went Viral and Why"* — agencies, media companies, and creators buy this without hesitation.

---

### 4. MVT Score Leaderboards (drives all other revenue)

**Free editorial content, weekly/monthly:**
- "Top 10 Highest MVT Score Videos of June 2026"
- "Most Impactful YouTube Shorts — Q2 2026"
- "The 50 Most Impactful YouTube Videos of 2026" (annual)

**Why it matters:**
- Massive SEO and shareability
- Press pickup target (Variety, The Verge, TechCrunch)
- Drives brand inquiries → Pro subscriptions → Report sales

---

## New Pages (SEO + Monetisation Flywheel)

### Video Detail Page `/video/[youtube-id]`
- **Free:** current rank, peak rank, days on chart, rank timeline chart
- **Pro locked:** full rank timeline breakdown, view velocity, engagement trend
- **SEO value:** 204k indexable pages
- **The moat:** "Rank Timeline" — nobody else shows time at each position

### Pattern of the Week `/pattern/[slug]`
- Weekly editorial, free
- 4–5 real video examples with links to their video pages
- Why the format works
- Recurring or one-off verdict
- AI video section — emerging angle
- MrBeast outlier section — why his videos generate 9-figure views
- **SEO value:** long-tail rankable articles, backlink magnet
- Pattern only shows on video pages where the video is actually tagged — not every page

### Creator Intelligence Page `/creator/[channel-id]`
- **Free:** basic stats, currently trending videos
- **Pro locked:** format breakdown analysis, full historical performance
- **SEO value:** thousands of creator pages rankable for "[creator] YouTube trending stats"

### Country Page `/trending/[country]`
- Enhanced with today's breakout callout
- Category breakdown (already on site, expand)
- Pattern of the Week tie-in for that country
- Country grid navigation

### Internal linking structure
```
Pattern of the Week
    ↓ links to
Video Detail Pages
    ↓ links to
Creator Pages
    ↓ links back to
Pattern of the Week
```
Every new Pattern post refreshes SEO juice across hundreds of video and creator pages automatically.

---

## The Newsletter — The Daily Viral Brief

**Current:** 5 subscribers, growing via SEO  
**Format:** Daily email, free  
**Content:** Today's breakout, fast-rising Short, creator to watch, Pattern of the Day

**Role in monetisation:**
- Nurtures visitors toward Pro subscription
- Sponsor slot ($50/issue)
- Drives report sales

**Funnel:**
```
Pattern of the Week (free, SEO)
    ↓
Daily Viral Brief newsletter (free, nurture)
    ↓
Monthly Deep Dive Report ($49)
    ↓
Pro Subscription ($9/mo)
```

**Growth target:** 200–500 subscribers before pitching newsletter sponsors  
**CTA to fix:** Change from "Join early access" to "Get this sent daily, free"

---

## Chrome Extension (Future)

**Concept:** Inject MVT Score data inline on YouTube.com — VidIQ-style

**On video pages:**
- Current trending rank badge
- Peak rank + days on chart
- Rank timeline sparkline

**On creator/channel pages:**
- Total videos tracked
- Best peak rank
- Active trending videos

**Monetisation:**
- Free: trending badge (is it in top 5,300 or not)
- Pro $9/mo: full rank timeline, velocity, creator dashboard

**Important constraint:**
Extension calls your own API, not YouTube's — stays within YouTube ToS. Coverage limited to videos that have trended in your DB. Position as a trending intelligence tool, not a universal stats tool.

**Build after:** video detail pages are live and Pro subscription is validated.

---

## What's NOT Being Built (ToS constraints)

- ❌ Raw data API / data licensing — YouTube ToS prohibits reselling API data
- ❌ Data export features — same reason
- ❌ Real-time Google scraping to fill data gaps — Google ToS violation

**Safe framing:** Sell access to the application and its insights, not YouTube's data.

---

## Priority Order

| Priority | Task | Revenue impact |
|---|---|---|
| 1 | Send sponsor pitch emails | Immediate |
| 2 | Ship video detail pages (free tier) | SEO — 204k pages |
| 3 | Add Pro blur/lock layer + Stripe | First subscription revenue |
| 4 | Write June 2026 report manually | Validate $49 report model |
| 5 | Publish Pattern of the Week page | SEO + newsletter growth |
| 6 | Run rank history reconstruction job | Unlocks the full moat |
| 7 | Add MVT Score to video pages | Metric credibility |
| 8 | Publish MVT Score methodology page | Industry legitimacy |
| 9 | File MVT Score trademark at IPOPHL | Brand protection |
| 10 | Build Chrome extension | Pro subscription growth |

---

## Media Kit Stats (Jun 2026)

For sponsor pitches — attach `mostviewed-media-kit.html`

- 4,800 pageviews / 3,700 visitors (30 days)
- #1 on Bing, DuckDuckGo, Yahoo
- 32% US · 19% India · 17% China
- 57% desktop (research intent)
- 6+ search engines sending traffic
- Growing month over month