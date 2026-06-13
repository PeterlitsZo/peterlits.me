-- Migration number: 0004 	 2026-06-13T00:00:00.000Z

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE CHECK (trim(username) <> ''),
  password_hash TEXT NOT NULL CHECK (trim(password_hash) <> ''),
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('owner', 'reviewer')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (created_at > 0),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (updated_at > 0)
);

CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users
  SET updated_at = unixepoch()
  WHERE id = OLD.id;
END;
