PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  access_group TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  starts_on TEXT,
  due_on TEXT,
  github_repository_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  starts_on TEXT,
  due_on TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  source TEXT,
  external_url TEXT,
  github_issue_url TEXT,
  backlog_issue_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_on);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_labels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_page_id TEXT REFERENCES wiki_pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  body_markdown TEXT NOT NULL DEFAULT '',
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, slug)
);

CREATE TABLE IF NOT EXISTS wiki_revisions (
  id TEXT PRIMARY KEY,
  wiki_page_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  body_markdown TEXT NOT NULL,
  author_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  byte_size INTEGER,
  attachable_type TEXT NOT NULL CHECK (attachable_type IN ('project', 'task', 'wiki_page')),
  attachable_id TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS github_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  installation_id TEXT,
  webhook_secret_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS github_repositories (
  id TEXT PRIMARY KEY,
  github_integration_id TEXT NOT NULL REFERENCES github_integrations(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (github_integration_id, owner, name)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO workspaces (id, name, slug)
VALUES ('ws_demo', 'ProjectFlare Demo', 'demo');

INSERT OR IGNORE INTO projects (id, workspace_id, name, description, status, starts_on, due_on, github_repository_url)
VALUES (
  'prj_launch',
  'ws_demo',
  'Cloudflare Native MVP',
  'A first usable slice: tasks, gantt, wiki, webhooks, and Access-backed users.',
  'active',
  '2026-06-01',
  '2026-07-15',
  'https://github.com/example/projectflare'
);

INSERT OR IGNORE INTO tasks (id, project_id, title, description, status, priority, starts_on, due_on, progress, source)
VALUES
  ('tsk_schema', 'prj_launch', 'Design D1 schema', 'Model users, workspaces, projects, tasks, comments, wiki, webhook logs, and integration records.', 'done', 'high', '2026-06-01', '2026-06-05', 100, 'seed'),
  ('tsk_ui', 'prj_launch', 'Build project command center', 'Create a dense, scan-friendly UI for tasks, schedule, wiki, and integration status.', 'in_progress', 'high', '2026-06-04', '2026-06-20', 55, 'seed'),
  ('tsk_webhooks', 'prj_launch', 'Accept generic webhook tasks', 'Receive simple JSON payloads and turn them into triage tasks.', 'todo', 'medium', '2026-06-18', '2026-06-28', 10, 'seed'),
  ('tsk_mcp', 'prj_launch', 'Sketch MCP tool surface', 'Define first read and create operations for AI agents.', 'todo', 'medium', '2026-06-25', '2026-07-10', 0, 'seed');

INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id)
VALUES ('tsk_ui', 'tsk_schema'), ('tsk_webhooks', 'tsk_schema'), ('tsk_mcp', 'tsk_webhooks');

INSERT OR IGNORE INTO wiki_pages (id, project_id, title, slug, body_markdown)
VALUES (
  'wiki_overview',
  'prj_launch',
  'MVP Scope',
  'mvp-scope',
  '# MVP Scope\n\nProjectFlare starts as a Cloudflare-only project OS: task board, gantt timeline, markdown wiki, GitHub/webhook ingestion, and an MCP-friendly API surface.'
);
