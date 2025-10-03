-- Migration to add width/height columns and update is_short logic
-- Run this against your D1 database to update the schema and reclassify existing videos

-- Step 1: Add new columns if they don't exist (this may fail if columns already exist, which is OK)
ALTER TABLE videos ADD COLUMN width INTEGER;
ALTER TABLE videos ADD COLUMN height INTEGER;

-- Step 2: Update existing videos to mark them as NOT shorts
-- Since we don't have width/height data for existing videos, we'll need to re-collect them
-- For now, mark all existing shorts (duration-only based) as regular videos
-- The next data collection will properly classify them with aspect ratio data
UPDATE videos
SET is_short = 0
WHERE is_short = 1;

-- Step 3: Alternative - you can delete existing shorts to force re-collection with proper classification
-- Uncomment the following line if you prefer to delete and re-collect shorts:
-- DELETE FROM videos WHERE is_short = 1;
