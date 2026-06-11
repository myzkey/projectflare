import type { GitHubWebhookPayload } from "../domain/github";
import type { TaskStatus } from "../domain/task";

export type GitHubTaskRecord = {
  id: string;
  project_id: string;
  title: string;
};

export type GitHubTaskCreateInput = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  issueUrl: string;
};

export type GitHubTaskUpdateInput = {
  title: string;
  description: string;
  status: TaskStatus;
};

export type GitHubNotificationInput = {
  title: string;
  body: string;
  source: "github";
};

export type GitHubSyncPorts = {
  ids: {
    create(): string;
  };
  projects: {
    findIdByRepositoryFullName(repositoryFullName: string): Promise<string | null>;
  };
  webhookEvents: {
    markProcessed(eventId: string, status: string): Promise<void>;
  };
  tasks: {
    findByGitHubIssueUrl(issueUrl: string): Promise<GitHubTaskRecord | null>;
    createFromIssue(input: GitHubTaskCreateInput): Promise<void>;
    updateFromIssue(id: string, input: GitHubTaskUpdateInput): Promise<void>;
    updateLinkedIssueStatus(issueUrl: string, status: TaskStatus, progress: number): Promise<void>;
  };
  comments: {
    createGitHubComment(input: { id: string; taskId: string; author: string; body: string }): Promise<void>;
  };
  notifications: {
    notifyProject(projectId: string, input: GitHubNotificationInput): Promise<void>;
  };
};

export type ProcessGitHubWebhookInput = {
  eventId: string;
  eventName: string;
  repositoryFullName: string | null;
  payload: GitHubWebhookPayload;
};
