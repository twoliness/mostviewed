# VidTrends Deployment Guide

This guide walks you through deploying the VidTrends YouTube leaderboard application to Cloudflare.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **YouTube Data API Key**: Get one from [Google Cloud Console](https://console.developers.google.com/)
3. **Wrangler CLI**: Install with `npm install -g wrangler`

## Setup Steps

### 1. Authentication

```bash
# Login to Cloudflare
wrangler auth login
```

### 2. Create D1 Database

```bash
# Create the database
wrangler d1 create vidtrends-db

# Note the database ID from the output and update wrangler.jsonc
```

Update `wrangler.jsonc` with your database ID:
```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "vidtrends-db",
    "database_id": "your-actual-database-id-here"
  }
]
```

### 3. Initialize Database Schema

```bash
# Apply the schema
wrangler d1 execute vidtrends-db --file=./schema.sql
```

### 4. Create KV Namespace

```bash
# Create KV namespace for caching
wrangler kv namespace create "CACHE"

# Note the namespace ID and update wrangler.jsonc
```

Update `wrangler.jsonc` with your KV namespace ID:
```json
"kv_namespaces": [
  {
    "binding": "CACHE",
    "id": "your-actual-kv-namespace-id-here"
  }
]
```

### 5. Set Environment Variables

```bash
# Set your YouTube API key
wrangler secret put YOUTUBE_API_KEY
# Enter your actual YouTube API key when prompted
```

### 6. Deploy the Application

```bash
# Build and deploy
npm run deploy
```

### 7. Verify Deployment

1. Visit your deployed URL
2. Check that the global leaderboard loads
3. Verify cron job is running: `wrangler tail` and wait for scheduled events

## Local Development

### 1. Setup Local Environment

Copy `.dev.vars` and add your YouTube API key:
```
YOUTUBE_API_KEY=your-actual-youtube-api-key-here
```

### 2. Create Local D1 Database

```bash
# Create local database
wrangler d1 create vidtrends-db --local

# Apply schema locally
wrangler d1 execute vidtrends-db --local --file=./schema.sql
```

### 3. Run Development Server

```bash
# Start the development server
npm run dev
```

### 4. Test Data Collection

```bash
# Manually trigger data collection (for testing)
curl -X POST http://localhost:3000/trigger-collection
```

## Monitoring

### View Logs
```bash
wrangler tail
```

### Check Database
```bash
# Query the database
wrangler d1 execute vidtrends-db --command="SELECT COUNT(*) FROM videos"
```

### View Analytics
Visit the Cloudflare dashboard to monitor:
- Request volume
- Error rates
- Database usage
- KV operations

## Troubleshooting

### Common Issues

1. **API Rate Limits**: YouTube API has quotas. Monitor usage in Google Cloud Console.

2. **Database Connection**: Ensure D1 database ID is correct in wrangler.jsonc.

3. **Environment Variables**: Check that YOUTUBE_API_KEY is set as a secret.

4. **Cron Jobs**: Verify cron trigger syntax in wrangler.jsonc.

### Debug Commands

```bash
# Check wrangler configuration
wrangler whoami

# View environment
wrangler dev --local

# Test database connection
wrangler d1 execute vidtrends-db --command="SELECT 1"
```

## Production Considerations

1. **API Quotas**: Monitor YouTube API usage to stay within limits
2. **Database Size**: Plan for growth and consider data retention policies
3. **Cache Strategy**: KV cache reduces database load
4. **Error Handling**: Monitor error rates and set up alerts
5. **Backup**: Consider database backup strategy

## Scaling

- **Multiple Regions**: Use Cloudflare's global network
- **Rate Limiting**: Implement if needed for API protection
- **Analytics**: Add analytics to track popular content
- **CDN**: Static assets are automatically cached by Cloudflare