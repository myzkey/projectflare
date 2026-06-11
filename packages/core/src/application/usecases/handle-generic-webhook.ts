import { ApplicationError } from "../../domain/errors";
import { createTask, normalizePriority } from "../../domain/task";
import { parseWebhookMapping, stringFrom } from "../../domain/webhook";
import type { GenericWebhookPorts } from "../../ports/generic-webhook";

export type HandleGenericWebhookInput = {
  endpointOrProjectId: string;
  token: string | null;
  payload: Record<string, unknown>;
};

export async function handleGenericWebhookUseCase(input: HandleGenericWebhookInput, ports: GenericWebhookPorts) {
  const endpoint = await ports.webhookEndpoints.findById(input.endpointOrProjectId);
  let projectId = input.endpointOrProjectId;

  if (endpoint) {
    if (!endpoint.enabled) throw new ApplicationError("webhook_endpoint_disabled", 403);
    if (!input.token || !(await ports.tokens.verify(input.token, endpoint.secret_hash))) {
      throw new ApplicationError("invalid_webhook_token", 401);
    }
    projectId = endpoint.project_id;
  }

  const mapping = parseWebhookMapping(endpoint?.mapping_json || null);
  const task = createTask({
    id: ports.ids.create(),
    projectId,
    title: stringFrom(input.payload.title) ?? "Untitled webhook task",
    description: stringFrom(input.payload.description),
    priority: normalizePriority(stringFrom(input.payload.priority) || mapping.defaultPriority),
    dueOn: stringFrom(input.payload.dueDate) ?? stringFrom(input.payload.due_on),
    source: stringFrom(input.payload.source) ?? mapping.source,
    externalUrl: stringFrom(input.payload.externalUrl) ?? stringFrom(input.payload.external_url),
    now: ports.clock.now(),
  });

  await ports.webhookEvents.recordGenericTaskCreated({
    eventId: ports.ids.create(),
    projectId,
    source: task.source,
    endpointId: endpoint?.id || null,
    payload: input.payload,
  });
  await ports.tasks.create(task);

  const queued = await ports.queue.enqueueGenericTaskCreated({
    type: "generic.task.created",
    projectId,
    taskId: task.id,
    source: task.source,
  });

  if (!queued) {
    await ports.notifications.notifyProject(projectId, {
      title: "Webhook task created",
      body: `${task.title} was created from ${task.source || "generic webhook"}.`,
      source: "generic_webhook",
    });
  }

  return { accepted: true, task };
}
