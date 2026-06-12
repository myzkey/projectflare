import type { WebhookEndpoint } from "../domain/webhook";

export type WebhookEndpointStore = {
  listByProject(projectId: string): Promise<WebhookEndpoint[]>;
  create(endpoint: WebhookEndpoint): Promise<void>;
};

export type WebhookEndpointUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  tokens: {
    create(): string;
    hash(token: string): Promise<string>;
  };
  webhookEndpoints: WebhookEndpointStore;
};
