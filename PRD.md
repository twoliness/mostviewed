📄 PRD: YouTube Trending & Category Leaderboard Site
1. Overview

A website that displays YouTube’s most viewed videos, updated automatically every 30–60 minutes.
It highlights:

Global Top 10 (all categories)

Top 10 by ~20 selected categories

Top 10 Shorts videos (if identifiable)

The site aims to serve as a public reference hub for trending content with potential to expand into historical data, creator dashboards, and monetization features.

2. Objectives

Provide an easy-to-browse leaderboard of trending YouTube videos.

Make data refresh every 30–60 minutes.

Keep infra/API costs low (use free YouTube Data API quota efficiently).

SEO-friendly site structure to attract organic traffic.

3. Users
Primary

Casual viewers/fans: Want to see “what’s trending now.”

Creators/agencies: Quick reference to top videos in their niche.

Secondary

Researchers/media outlets: Quick embed/reference for trending charts.

4. Core Features
🎯 MVP Scope

Global Top 10 Leaderboard

API: videos.list with chart=mostPopular

Sorted by views

Updated hourly

Top 10 per Category (20 categories: Music, Gaming, Sports, News, etc.)

API: videos.list with videoCategoryId

Each category has its own page/endpoint

Shorts Leaderboard

Filter “most popular” results by video length < 60s.

Display global top 10 Shorts.

Leaderboard Display

Thumbnail, title, channel name, view count.

Optional: small delta (e.g., +100k views since last snapshot).

Data Refresh

Cron job every 30–60 minutes.

Store snapshots in DB (D1).

🚀 Future (Post-MVP / Monetization)

Historical trends: View charts over 7/30/90 days.

Compare videos/artists side by side.

Creator dashboards + alerts.

Export/CSV/API access (paid).

Fan features: Share cards, embed charts.

5. Tech Stack

Frontend: Cloudflare Pages (Next.js + ECharts/Chart.js).

Backend: Cloudflare Worker (API + Cron).

DB: Cloudflare D1 (video metadata + stats).

Cache: KV (for hot leaderboard responses).

Data Source: YouTube Data API (free quota).

6. Data Model (Simplified)

videos

id (videoId, PK)

title

channel_id

channel_title

category_id

published_at

thumb_url

video_stats

video_id (FK → videos)

captured_at (timestamp, PK)

view_count

like_count (optional)

7. Success Metrics

Time-on-site (people browsing categories).

Organic traffic from SEO (/charts/music, /charts/gaming, /charts/shorts).

Number of repeat visits (check trends).

Later: number of subscribers if premium plan is added.

8. Timeline

Week 1: Set up Worker cron job + D1 schema + fetch global/category/shorts leaderboards.

Week 2: Build frontend Pages site with simple charts + SEO-friendly routes.

Week 3: Deploy + start monitoring traffic.

Week 4+: Add deltas (growth/hour), simple history views, explore monetization.

Additional features:
- estimated income for each video based on the number of views and ads. 
- creator estimated income based on accummulated number of videos views
- income calculator
