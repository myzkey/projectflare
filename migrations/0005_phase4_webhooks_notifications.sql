ALTER TABLE webhook_endpoints ADD COLUMN mapping_json TEXT;

CREATE TABLE IF NOT EXISTS notification_channels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('webhook', 'slack', 'lark')),
  target_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_project_created_idx ON notifications(project_id, created_at);

INSERT OR IGNORE INTO notifications (id, project_id, title, body, source)
VALUES (
  'notification_phase4_ready',
  'prj_launch',
  'Phase 4 notification center ready',
  'Generic webhook intake, API tokens, and notification channels are now available.',
  'seed'
);
