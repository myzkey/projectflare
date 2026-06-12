import { createApiToken, sha256Hex } from "../../../../../core/src/domain/security";
import type { WebhookEndpoint } from "../../../../../core/src/domain/webhook";
import type {
  WebhookEndpointStore,
  WebhookEndpointUseCasePorts,
} from "../../../../../core/src/ports/webhook-endpoints";
import type { Env } from "../env";

export function createWebhookEndpointUseCasePorts(env: Env): WebhookEndpointUseCasePorts {
  return {
    ids: { create: () => crypto.randomUUID() },
    clock: { now: () => new Date().toISOString() },
    tokens: {
      create: createApiToken,
      hash: sha256Hex,
    },
    webhookEndpoints: createD1WebhookEndpointStore(env),
  };
}

export function createD1WebhookEndpointStore(env: Env): WebhookEndpointStore {
  return {
    listByProject: async (projectId) => {
      if (!env.DB) return [];
      const { results } = await env.DB.prepare(
        `SELECT id, project_id, name, secret_hash, mapping_json, enabled, created_at, updated_at
         FROM webhook_endpoints
         WHERE project_id = ?
         ORDER BY created_at DESC`,
      )
        .bind(projectId)
        .all<WebhookEndpoint>();
      return results;
    },
    create: async (endpoint) => {
      if (!env.DB) return;
      await env.DB.prepare(
        `INSERT INTO webhook_endpoints (id, project_id, name, secret_hash, mapping_json, enabled)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          endpoint.id,
          endpoint.project_id,
          endpoint.name,
          endpoint.secret_hash,
          endpoint.mapping_json,
          endpoint.enabled,
        )
        .run();
    },
  };
}
