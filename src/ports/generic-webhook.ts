import type { Task } from "../domain/task";

export type WebhookEndpointRecord = {
  id: string;
  project_id: string;
  name: string;
  secret_hash: string;
  mapping_json: string | null;
  enabled: number;
};

export type GenericTaskCreatedMessage = {
  type: "generic.task.created";
  projectId: string;
  taskId: string;
  source: string | null;
};

export type ProjectNotificationInput = {
  title: string;
  body: string;
  source: string;
};

export type GenericWebhookPorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  tokens: {
    verify(token: string, hash: string): Promise<boolean>;
  };
  webhookEndpoints: {
    findById(id: string): Promise<WebhookEndpointRecord | null>;
  };
  webhookEvents: {
    recordGenericTaskCreated(input: {
      eventId: string;
      projectId: string;
      source: string | null;
      endpointId: string | null;
      payload: Record<string, unknown>;
    }): Promise<void>;
  };
  tasks: {
    create(task: Task): Promise<void>;
  };
  queue: {
    enqueueGenericTaskCreated(message: GenericTaskCreatedMessage): Promise<boolean>;
  };
  notifications: {
    notifyProject(projectId: string, input: ProjectNotificationInput): Promise<void>;
  };
};
