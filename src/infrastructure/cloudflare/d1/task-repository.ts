import type { Task } from "../../../domain/task";
import type { TaskRepository, TaskUpdatePatch, TaskUseCasePorts } from "../../../ports/tasks";
import type { Env } from "../env";

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
        `SELECT *
         FROM tasks
         WHERE project_id = ?
         ORDER BY
           CASE status
             WHEN 'in_progress' THEN 1
             WHEN 'review' THEN 2
             WHEN 'todo' THEN 3
             WHEN 'done' THEN 4
             ELSE 5
           END,
           COALESCE(due_on, '9999-12-31') ASC`,
      )
        .bind(projectId)
        .all<Task>();

      return results;
    },
    findById: async (id) => {
      if (!env.DB) return null;
      return env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<Task>();
    },
    create: async (task) => {
      if (!env.DB) return;

      await env.DB.prepare(
        `INSERT INTO tasks (
           id, project_id, title, description, status, priority, starts_on, due_on,
           progress, source, external_url, github_issue_url, backlog_issue_url
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          task.id,
          task.project_id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.starts_on,
          task.due_on,
          task.progress,
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
         SET title = ?, description = ?, status = ?, priority = ?, starts_on = ?, due_on = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
        .bind(
          patch.title,
          patch.description,
          patch.status,
          patch.priority,
          patch.starts_on,
          patch.due_on,
          patch.progress,
          id,
        )
        .run();
    },
  };
}
