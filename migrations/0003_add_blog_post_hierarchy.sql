-- Migration number: 0003 	 2026-06-13T00:00:00.000Z

PRAGMA foreign_keys = OFF;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at;
DROP INDEX IF EXISTS idx_blog_posts_published_at;

ALTER TABLE blog_posts RENAME TO blog_posts_old;

CREATE TABLE blog_posts (
  -- Post primary key.
  id INTEGER PRIMARY KEY,
  -- Parent series identifier.
  series_id INTEGER NOT NULL,
  -- Parent post identifier. NULL means this post is a root chapter.
  parent_post_id INTEGER,
  -- URL-friendly identifier unique within the series.
  slug TEXT NOT NULL CHECK (trim(slug) <> ''),
  -- Human-readable post title.
  title TEXT NOT NULL CHECK (trim(title) <> ''),
  -- Short summary for post listings.
  summary TEXT NOT NULL DEFAULT '',
  -- Full post content body.
  content TEXT NOT NULL CHECK (trim(content) <> ''),
  -- 1-based ordering among sibling posts.
  position INTEGER NOT NULL CHECK (position > 0),
  -- Unix timestamp when the post is considered published.
  published_at INTEGER CHECK (published_at IS NULL OR published_at > 0),
  -- Unix timestamp when the post record was created.
  created_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (created_at > 0),
  -- Unix timestamp when the post record was last updated.
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (updated_at > 0),
  -- Publication workflow state.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  FOREIGN KEY (series_id) REFERENCES blog_series(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  FOREIGN KEY (parent_post_id) REFERENCES blog_posts(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  UNIQUE (series_id, slug)
);

INSERT INTO blog_posts (
  id,
  series_id,
  parent_post_id,
  slug,
  title,
  summary,
  content,
  position,
  published_at,
  created_at,
  updated_at,
  status
)
SELECT
  id,
  series_id,
  NULL AS parent_post_id,
  slug,
  title,
  summary,
  content,
  position,
  published_at,
  created_at,
  updated_at,
  status
FROM blog_posts_old;

DROP TABLE blog_posts_old;

CREATE UNIQUE INDEX idx_blog_posts_root_position
ON blog_posts(series_id, position)
WHERE parent_post_id IS NULL;

CREATE UNIQUE INDEX idx_blog_posts_child_position
ON blog_posts(parent_post_id, position)
WHERE parent_post_id IS NOT NULL;

CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);

CREATE TRIGGER trg_blog_posts_updated_at
AFTER UPDATE ON blog_posts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE blog_posts
  SET updated_at = unixepoch()
  WHERE id = OLD.id;
END;

PRAGMA foreign_keys = ON;
