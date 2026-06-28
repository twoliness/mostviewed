# mostviewed.today — Monetisation Strategy

> Last updated: June 28, 2026  
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

**Platform performance layer (v1 — live now):**
| Signal | What it measures |
|---|---|
| Peak position score | Best rank achieved (100 / peak_rank) |
| Duration score | Days on chart (log scale) |
| Velocity score | Peak views/hour |
| Engagement score | Day 1 like/view ratio vs current |

**Cultural penetration layer (v2 — roadmap):**
| Signal | What it measures | Source |
|---|---|---|
| Comment sentiment | Whether people felt something — positive/negative/neutral | YouTube API + Claude |
| Reddit mentions | Discussion volume and tone outside YouTube | Reddit free API |
| Social noise | Cross-platform conversation signal | X API (later) |

The cultural penetration layer is what separates MVT Score from every other metric. A video can have 200M views and zero social conversation — algorithmic reach, not cultural impact. A video with 80M views but exploding Reddit threads and positive comment sentiment is worth 10x the sponsorship premium to a brand.

**The core insight:**
> MVT Score is the first metric that tells you not just how many people watched — but how many people cared.

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

### 2. Pro Subscription

**Pricing decision: $9 is underpriced. Launch at $19/mo.**

VidIQ charges $16–415/mo for creator-only data. TubeBuddy charges $9–49/mo. You offer cross-creator, cross-video trending intelligence with 9 months of historical rank data nobody else has. $9 undervalues that.

**Tiering:**
| Tier | Price | Who it's for |
|---|---|---|
| Free | $0 | Basic leaderboard, SEO, newsletter |
| Creator | $19/mo | Solo creators, researchers, journalists |
| Pro | $49/mo | Agencies, content strategists, MCNs |
| Brand | $199/mo | Brand teams, talent managers, sponsors |

Start at $19/mo to get first 10 paying users fast. Raise to $49 once testimonials exist. $199 Brand tier when agencies find you organically.

**Free tier (indexed by Google, drives SEO):**
- Current rank
- Peak rank
- Days on chart
- Rank timeline chart (sparkline)
- Basic summary — peak rank, days on chart, total days at #1

**Creator $19/mo:**
- Full rank timeline breakdown (time at each position — the moat)
- View velocity chart (views/hour over time)
- Engagement rate trend (Day 1 → Week 1 → now)
- Interactive views + rank comparison chart
- Pattern of the Week full archive
- Pattern alerts

**Pro $49/mo (everything in Creator plus):**
- Creator intelligence pages — full historical performance
- Format breakdown analysis per creator
- Compare any two videos side by side
- MVT Score breakdown per video
- Comment sentiment data (v2)

**Brand $199/mo (everything in Pro plus):**
- Reddit + social noise signals (v2)
- Full MVT Score with cultural penetration layer
- Exportable MVT Score reports for internal pitching
- Priority data access

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
Creator $19/mo → Pro $49/mo → Brand $199/mo
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
- Creator $19/mo: full rank timeline, velocity, creator dashboard
- Pro $49/mo: MVT Score overlay, comparison mode

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

## ROI by Buyer

The tool's value isn't the same for every buyer. Here's how to frame ROI per segment.

### Content Strategist / Agency
They're paid to answer: "what should we make next?" Trend research that took 3 hours takes 15 minutes.
> "Save 10+ hours of trend research per month. At $100/hr that's $1,000 in recovered billable time — for $49/mo."

### YouTube Creator
Every video is a bet. Knowing that survival + cash prize videos hold #1 for 18+ days vs 4 days for challenge videos changes the format decision before production budget is spent.
> "One better-performing video pays for a year of Pro. If the right format gets you 50K more views, what's that worth in ad revenue or sponsorships?"

### Talent Manager / MCN
They need to justify roster decisions and pitch sponsors. MVT Score gives them a number that proves a creator's content holds attention, not just gets clicks.
> "Close one additional brand deal using MVT Score data. Average YouTube sponsorship for a mid-tier creator: $5,000–20,000. Tool cost: $199/mo."

### Brand / Marketing Team
They're allocating sponsorship budget and need defensible data internally. Views are table stakes. MVT Score with social noise tells them which creator's content actually penetrated culture.
> "Allocate $50,000 sponsorship budget with confidence. One wrong creator pick costs more than a year of the tool."

### The single clearest ROI statement across all buyers
> *mostviewed.today shows you what's actually working on YouTube — not just what's popular right now, but what held attention longest, grew fastest, and followed a repeatable pattern. Make better content decisions, faster, with data nobody else publishes.*

---

## MVT Score — The Brand Deal Signal

The MVT Score ROI is clearest in the brand sponsorship context.

Every tool shows the same surface metrics — views, likes, subscribers. Brands already have that. What they can't see is whether a video **penetrated culture** — are real people talking about it outside YouTube?

**Signal vs noise:**
- 200M views, zero social conversation = algorithmic reach, passive watching, forgotten
- 80M views, exploding Reddit threads, positive comment sentiment = cultural moment, embedded in the zeitgeist

For a brand, the second video is worth 10x the sponsorship premium of the first.

**What MVT Score proves in a brand pitch:**
> *"Creator A's last video had MVT Score 847 — top 3% of Entertainment. It held #1 for 12 days, comment sentiment was 89% positive, and Reddit discussion volume was 3x the category average. Creator B's last video peaked for 6 hours and has no social conversation."*

That's the data that closes a $50,000 sponsorship decision internally.

---

## Priority Order

| Priority | Task | Revenue impact |
|---|---|---|
| 1 | Send sponsor pitch emails | Immediate |
| 2 | Ship video detail pages (free tier) | SEO — 204k pages |
| 3 | Add Pro blur/lock layer + Stripe at $19/mo | First subscription revenue |
| 4 | Write June 2026 report manually | Validate $49 report model |
| 5 | Publish Pattern of the Week page | SEO + newsletter growth |
| 6 | Run rank history reconstruction job | Unlocks the full moat |
| 7 | Add MVT Score v1 to video pages | Metric credibility |
| 8 | Publish MVT Score methodology page | Industry legitimacy |
| 9 | Add YouTube comment sentiment via Claude API | MVT Score v2 — cultural layer |
| 10 | Add Reddit mentions signal | MVT Score v2 — social noise |
| 11 | Launch $49/mo Pro tier with full MVT Score | Agency / MCN revenue |
| 12 | File MVT Score trademark at IPOPHL | Brand protection |
| 13 | Launch $199/mo Brand tier with social noise data | Brand deal revenue |
| 14 | Build Chrome extension | Pro subscription growth |

---

## Media Kit Stats (Jun 2026)

For sponsor pitches — attach `mostviewed-media-kit.html`

- 5,000 pageviews / 3,700 visitors (30 days)
- #1 on Bing, DuckDuckGo, Yahoo
- 32% US · 19% India · 17% China
- 57% desktop (research intent)
- 6+ search engines sending traffic
- Growing month over month