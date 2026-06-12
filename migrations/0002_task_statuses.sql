PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS task_statuses (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  position INTEGER NOT NULL DEFAULT 1,
  is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, id),
  UNIQUE (project_id, name)
);

INSERT OR IGNORE INTO task_statuses (id, project_id, name, color, position, is_done, is_archived)
SELECT 'todo', id, 'Todo', '#64748b', 1, 0, 0 FROM projects;

INSERT OR IGNORE INTO task_statuses (id, project_id, name, color, position, is_done, is_archived)
SELECT 'in_progress', id, 'In Progress', '#2563eb', 2, 0, 0 FROM projects;

INSERT OR IGNORE INTO task_statuses (id, project_id, name, color, position, is_done, is_archived)
SELECT 'review', id, 'Review', '#d97706', 3, 0, 0 FROM projects;

INSERT OR IGNORE INTO task_statuses (id, project_id, name, color, position, is_done, is_archived)
SELECT 'done', id, 'Done', '#16a34a', 4, 1, 0 FROM projects;

INSERT OR IGNORE INTO task_statuses (id, project_id, name, color, position, is_done, is_archived)
SELECT 'archived', id, 'Archived', '#6b7280', 5, 0, 1 FROM projects;

CREATE TABLE IF NOT EXISTS tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES task_categories(id) ON DELETE SET NULL,
  milestone_id TEXT REFERENCES task_milestones(id) ON DELETE SET NULL,
  starts_on TEXT,
  due_on TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  external_url TEXT,
  github_issue_url TEXT,
  backlog_issue_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tasks_new (
  id, project_id, title, description, status, priority, assignee_user_id, category_id,
  milestone_id, starts_on, due_on, progress, parent_task_id, tags_json, source,
  external_url, github_issue_url, backlog_issue_url, created_at, updated_at
)
SELECT
  id, project_id, title, description, status, priority, assignee_user_id, category_id,
  milestone_id, starts_on, due_on, progress, parent_task_id, tags_json, source,
  external_url, github_issue_url, backlog_issue_url, created_at, updated_at
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_on);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks(category_id);
CREATE INDEX IF NOT EXISTS tasks_milestone_idx ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS task_statuses_project_position_idx ON task_statuses(project_id, position);

PRAGMA foreign_keys = ON;
