import { normalizePriority } from "../../domain/task";
import type { PublicWebhookEndpoint, WebhookEndpoint } from "../../domain/webhook";
import type { WebhookEndpointUseCasePorts } from "../../ports/webhook-endpoints";

export async function listWebhookEndpointsUseCase(
  projectId: string,
  ports: WebhookEndpointUseCasePorts,
): Promise<PublicWebhookEndpoint[]> {
  const endpoints = await ports.webhookEndpoints.listByProject(projectId);
  return endpoints.map(toPublicEndpoint);
}

export async function createWebhookEndpointUseCase(
  input: {
    projectId: string;
    baseUrl: string;
    name?: string | null;
    source?: string | null;
    defaultPriority?: string | null;
  },
  ports: WebhookEndpointUseCasePorts,
): Promise<PublicWebhookEndpoint> {
  const token = ports.tokens.create();
  const tokenHash = await ports.tokens.hash(token);
  const now = ports.clock.now();
  const endpoint: WebhookEndpoint = {
    id: ports.ids.create(),
    project_id: input.projectId,
    name: input.name?.trim() || "Generic intake",
    secret_hash: tokenHash,
    mapping_json: JSON.stringify({
      source: input.source || "generic_webhook",
      defaultPriority: normalizePriority(input.defaultPriority),
    }),
    enabled: 1,
    created_at: now,
    updated_at: now,
  };

  await ports.webhookEndpoints.create(endpoint);
  return {
    ...toPublicEndpoint(endpoint),
    token,
    endpoint_url: new URL(`/api/webhooks/generic/${endpoint.id}`, input.baseUrl).toString(),
  };
}

function toPublicEndpoint(endpoint: WebhookEndpoint): PublicWebhookEndpoint {
  return { ...endpoint, secret_hash: "stored" };
}
