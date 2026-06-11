import { sha256Hex } from "../../../domain/security";
import type { GenericWebhookPorts, ProjectNotificationInput } from "../../../ports/generic-webhook";
import type { Env } from "../env";

export function createGenericWebhookPorts(
  env: Env,
  notifyProject: (projectId: string, input: ProjectNotificationInput) => Promise<void>,
): GenericWebhookPorts {
  return {
    ids: {
      create: () => crypto.randomUUID(),
    },
    clock: {
      now: () => new Date().toISOString(),
    },
    tokens: {
      verify: async (token, hash) => (await sha256Hex(token)) === hash,
    },
    webhookEndpoints: {
      findById: async (id) => {
        if (!env.DB) return null;
        return env.DB.prepare(
          `SELECT *
           FROM webhook_endpoints
           WHERE id = ?
           LIMIT 1`,
        )
          .bind(id)
          .first();
      },
    },
    webhookEvents: {
      recordGenericTaskCreated: async (input) => {
        if (!env.DB) return;
        await env.DB.prepare(
          `INSERT INTO webhook_events (id, project_id, source, event_type, payload_json)
           VALUES (?, ?, ?, 'generic.task.create', ?)`,
        )
          .bind(
            input.eventId,
            input.projectId,
            input.source,
            JSON.stringify({ endpointId: input.endpointId, payload: input.payload }),
          )
          .run();
      },
    },
    tasks: {
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
    },
    queue: {
      enqueueGenericTaskCreated: async (message) => {
        if (!env.PROJECTFLARE_QUEUE) return false;
        await env.PROJECTFLARE_QUEUE.send(message);
        return true;
      },
    },
    notifications: {
      notifyProject,
    },
  };
}
