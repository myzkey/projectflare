import type { TaskComment, TaskDependency } from "../../../../../core/src/domain/task-collaboration";
import type {
  TaskCollaborationRepository,
  TaskCollaborationUseCasePorts,
} from "../../../../../core/src/ports/task-collaboration";
import type { Env } from "../env";

export function createTaskCollaborationUseCasePorts(env: Env): TaskCollaborationUseCasePorts {
  return {
    ids: { create: () => crypto.randomUUID() },
    clock: { now: () => new Date().toISOString() },
    collaboration: createD1TaskCollaborationRepository(env),
  };
}

export function createD1TaskCollaborationRepository(env: Env): TaskCollaborationRepository {
  return {
    listProjectDependencies: async (projectId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT d.task_id, d.depends_on_task_id, t.title AS task_title, parent.title AS depends_on_title, d.created_at
         FROM task_dependencies d
         JOIN tasks t ON t.id = d.task_id
         JOIN tasks parent ON parent.id = d.depends_on_task_id
         WHERE t.project_id = ?
         ORDER BY d.created_at DESC`,
      )
        .bind(projectId)
        .all<TaskDependency>();
      return results;
    },
    listTaskDependencies: async (taskId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT d.task_id, d.depends_on_task_id, t.title AS task_title, parent.title AS depends_on_title, d.created_at
         FROM task_dependencies d
         JOIN tasks t ON t.id = d.task_id
         JOIN tasks parent ON parent.id = d.depends_on_task_id
         WHERE d.task_id = ?
         ORDER BY d.created_at DESC`,
      )
        .bind(taskId)
        .all<TaskDependency>();
      return results;
    },
    createDependency: async (dependency) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id)
         VALUES (?, ?)`,
      )
        .bind(dependency.task_id, dependency.depends_on_task_id)
        .run();
    },
    listComments: async (taskId, options) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT c.*, u.name AS author_name
         FROM task_comments c
         LEFT JOIN users u ON u.id = c.author_user_id
         WHERE c.task_id = ?
         ORDER BY c.created_at DESC
         LIMIT ?`,
      )
        .bind(taskId, options.limit)
        .all<TaskComment>();
      return results;
    },
    createComment: async (comment) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `INSERT INTO task_comments (id, task_id, author_user_id, body)
         VALUES (?, ?, ?, ?)`,
      )
        .bind(comment.id, comment.task_id, comment.author_user_id, comment.body)
        .run();
    },
    findTaskNotificationTarget: async (taskId) => {
      if (!env.DB) return null;
      return env.DB.prepare("SELECT project_id, title FROM tasks WHERE id = ?")
        .bind(taskId)
        .first<{ project_id: string; title: string }>();
    },
  };
}
