-- Migration to add country support for trending videos

-- Add country_code column to videos table
ALTER TABLE videos ADD COLUMN country_code TEXT DEFAULT 'US';

-- Create index for country-based queries
CREATE INDEX idx_videos_country_code ON videos(country_code);
CREATE INDEX idx_videos_country_category ON videos(country_code, category_id);
CREATE INDEX idx_videos_country_short ON videos(country_code, is_short);
