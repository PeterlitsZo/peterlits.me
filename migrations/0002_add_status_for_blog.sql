-- Migration number: 0002 	 2026-05-30T09:27:39.622Z

ALTER TABLE blog_series
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
CHECK (status IN ('draft', 'ongoing', 'completed', 'archived'));

ALTER TABLE blog_posts
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
CHECK (status IN ('draft', 'published', 'archived'));

-- Existing posts with a publish timestamp should be marked as published.
UPDATE blog_posts
SET status = 'published'
WHERE published_at IS NOT NULL;

-- Existing series with published posts should be treated as ongoing by default.
UPDATE blog_series
SET status = 'ongoing'
WHERE EXISTS (
  SELECT 1
  FROM blog_posts
  WHERE blog_posts.series_id = blog_series.id
    AND blog_posts.status = 'published'
);

CREATE INDEX idx_blog_series_status ON blog_series(status);
