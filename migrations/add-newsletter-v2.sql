-- Newsletter subscriber status tracking (double opt-in)
ALTER TABLE newsletter_subscribers ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE newsletter_subscribers ADD COLUMN confirm_token TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN last_sent_at TEXT;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_token ON newsletter_subscribers(confirm_token);

-- Per-send tracking for bounces and history
CREATE TABLE IF NOT EXISTS newsletter_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_email TEXT NOT NULL,
    type TEXT NOT NULL,        -- 'confirmation' | 'brief'
    brief_date TEXT,           -- YYYY-MM-DD for brief emails
    status TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_email ON newsletter_sends(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_brief_date ON newsletter_sends(brief_date);

-- Mark any existing rows as already confirmed (they pre-date double opt-in)
UPDATE newsletter_subscribers SET status = 'active', confirmed_at = created_at
WHERE status IS NULL OR status = '';
