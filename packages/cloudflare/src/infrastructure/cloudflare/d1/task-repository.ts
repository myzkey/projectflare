import type { Task } from "../../../../../core/src/domain/task";
import type { TaskRepository, TaskUpdatePatch, TaskUseCasePorts } from "../../../../../core/src/ports/tasks";
import type { Env } from "../env";

type TaskRow = Omit<Task, "tags"> & {
  tags_json?: string | null;
};

export function createTaskUseCasePorts(env: Env): TaskUseCasePorts {
  return {
    ids: {
      create: () => crypto.randomUUID(),
    },
    clock: {
      now: () => new Date().toISOString(),
    },
    tasks: createD1TaskRepository(env),
  };
}

export function createD1TaskRepository(env: Env): TaskRepository {
  return {
    listByProjectId: async (projectId) => {
      if (!env.DB) return [];

      const { results } = await env.DB.prepare(
        `SELECT t.*, u.name AS assignee_name, c.name AS category_name, c.color AS category_color, m.name AS milestone_name, m.due_on AS milestone_due_on
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_user_id
         LEFT JOIN task_categories c ON c.id = t.category_id
         LEFT JOIN task_milestones m ON m.id = t.milestone_id
         WHERE t.project_id = ?
         ORDER BY
           CASE t.status
             WHEN 'in_progress' THEN 1
             WHEN 'review' THEN 2
             WHEN 'todo' THEN 3
             WHEN 'done' THEN 4
             ELSE 5
           END,
           COALESCE(t.due_on, '9999-12-31') ASC`,
      )
        .bind(projectId)
        .all<TaskRow>();

      return results.map(taskFromRow);
    },
    findById: async (id) => {
      if (!env.DB) return null;
      const row = await env.DB.prepare(
        `SELECT t.*, u.name AS assignee_name, c.name AS category_name, c.color AS category_color, m.name AS milestone_name, m.due_on AS milestone_due_on
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_user_id
         LEFT JOIN task_categories c ON c.id = t.category_id
         LEFT JOIN task_milestones m ON m.id = t.milestone_id
         WHERE t.id = ?`,
      )
        .bind(id)
        .first<TaskRow>();
      return row ? taskFromRow(row) : null;
    },
    create: async (task) => {
      if (!env.DB) return;

      await env.DB.prepare(
        `INSERT INTO tasks (
           id, project_id, title, description, status, priority, assignee_user_id, starts_on, due_on,
           progress, parent_task_id, category_id, milestone_id, tags_json, source, external_url, github_issue_url, backlog_issue_url
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          task.id,
          task.project_id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.assignee_user_id,
          task.starts_on,
          task.due_on,
          task.progress,
          task.parent_task_id,
          task.category_id,
          task.milestone_id,
          JSON.stringify(task.tags),
          task.source,
          task.external_url,
          task.github_issue_url,
          task.backlog_issue_url,
        )
        .run();
    },
    update: async (id, patch: TaskUpdatePatch) => {
      if (!env.DB) return;

      await env.DB.prepare(
        `UPDATE tasks
         SET title = ?, description = ?, status = ?, priority = ?, assignee_user_id = ?, starts_on = ?, due_on = ?, progress = ?, parent_task_id = ?, category_id = ?, milestone_id = ?, tags_json = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
        .bind(
          patch.title,
          patch.description,
          patch.status,
          patch.priority,
          patch.assignee_user_id,
          patch.starts_on,
          patch.due_on,
          patch.progress,
          patch.parent_task_id,
          patch.category_id,
          patch.milestone_id,
          JSON.stringify(patch.tags),
          id,
        )
        .run();
    },
  };
}

function taskFromRow(row: TaskRow): Task {
  return {
    ...row,
    tags: parseTags(row.tags_json),
  };
}

function parseTags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
