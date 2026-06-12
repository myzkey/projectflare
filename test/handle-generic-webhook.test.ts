import { describe, expect, it, vi } from "vitest";
import { handleGenericWebhookUseCase } from "../packages/core/src/application/usecases/handle-generic-webhook";
import { ApplicationError } from "../packages/core/src/domain/errors";
import type { GenericWebhookPorts, WebhookEndpointRecord } from "../packages/core/src/ports/generic-webhook";

function createPorts(endpoint: WebhookEndpointRecord | null, options: { queue?: boolean; tokenValid?: boolean } = {}) {
  const tasks: unknown[] = [];
  const events: unknown[] = [];
  const notifications: unknown[] = [];
  const queueMessages: unknown[] = [];

  const ports: GenericWebhookPorts = {
    ids: {
      create: vi.fn(() => `id_${tasks.length + events.length + queueMessages.length + 1}`),
    },
    clock: {
      now: vi.fn(() => "2026-06-11T00:00:00.000Z"),
    },
    tokens: {
      verify: vi.fn(async () => options.tokenValid ?? true),
    },
    webhookEndpoints: {
      findById: vi.fn(async () => endpoint),
    },
    webhookEvents: {
      recordGenericTaskCreated: vi.fn(async (input) => {
        events.push(input);
      }),
    },
    tasks: {
      create: vi.fn(async (task) => {
        tasks.push(task);
      }),
    },
    queue: {
      enqueueGenericTaskCreated: vi.fn(async (message) => {
        queueMessages.push(message);
        return options.queue ?? false;
      }),
    },
    notifications: {
      notifyProject: vi.fn(async (_projectId, input) => {
        notifications.push(input);
      }),
    },
  };

  return { ports, tasks, events, notifications, queueMessages };
}

describe("handleGenericWebhookUseCase", () => {
  it("creates a mapped task and notification when no queue is available", async () => {
    const endpoint: WebhookEndpointRecord = {
      id: "endpoint_1",
      project_id: "project_1",
      name: "Support",
      secret_hash: "hash",
      mapping_json: JSON.stringify({ source: "support", defaultPriority: "urgent" }),
      enabled: 1,
    };
    const { ports, tasks, events, notifications, queueMessages } = createPorts(endpoint, { queue: false });

    const result = await handleGenericWebhookUseCase(
      {
        endpointOrProjectId: "endpoint_1",
        token: "secret-token",
        payload: {
          title: "Customer report",
          description: "A mapped webhook payload",
        },
      },
      ports,
    );

    expect(result.accepted).toBe(true);
    expect(tasks).toContainEqual(
      expect.objectContaining({
        project_id: "project_1",
        title: "Customer report",
        priority: "urgent",
        source: "support",
      }),
    );
    expect(events).toHaveLength(1);
    expect(queueMessages).toHaveLength(1);
    expect(notifications).toContainEqual(
      expect.objectContaining({
        title: "Webhook task created",
        source: "generic_webhook",
      }),
    );
  });

  it("rejects invalid endpoint tokens before creating side effects", async () => {
    const endpoint: WebhookEndpointRecord = {
      id: "endpoint_1",
      project_id: "project_1",
      name: "Support",
      secret_hash: "hash",
      mapping_json: null,
      enabled: 1,
    };
    const { ports, tasks, events, notifications } = createPorts(endpoint, { tokenValid: false });

    await expect(
      handleGenericWebhookUseCase(
        {
          endpointOrProjectId: "endpoint_1",
          token: "wrong-token",
          payload: { title: "Should fail" },
        },
        ports,
      ),
    ).rejects.toEqual(new ApplicationError("invalid_webhook_token", 401));

    expect(tasks).toHaveLength(0);
    expect(events).toHaveLength(0);
    expect(notifications).toHaveLength(0);
  });

  it("supports legacy project-id webhook URLs when no endpoint exists", async () => {
    const { ports, tasks } = createPorts(null, { queue: true });

    await handleGenericWebhookUseCase(
      {
        endpointOrProjectId: "prj_launch",
        token: null,
        payload: {
          title: "Legacy webhook task",
          source: "legacy",
          priority: "high",
        },
      },
      ports,
    );

    expect(tasks).toContainEqual(
      expect.objectContaining({
        project_id: "prj_launch",
        title: "Legacy webhook task",
        source: "legacy",
        priority: "high",
      }),
    );
    expect(ports.notifications.notifyProject).not.toHaveBeenCalled();
  });

  it("rejects disabled endpoints before token verification", async () => {
    const endpoint: WebhookEndpointRecord = {
      id: "endpoint_disabled",
      project_id: "project_1",
      name: "Disabled",
      secret_hash: "hash",
      mapping_json: null,
      enabled: 0,
    };
    const { ports, tasks, events } = createPorts(endpoint);

    await expect(
      handleGenericWebhookUseCase(
        {
          endpointOrProjectId: "endpoint_disabled",
          token: "secret-token",
          payload: { title: "Should not create" },
        },
        ports,
      ),
    ).rejects.toEqual(new ApplicationError("webhook_endpoint_disabled", 403));

    expect(ports.tokens.verify).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("falls back to safe mapping and untitled task defaults", async () => {
    const endpoint: WebhookEndpointRecord = {
      id: "endpoint_bad_mapping",
      project_id: "project_1",
      name: "Bad mapping",
      secret_hash: "hash",
      mapping_json: "{not-json",
      enabled: 1,
    };
    const { ports, tasks } = createPorts(endpoint);

    await handleGenericWebhookUseCase(
      {
        endpointOrProjectId: "endpoint_bad_mapping",
        token: "secret-token",
        payload: {
          priority: "not-a-priority",
          external_url: "https://example.com/ticket/1",
        },
      },
      ports,
    );

    expect(tasks).toContainEqual(
      expect.objectContaining({
        title: "Untitled webhook task",
        priority: "medium",
        source: "generic_webhook",
        external_url: "https://example.com/ticket/1",
      }),
    );
  });

  it("does not create immediate notifications when queue accepts the event", async () => {
    const endpoint: WebhookEndpointRecord = {
      id: "endpoint_queued",
      project_id: "project_1",
      name: "Queued",
      secret_hash: "hash",
      mapping_json: null,
      enabled: 1,
    };
    const { ports, queueMessages, notifications } = createPorts(endpoint, { queue: true });

    await handleGenericWebhookUseCase(
      {
        endpointOrProjectId: "endpoint_queued",
        token: "secret-token",
        payload: { title: "Queued task" },
      },
      ports,
    );

    expect(queueMessages).toContainEqual(expect.objectContaining({ type: "generic.task.created" }));
    expect(notifications).toHaveLength(0);
  });
});
