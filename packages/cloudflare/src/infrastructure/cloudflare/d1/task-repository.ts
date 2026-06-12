import type { Task, TaskStatusDefinition } from "../../../../../core/src/domain/task";
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
        `SELECT t.*, u.name AS assignee_name, c.name AS category_name, c.color AS category_color, m.name AS milestone_name, m.due_on AS milestone_due_on,
           s.name AS status_name, s.color AS status_color, s.position AS status_position, s.is_done AS status_is_done, s.is_archived AS status_is_archived
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_user_id
         LEFT JOIN task_categories c ON c.id = t.category_id
         LEFT JOIN task_milestones m ON m.id = t.milestone_id
         LEFT JOIN task_statuses s ON s.project_id = t.project_id AND s.id = t.status
         WHERE t.project_id = ?
         ORDER BY
           COALESCE(s.position, 999) ASC,
           COALESCE(t.due_on, '9999-12-31') ASC`,
      )
        .bind(projectId)
        .all<TaskRow>();

      return results.map(taskFromRow);
    },
    findById: async (id) => {
      if (!env.DB) return null;
      const row = await env.DB.prepare(
        `SELECT t.*, u.name AS assignee_name, c.name AS category_name, c.color AS category_color, m.name AS milestone_name, m.due_on AS milestone_due_on,
           s.name AS status_name, s.color AS status_color, s.position AS status_position, s.is_done AS status_is_done, s.is_archived AS status_is_archived
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_user_id
         LEFT JOIN task_categories c ON c.id = t.category_id
         LEFT JOIN task_milestones m ON m.id = t.milestone_id
         LEFT JOIN task_statuses s ON s.project_id = t.project_id AND s.id = t.status
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
    listStatuses: async (projectId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT id, project_id, name, color, position, is_done, is_archived, created_at, updated_at
         FROM task_statuses
         WHERE project_id = ?
         ORDER BY position ASC, created_at ASC`,
      )
        .bind(projectId)
        .all<TaskStatusDefinition>();
      return results;
    },
    createStatus: async (status) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `INSERT INTO task_statuses (id, project_id, name, color, position, is_done, is_archived)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          status.id,
          status.project_id,
          status.name,
          status.color,
          status.position,
          status.is_done,
          status.is_archived,
        )
        .run();
    },
    updateStatus: async (projectId, statusId, patch) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `UPDATE task_statuses
         SET name = ?, color = ?, position = ?, is_done = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP
         WHERE project_id = ? AND id = ?`,
      )
        .bind(patch.name, patch.color, patch.position, patch.is_done, patch.is_archived, projectId, statusId)
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
