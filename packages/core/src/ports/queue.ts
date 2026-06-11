import type { GitHubWebhookPayload } from "../domain/github";

export type GitHubQueueMessage = {
  type: "github.webhook";
  eventId: string;
  deliveryId: string | null;
  eventName: string;
  action: string | null;
  repositoryFullName: string | null;
  payload: GitHubWebhookPayload;
};

export type GenericWebhookQueueMessage = {
  type: "generic.task.created";
  projectId: string;
  taskId: string;
  source: string | null;
};

export type ProjectFlareQueueMessage = GitHubQueueMessage | GenericWebhookQueueMessage;
