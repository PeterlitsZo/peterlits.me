-- Migration number: 0006 	 2026-08-29T00:00:00.000Z

CREATE TABLE blog_post_view_events (
  -- Event primary key.
  id INTEGER PRIMARY KEY,
  -- Stable post identifier used for long-term statistics.
  post_id INTEGER NOT NULL,
  -- Client-generated identifier for one page view attempt.
  view_id TEXT NOT NULL CHECK (trim(view_id) <> ''),
  -- Server-generated key for 24-hour visitor de-duplication.
  visitor_key TEXT NOT NULL CHECK (trim(visitor_key) <> ''),
  -- Authenticated viewer when available.
  viewer_user_id INTEGER,
  -- Trusted server receive time.
  viewed_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (viewed_at > 0),

  -- Route and browser context captured for diagnostics.
  series_slug TEXT NOT NULL CHECK (trim(series_slug) <> ''),
  post_slug TEXT NOT NULL CHECK (trim(post_slug) <> ''),
  path TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  client_language TEXT NOT NULL DEFAULT '',
  client_timezone TEXT NOT NULL DEFAULT '',
  viewport_width INTEGER,
  viewport_height INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  client_viewed_at TEXT NOT NULL DEFAULT '',

  -- Trusted request context captured at the edge.
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  cf_ip_country TEXT NOT NULL DEFAULT '',
  accept_language TEXT NOT NULL DEFAULT '',

  is_bot INTEGER NOT NULL DEFAULT 0 CHECK (is_bot IN (0, 1)),
  is_counted_unique_24h INTEGER NOT NULL DEFAULT 0 CHECK (is_counted_unique_24h IN (0, 1)),

  FOREIGN KEY (post_id) REFERENCES blog_posts(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  FOREIGN KEY (viewer_user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  UNIQUE (post_id, view_id)
);

CREATE INDEX idx_blog_post_view_events_post_viewed_at
ON blog_post_view_events(post_id, viewed_at);

CREATE INDEX idx_blog_post_view_events_visitor_recent
ON blog_post_view_events(post_id, visitor_key, viewed_at);

CREATE INDEX idx_blog_post_view_events_viewed_at
ON blog_post_view_events(viewed_at);

CREATE TABLE blog_post_daily_views (
  post_id INTEGER NOT NULL,
  -- UTC calendar day in YYYY-MM-DD form.
  day TEXT NOT NULL CHECK (length(day) = 10),
  human_pv INTEGER NOT NULL DEFAULT 0 CHECK (human_pv >= 0),
  unique_24h_pv INTEGER NOT NULL DEFAULT 0 CHECK (unique_24h_pv >= 0),
  bot_pv INTEGER NOT NULL DEFAULT 0 CHECK (bot_pv >= 0),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (updated_at > 0),

  PRIMARY KEY (post_id, day),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
