-- Migration number: 0005 	 2026-06-24T00:00:00.000Z

CREATE TABLE poems (
  -- Poem primary key.
  id INTEGER PRIMARY KEY,
  -- Human-readable poem title.
  title TEXT NOT NULL CHECK (trim(title) <> ''),
  -- Full poem content (poems are short, no excerpt needed).
  content TEXT NOT NULL CHECK (trim(content) <> ''),
  -- Unix timestamp when the poem was created.
  created_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (created_at > 0),
  -- Unix timestamp when the poem was last updated.
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (updated_at > 0)
);

CREATE TRIGGER trg_poems_updated_at
AFTER UPDATE ON poems
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE poems
  SET updated_at = unixepoch()
  WHERE id = OLD.id;
END;
