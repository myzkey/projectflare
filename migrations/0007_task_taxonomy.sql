PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS task_categories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563eb',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS task_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_on TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, name)
);

ALTER TABLE tasks ADD COLUMN category_id TEXT REFERENCES task_categories(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN milestone_id TEXT REFERENCES task_milestones(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks(category_id);
CREATE INDEX IF NOT EXISTS tasks_milestone_idx ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks(assignee_user_id);

INSERT OR IGNORE INTO users (id, email, name)
VALUES
  ('usr_pm', 'pm@projectflare.local', 'Project Manager'),
  ('usr_engineer', 'engineer@projectflare.local', 'Platform Engineer');

INSERT OR IGNORE INTO task_categories (id, project_id, name, color)
VALUES
  ('cat_platform', 'prj_launch', 'Platform', '#2563eb'),
  ('cat_product', 'prj_launch', 'Product', '#16a34a'),
  ('cat_integrations', 'prj_launch', 'Integrations', '#9333ea');

INSERT OR IGNORE INTO task_milestones (id, project_id, name, due_on)
VALUES
  ('ms_mvp', 'prj_launch', 'MVP', '2026-07-15'),
  ('ms_integrations', 'prj_launch', 'Integrations', '2026-07-01');

UPDATE tasks
SET assignee_user_id = 'usr_engineer', category_id = 'cat_platform', milestone_id = 'ms_mvp', tags_json = '["schema","cloudflare"]'
WHERE id = 'tsk_schema';

UPDATE tasks
SET assignee_user_id = 'usr_pm', category_id = 'cat_product', milestone_id = 'ms_mvp', tags_json = '["ui","react"]'
WHERE id = 'tsk_ui';

UPDATE tasks
SET assignee_user_id = 'usr_engineer', category_id = 'cat_integrations', milestone_id = 'ms_integrations', tags_json = '["webhook","automation"]'
WHERE id = 'tsk_webhooks';
