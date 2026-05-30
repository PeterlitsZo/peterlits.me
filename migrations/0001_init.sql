-- Migration number: 0001 	 2026-05-30T08:27:04.992Z

CREATE TABLE blog_series (
  -- Series primary key.
  id INTEGER PRIMARY KEY,
  -- URL-friendly unique identifier for the series.
  slug TEXT NOT NULL UNIQUE CHECK (trim(slug) <> ''),
  -- Human-readable series title.
  title TEXT NOT NULL CHECK (trim(title) <> ''),
  -- Short description for the series.
  description TEXT NOT NULL DEFAULT '',
  -- Unix timestamp when the series record was created.
  created_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (created_at > 0),
  -- Unix timestamp when the series record was last updated.
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (updated_at > 0)
);

CREATE TABLE blog_posts (
  -- Post primary key.
  id INTEGER PRIMARY KEY,
  -- Parent series identifier.
  series_id INTEGER NOT NULL,
  -- URL-friendly identifier unique within the series.
  slug TEXT NOT NULL CHECK (trim(slug) <> ''),
  -- Human-readable post title.
  title TEXT NOT NULL CHECK (trim(title) <> ''),
  -- Short summary for post listings.
  summary TEXT NOT NULL DEFAULT '',
  -- Full post content body.
  content TEXT NOT NULL CHECK (trim(content) <> ''),
  -- 1-based ordering of the post within its series.
  position INTEGER NOT NULL CHECK (position > 0),
  -- Unix timestamp when the post is considered published.
  published_at INTEGER CHECK (published_at IS NULL OR published_at > 0),
  -- Unix timestamp when the post record was created.
  created_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (created_at > 0),
  -- Unix timestamp when the post record was last updated.
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (updated_at > 0),
  FOREIGN KEY (series_id) REFERENCES blog_series(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  UNIQUE (series_id, slug),
  UNIQUE (series_id, position)
);

CREATE TRIGGER trg_blog_series_updated_at
AFTER UPDATE ON blog_series
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE blog_series
  SET updated_at = unixepoch()
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_blog_posts_updated_at
AFTER UPDATE ON blog_posts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE blog_posts
  SET updated_at = unixepoch()
  WHERE id = OLD.id;
END;
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
