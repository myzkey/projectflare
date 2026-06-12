import type {
  AccessUser,
  Attachment,
  GitHubEvent,
  GitHubRepository,
  InstalledPlugin,
  Notification,
  NotificationChannel,
  PluginDescriptor,
  Project,
  Task,
  TaskComment,
  TaskDependency,
  TaskStatusDefinition,
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
  return snakeCaseKeys(await response.json()) as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(camelCaseKeys(body)),
  });
}

function patchJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(camelCaseKeys(body)),
  });
}

async function postForm<T>(path: string, body: FormData): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    body,
  });
}

function camelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelCaseKeys);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [toCamelCase(key), camelCaseKeys(child)]));
}

function snakeCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(snakeCaseKeys);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [toSnakeCase(key), snakeCaseKeys(child)]));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
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
  taskStatuses: (projectId: string) => requestJson<TaskStatusDefinition[]>(`/api/projects/${projectId}/statuses`),
  createTaskStatus: (projectId: string, body: unknown) =>
    postJson<TaskStatusDefinition>(`/api/projects/${projectId}/statuses`, body),
  updateTaskStatus: (projectId: string, statusId: string, body: unknown) =>
    patchJson<TaskStatusDefinition>(`/api/projects/${projectId}/statuses/${encodeURIComponent(statusId)}`, body),
  projectDependencies: (projectId: string) => requestJson<TaskDependency[]>(`/api/projects/${projectId}/dependencies`),
  createDependency: (taskId: string, dependsOnTaskId: string) =>
    postJson<TaskDependency>(`/api/tasks/${taskId}/dependencies`, { dependsOnTaskId }),
  comments: (taskId: string, limit = 20) => requestJson<TaskComment[]>(`/api/tasks/${taskId}/comments?limit=${limit}`),
  createComment: (taskId: string, body: string) => postJson<TaskComment>(`/api/tasks/${taskId}/comments`, { body }),
  taskAttachments: (taskId: string) => requestJson<Attachment[]>(`/api/tasks/${taskId}/attachments`),
  uploadTaskAttachment: (taskId: string, body: FormData) =>
    postForm<Attachment>(`/api/tasks/${taskId}/attachments`, body),
  wikiPages: (projectId: string) => requestJson<WikiPage[]>(`/api/projects/${projectId}/wiki`),
  saveWikiPage: (projectId: string, pageId: string | null, body: unknown) =>
    pageId
      ? patchJson<WikiPage>(`/api/wiki/${pageId}`, body)
      : postJson<WikiPage>(`/api/projects/${projectId}/wiki`, body),
  wikiRevisions: (pageId: string) => requestJson<WikiRevision[]>(`/api/wiki/${pageId}/revisions`),
  wikiAttachments: (pageId: string) => requestJson<Attachment[]>(`/api/wiki/${pageId}/attachments`),
  uploadWikiAttachment: (pageId: string, body: FormData) =>
    postForm<Attachment>(`/api/wiki/${pageId}/attachments`, body),
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
  pluginCatalog: () => requestJson<PluginDescriptor[]>("/api/plugins/catalog"),
  installedPlugins: (workspaceId: string) => requestJson<InstalledPlugin[]>(`/api/workspaces/${workspaceId}/plugins`),
  installPlugin: (workspaceId: string, body: unknown) =>
    postJson<InstalledPlugin>(`/api/workspaces/${workspaceId}/plugins`, body),
  setPluginEnabled: (workspaceId: string, pluginId: string, enabled: boolean) =>
    patchJson<InstalledPlugin>(`/api/workspaces/${workspaceId}/plugins/${encodeURIComponent(pluginId)}`, { enabled }),
  invokePluginRoute: (workspaceId: string, pluginId: string, routeName: string, body: unknown) =>
    postJson<unknown>(
      `/api/workspaces/${workspaceId}/plugins/${encodeURIComponent(pluginId)}/routes/${encodeURIComponent(routeName)}`,
      body,
    ),
};
