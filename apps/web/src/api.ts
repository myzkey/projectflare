import type {
  AccessUser,
  GitHubEvent,
  GitHubRepository,
  Notification,
  NotificationChannel,
  Project,
  Task,
  TaskComment,
  TaskDependency,
  WebhookEndpoint,
  WikiPage,
  WikiRevision,
  Workspace,
} from "./types";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return response.json() as Promise<T>;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const api = {
  me: () => requestJson<AccessUser>("/api/me"),
  workspaces: () => requestJson<Workspace[]>("/api/workspaces"),
  projects: (workspaceId: string) => requestJson<Project[]>(`/api/workspaces/${workspaceId}/projects`),
  createProject: (workspaceId: string, body: unknown) =>
    postJson<Project>(`/api/workspaces/${workspaceId}/projects`, body),
  tasks: (projectId: string) => requestJson<Task[]>(`/api/projects/${projectId}/tasks`),
  createTask: (projectId: string, body: unknown) => postJson<Task>(`/api/projects/${projectId}/tasks`, body),
  updateTask: (taskId: string, body: unknown) => patchJson<Task>(`/api/tasks/${taskId}`, body),
  projectDependencies: (projectId: string) => requestJson<TaskDependency[]>(`/api/projects/${projectId}/dependencies`),
  createDependency: (taskId: string, dependsOnTaskId: string) =>
    postJson<TaskDependency>(`/api/tasks/${taskId}/dependencies`, { depends_on_task_id: dependsOnTaskId }),
  comments: (taskId: string) => requestJson<TaskComment[]>(`/api/tasks/${taskId}/comments`),
  createComment: (taskId: string, body: string) => postJson<TaskComment>(`/api/tasks/${taskId}/comments`, { body }),
  wikiPages: (projectId: string) => requestJson<WikiPage[]>(`/api/projects/${projectId}/wiki`),
  saveWikiPage: (projectId: string, pageId: string | null, body: unknown) =>
    pageId
      ? patchJson<WikiPage>(`/api/wiki/${pageId}`, body)
      : postJson<WikiPage>(`/api/projects/${projectId}/wiki`, body),
  wikiRevisions: (pageId: string) => requestJson<WikiRevision[]>(`/api/wiki/${pageId}/revisions`),
  githubRepositories: (workspaceId: string) =>
    requestJson<GitHubRepository[]>(`/api/workspaces/${workspaceId}/github/repositories`),
  createGitHubRepository: (workspaceId: string, body: unknown) =>
    postJson<GitHubRepository>(`/api/workspaces/${workspaceId}/github/repositories`, body),
  githubEvents: (projectId: string) => requestJson<GitHubEvent[]>(`/api/projects/${projectId}/github/events`),
  webhookEndpoints: (projectId: string) =>
    requestJson<WebhookEndpoint[]>(`/api/projects/${projectId}/webhook-endpoints`),
  createWebhookEndpoint: (projectId: string, body: unknown) =>
    postJson<WebhookEndpoint>(`/api/projects/${projectId}/webhook-endpoints`, body),
  notificationChannels: (projectId: string) =>
    requestJson<NotificationChannel[]>(`/api/projects/${projectId}/notification-channels`),
  createNotificationChannel: (projectId: string, body: unknown) =>
    postJson<NotificationChannel>(`/api/projects/${projectId}/notification-channels`, body),
  notifications: (projectId: string) => requestJson<Notification[]>(`/api/projects/${projectId}/notifications`),
};
