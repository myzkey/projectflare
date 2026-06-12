CREATE TABLE IF NOT EXISTS installed_plugins (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  capabilities_json TEXT NOT NULL,
  settings_json TEXT,
  installed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, plugin_id)
);

CREATE TABLE IF NOT EXISTS plugin_kv (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, plugin_id, key),
  FOREIGN KEY (workspace_id, plugin_id) REFERENCES installed_plugins(workspace_id, plugin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plugin_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id, plugin_id) REFERENCES installed_plugins(workspace_id, plugin_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS plugin_events_workspace_plugin_idx ON plugin_events(workspace_id, plugin_id, created_at);

INSERT OR IGNORE INTO installed_plugins (
  workspace_id,
  plugin_id,
  version,
  enabled,
  capabilities_json,
  settings_json
)
VALUES (
  'ws_demo',
  'projectflare-demo-plugin',
  '0.1.0',
  1,
  '["routes:register","hooks.lifecycle:register","storage:kv"]',
  '{"mode":"demo"}'
);
