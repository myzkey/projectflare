import { handleGenericWebhookUseCase } from "../../application/usecases/handle-generic-webhook";
import {
  createProjectTaskUseCase,
  listProjectTasksUseCase,
  updateTaskUseCase,
} from "../../application/usecases/manage-tasks";
import { processGitHubWebhookUseCase } from "../../application/usecases/process-github-webhook";
import { ApplicationError } from "../../domain/errors";
import { type GitHubRepository, type GitHubWebhookPayload, repositoryFullNameFromPayload } from "../../domain/github";
import type { Notification, NotificationChannel } from "../../domain/notification";
import type { Project, Workspace } from "../../domain/project";
import { createApiToken, sha256Hex, verifyGitHubSignature } from "../../domain/security";
import { type Task as DomainTask, normalizePriority, taskStatusLabels } from "../../domain/task";
import type { WikiPage, WikiRevision } from "../../domain/wiki";
import { createGenericWebhookPorts } from "../../infrastructure/cloudflare/d1/generic-webhook-adapter";
import { createGitHubSyncPorts } from "../../infrastructure/cloudflare/d1/github-sync-adapter";
import { createTaskUseCasePorts } from "../../infrastructure/cloudflare/d1/task-repository";
import type { Env } from "../../infrastructure/cloudflare/env";
import type { GitHubQueueMessage, ProjectFlareQueueMessage } from "../../ports/queue";
import { renderApp } from "../ui/app";
import { htmlResponse, json, jsonError } from "./responses";

type AccessUser = {
  id: string;
  email: string;
  name: string;
  group: string | null;
};

type Task = DomainTask;

type TaskComment = {
  id: string;
  task_id: string;
  author_user_id: string | null;
  author_name?: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

type TaskDependency = {
  task_id: string;
  depends_on_task_id: string;
  task_title?: string;
  depends_on_title?: string;
  created_at: string;
};

type WebhookEndpoint = {
  id: string;
  project_id: string;
  name: string;
  secret_hash: string;
  mapping_json: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (!path.startsWith("/api/")) {
        if (env.ASSETS) return env.ASSETS.fetch(request);
        if (path === "/") return htmlResponse(renderApp());
      }
      if (path === "/api/health") return json({ ok: true, service: "projectflare" });
      if (path === "/api/me") return json(await getOrCreateUser(request, env));
      if (path === "/api/workspaces") {
        if (request.method === "GET") return json(await listWorkspaces(env));
        if (request.method === "POST") return json(await createWorkspace(request, env), 201);
      }
      if (path.match(/^\/api\/workspaces\/[^/]+\/projects$/)) {
        const workspaceId = path.split("/")[3];
        if (request.method === "GET") return json(await listProjects(env, workspaceId));
        if (request.method === "POST") return json(await createProject(request, env, workspaceId), 201);
      }
      if (path.match(/^\/api\/workspaces\/[^/]+\/github\/repositories$/)) {
        const workspaceId = path.split("/")[3];
        if (request.method === "GET") return json(await listGitHubRepositories(env, workspaceId));
        if (request.method === "POST") return json(await createGitHubRepository(request, env, workspaceId), 201);
      }
      if (path === "/api/projects") return json(await listProjects(env));
      if (path.match(/^\/api\/projects\/[^/]+$/)) {
        const projectId = path.split("/")[3];
        if (request.method === "GET") return json(await getProject(env, projectId));
        if (request.method === "PATCH") return json(await updateProject(request, env, projectId));
      }
      if (path.match(/^\/api\/projects\/[^/]+\/github\/events$/) && request.method === "GET") {
        const projectId = path.split("/")[3];
        return json(await listGitHubEvents(env, projectId));
      }
      if (path.match(/^\/api\/projects\/[^/]+\/webhook-endpoints$/)) {
        const projectId = path.split("/")[3];
        if (request.method === "GET") return json(await listWebhookEndpoints(env, projectId));
        if (request.method === "POST") return json(await createWebhookEndpoint(request, env, projectId), 201);
      }
      if (path.match(/^\/api\/projects\/[^/]+\/notification-channels$/)) {
        const projectId = path.split("/")[3];
        if (request.method === "GET") return json(await listNotificationChannels(env, projectId));
        if (request.method === "POST") return json(await createNotificationChannel(request, env, projectId), 201);
      }
      if (path.match(/^\/api\/projects\/[^/]+\/notifications$/) && request.method === "GET") {
        const projectId = path.split("/")[3];
        return json(await listNotifications(env, projectId));
      }
      if (path.match(/^\/api\/projects\/[^/]+\/tasks$/)) {
        const projectId = path.split("/")[3];
        if (request.method === "GET") return json(await listTasks(env, projectId));
        if (request.method === "POST") return json(await createTask(request, env, projectId), 201);
      }
      if (path.match(/^\/api\/projects\/[^/]+\/dependencies$/) && request.method === "GET") {
        const projectId = path.split("/")[3];
        return json(await listProjectDependencies(env, projectId));
      }
      if (path.match(/^\/api\/projects\/[^/]+\/wiki$/)) {
        const projectId = path.split("/")[3];
        if (request.method === "GET") return json(await listWikiPages(env, projectId));
        if (request.method === "POST") return json(await createWikiPage(request, env, projectId), 201);
      }
      if (path.match(/^\/api\/tasks\/[^/]+$/) && request.method === "PATCH") {
        const taskId = path.split("/")[3];
        return json(await updateTask(request, env, taskId));
      }
      if (path.match(/^\/api\/tasks\/[^/]+\/dependencies$/)) {
        const taskId = path.split("/")[3];
        if (request.method === "GET") return json(await listTaskDependencies(env, taskId));
        if (request.method === "POST") return json(await createTaskDependency(request, env, taskId), 201);
      }
      if (path.match(/^\/api\/tasks\/[^/]+\/comments$/)) {
        const taskId = path.split("/")[3];
        if (request.method === "GET") return json(await listTaskComments(env, taskId));
        if (request.method === "POST") return json(await createTaskComment(request, env, taskId), 201);
      }
      if (path.match(/^\/api\/wiki\/[^/]+$/)) {
        const pageId = path.split("/")[3];
        if (request.method === "GET") return json(await getWikiPage(env, pageId));
        if (request.method === "PATCH") return json(await updateWikiPage(request, env, pageId));
      }
      if (path.match(/^\/api\/wiki\/[^/]+\/revisions$/) && request.method === "GET") {
        const pageId = path.split("/")[3];
        return json(await listWikiRevisions(env, pageId));
      }
      if (path.match(/^\/api\/notifications\/[^/]+$/) && request.method === "PATCH") {
        const notificationId = path.split("/")[3];
        return json(await markNotificationRead(env, notificationId));
      }
      if (path === "/api/github/webhook" && request.method === "POST") {
        return json(await handleGitHubWebhook(request, env), 202);
      }
      if (path.match(/^\/api\/webhooks\/generic\/[^/]+$/) && request.method === "POST") {
        const projectId = path.split("/")[4];
        return json(await handleGenericWebhook(request, env, projectId), 202);
      }

      return json({ error: "not_found" }, 404);
    } catch (error) {
      if (error instanceof ApplicationError) return jsonError(error.code, error.status);
      console.error(error);
      return json({ error: "internal_error", message: error instanceof Error ? error.message : "Unknown error" }, 500);
    }
  },

  async queue(batch: MessageBatch<ProjectFlareQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      if (message.body.type === "github.webhook") {
        await processGitHubQueueMessage(env, message.body);
      } else if (message.body.type === "generic.task.created") {
        await notifyProject(env, message.body.projectId, {
          title: "Webhook task created",
          body: `A ${message.body.source || "generic"} webhook created a task.`,
          source: "generic_webhook",
        });
      }
      message.ack();
    }
  },
};

async function getOrCreateUser(request: Request, env: Env): Promise<AccessUser> {
  const email = request.headers.get("CF-Access-Authenticated-User-Email") ?? "local@example.com";
  const name = request.headers.get("CF-Access-Authenticated-User-Name") ?? email.split("@")[0];
  const group = request.headers.get("Cf-Access-Groups")?.split(",")[0]?.trim() || null;
  const id = stableId("usr", email);
  const user = { id, email, name, group };

  if (!env.DB) return user;

  await env.DB.prepare(
    `INSERT INTO users (id, email, name, access_group, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name, access_group = excluded.access_group, updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(id, email, name, group)
    .run();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role)
     VALUES ('ws_demo', ?, 'owner')`,
  )
    .bind(id)
    .run();

  return user;
}

async function listWorkspaces(env: Env) {
  if (!env.DB) return demoWorkspaces();

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM workspaces
     ORDER BY created_at DESC`,
  ).all<Workspace>();

  return results.length ? results : demoWorkspaces();
}

async function createWorkspace(request: Request, env: Env) {
  const user = await getOrCreateUser(request, env);
  const body = await request.json<Partial<Workspace>>();
  const name = body.name?.trim() || "Untitled workspace";
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    slug: slugify(body.slug || name),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!env.DB) return workspace;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO workspaces (id, name, slug)
       VALUES (?, ?, ?)`,
    ).bind(workspace.id, workspace.name, workspace.slug),
    env.DB.prepare(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES (?, ?, 'owner')`,
    ).bind(workspace.id, user.id),
  ]);

  return workspace;
}

async function listProjects(env: Env, workspaceId?: string) {
  if (!env.DB) {
    const projects = demoProjects();
    return workspaceId ? projects.filter((project) => project.workspace_id === workspaceId) : projects;
  }

  const query = workspaceId
    ? `SELECT p.*, w.name AS workspace_name
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.workspace_id = ?
       ORDER BY p.created_at DESC`
    : `SELECT p.*, w.name AS workspace_name
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       ORDER BY p.created_at DESC`;

  const statement = env.DB.prepare(query);
  const { results } = workspaceId ? await statement.bind(workspaceId).all<Project>() : await statement.all<Project>();

  return results.length ? results : demoProjects();
}

async function getProject(env: Env, projectId: string) {
  if (!env.DB) return demoProjects().find((project) => project.id === projectId) ?? null;

  return env.DB.prepare(
    `SELECT p.*, w.name AS workspace_name
     FROM projects p
     JOIN workspaces w ON w.id = p.workspace_id
     WHERE p.id = ?`,
  )
    .bind(projectId)
    .first<Project>();
}

async function createProject(request: Request, env: Env, workspaceId: string) {
  const user = await getOrCreateUser(request, env);
  const body = await request.json<Partial<Project>>();
  const project: Project = {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    name: body.name?.trim() || "Untitled project",
    description: body.description || null,
    status: body.status || "active",
    starts_on: body.starts_on || null,
    due_on: body.due_on || null,
    github_repository_url: body.github_repository_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!env.DB) return project;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO projects (id, workspace_id, name, description, status, starts_on, due_on, github_repository_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      project.id,
      project.workspace_id,
      project.name,
      project.description,
      project.status,
      project.starts_on,
      project.due_on,
      project.github_repository_url,
    ),
    env.DB.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`,
    ).bind(project.id, user.id),
  ]);

  return project;
}

async function updateProject(request: Request, env: Env, projectId: string) {
  const body = await request.json<Partial<Project>>();

  if (!env.DB) return { id: projectId, ...body };

  const existing = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first<Project>();
  if (!existing) return jsonError("project_not_found", 404);

  await env.DB.prepare(
    `UPDATE projects
     SET name = ?, description = ?, status = ?, starts_on = ?, due_on = ?, github_repository_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(
      body.name?.trim() || existing.name,
      body.description ?? existing.description,
      body.status || existing.status,
      body.starts_on ?? existing.starts_on,
      body.due_on ?? existing.due_on,
      body.github_repository_url ?? existing.github_repository_url,
      projectId,
    )
    .run();

  return getProject(env, projectId);
}

async function listGitHubRepositories(env: Env, workspaceId: string) {
  if (!env.DB) return demoGitHubRepositories(workspaceId);

  const { results } = await env.DB.prepare(
    `SELECT r.*
     FROM github_repositories r
     JOIN github_integrations i ON i.id = r.github_integration_id
     WHERE i.workspace_id = ?
     ORDER BY r.updated_at DESC`,
  )
    .bind(workspaceId)
    .all<GitHubRepository>();

  return results;
}

async function createGitHubRepository(request: Request, env: Env, workspaceId: string) {
  const body = await request.json<Partial<GitHubRepository>>();
  const owner = body.owner?.trim();
  const name = body.name?.trim();
  if (!owner || !name) return jsonError("github_owner_and_name_required", 400);

  const repository: GitHubRepository = {
    id: crypto.randomUUID(),
    github_integration_id: "",
    project_id: body.project_id || null,
    owner,
    name,
    repository_url: body.repository_url || `https://github.com/${owner}/${name}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!env.DB) return repository;

  const integrationId = await ensureGitHubIntegration(env, workspaceId);
  repository.github_integration_id = integrationId;

  await env.DB.prepare(
    `INSERT INTO github_repositories (id, github_integration_id, project_id, owner, name, repository_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(github_integration_id, owner, name) DO UPDATE SET
       project_id = excluded.project_id,
       repository_url = excluded.repository_url,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(
      repository.id,
      integrationId,
      repository.project_id,
      repository.owner,
      repository.name,
      repository.repository_url,
    )
    .run();

  if (repository.project_id) {
    await env.DB.prepare(
      `UPDATE projects
       SET github_repository_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
      .bind(repository.repository_url, repository.project_id)
      .run();
  }

  return repository;
}

async function ensureGitHubIntegration(env: Env, workspaceId: string): Promise<string> {
  if (!env.DB) return "github_integration_demo";

  const existing = await env.DB.prepare("SELECT id FROM github_integrations WHERE workspace_id = ? LIMIT 1")
    .bind(workspaceId)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO github_integrations (id, workspace_id) VALUES (?, ?)").bind(id, workspaceId).run();
  return id;
}

async function listGitHubEvents(env: Env, projectId: string) {
  if (!env.DB) return [];

  const { results } = await env.DB.prepare(
    `SELECT id, project_id, source, event_type, status, payload_json, created_at, processed_at
     FROM webhook_events
     WHERE source = 'github' AND project_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
  )
    .bind(projectId)
    .all();

  return results;
}

async function listWebhookEndpoints(env: Env, projectId: string) {
  if (!env.DB) return demoWebhookEndpoints(projectId);

  const { results } = await env.DB.prepare(
    `SELECT id, project_id, name, secret_hash, mapping_json, enabled, created_at, updated_at
     FROM webhook_endpoints
     WHERE project_id = ?
     ORDER BY created_at DESC`,
  )
    .bind(projectId)
    .all<WebhookEndpoint>();

  return results.map((endpoint) => ({ ...endpoint, secret_hash: "stored" }));
}

async function createWebhookEndpoint(request: Request, env: Env, projectId: string) {
  const body = await request.json<Partial<WebhookEndpoint> & { default_priority?: string; source?: string }>();
  const token = createApiToken();
  const tokenHash = await sha256Hex(token);
  const mapping = {
    source: body.source || "generic_webhook",
    defaultPriority: normalizePriority(body.default_priority),
  };
  const endpoint: WebhookEndpoint & { token?: string; endpoint_url?: string } = {
    id: crypto.randomUUID(),
    project_id: projectId,
    name: body.name?.trim() || "Generic intake",
    secret_hash: tokenHash,
    mapping_json: JSON.stringify(mapping),
    enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    token,
  };

  endpoint.endpoint_url = new URL(`/api/webhooks/generic/${endpoint.id}`, request.url).toString();

  if (!env.DB) return endpoint;

  await env.DB.prepare(
    `INSERT INTO webhook_endpoints (id, project_id, name, secret_hash, mapping_json, enabled)
     VALUES (?, ?, ?, ?, ?, 1)`,
  )
    .bind(endpoint.id, projectId, endpoint.name, tokenHash, endpoint.mapping_json)
    .run();

  return { ...endpoint, secret_hash: "stored" };
}

async function listNotificationChannels(env: Env, projectId: string) {
  if (!env.DB) return [];

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM notification_channels
     WHERE project_id = ?
     ORDER BY created_at DESC`,
  )
    .bind(projectId)
    .all<NotificationChannel>();

  return results;
}

async function createNotificationChannel(request: Request, env: Env, projectId: string) {
  const body = await request.json<Partial<NotificationChannel>>();
  const channelType = body.channel_type === "slack" || body.channel_type === "lark" ? body.channel_type : "webhook";
  const channel: NotificationChannel = {
    id: crypto.randomUUID(),
    project_id: projectId,
    name: body.name?.trim() || `${channelType} channel`,
    channel_type: channelType,
    target_url: body.target_url?.trim() || "",
    enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!channel.target_url) return jsonError("notification_target_url_required", 400);
  if (!env.DB) return channel;

  await env.DB.prepare(
    `INSERT INTO notification_channels (id, project_id, name, channel_type, target_url, enabled)
     VALUES (?, ?, ?, ?, ?, 1)`,
  )
    .bind(channel.id, projectId, channel.name, channel.channel_type, channel.target_url)
    .run();

  return channel;
}

async function listNotifications(env: Env, projectId: string) {
  if (!env.DB) return [];

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM notifications
     WHERE project_id = ?
     ORDER BY created_at DESC
     LIMIT 30`,
  )
    .bind(projectId)
    .all<Notification>();

  return results;
}

async function markNotificationRead(env: Env, notificationId: string) {
  if (!env.DB) return { id: notificationId, read_at: new Date().toISOString() };

  await env.DB.prepare(
    `UPDATE notifications
     SET read_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(notificationId)
    .run();

  return { id: notificationId, read: true };
}

async function listTasks(env: Env, projectId: string) {
  const tasks = await listProjectTasksUseCase(projectId, createTaskUseCasePorts(env));
  return tasks.length ? tasks : demoTasks().filter((task) => task.project_id === projectId);
}

async function listWikiPages(env: Env, projectId: string) {
  if (!env.DB) return demoWikiPages(projectId);

  const { results } = await env.DB.prepare(
    `SELECT id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id, created_at, updated_at
     FROM wiki_pages
     WHERE project_id = ?
     ORDER BY updated_at DESC`,
  )
    .bind(projectId)
    .all<WikiPage>();

  return results;
}

async function getWikiPage(env: Env, pageId: string) {
  if (!env.DB) return demoWikiPages("prj_launch").find((page) => page.id === pageId) ?? null;

  return env.DB.prepare(
    `SELECT id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id, created_at, updated_at
     FROM wiki_pages
     WHERE id = ?`,
  )
    .bind(pageId)
    .first<WikiPage>();
}

async function createWikiPage(request: Request, env: Env, projectId: string) {
  const user = await getOrCreateUser(request, env);
  const body = await request.json<Partial<WikiPage>>();
  const title = body.title?.trim() || "Untitled page";
  const page: WikiPage = {
    id: crypto.randomUUID(),
    project_id: projectId,
    parent_page_id: body.parent_page_id || null,
    title,
    slug: slugify(body.slug || title),
    body_markdown: body.body_markdown || "",
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!env.DB) return page;

  const revisionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO wiki_pages (
         id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(page.id, page.project_id, page.parent_page_id, page.title, page.slug, page.body_markdown, user.id, user.id),
    env.DB.prepare(
      `INSERT INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
       VALUES (?, ?, ?, ?)`,
    ).bind(revisionId, page.id, page.body_markdown, user.id),
  ]);

  return page;
}

async function updateWikiPage(request: Request, env: Env, pageId: string) {
  const user = await getOrCreateUser(request, env);
  const body = await request.json<Partial<WikiPage>>();

  if (!env.DB) return { id: pageId, ...body };

  const existing = await env.DB.prepare("SELECT * FROM wiki_pages WHERE id = ?").bind(pageId).first<WikiPage>();
  if (!existing) return jsonError("wiki_page_not_found", 404);

  const title = body.title?.trim() || existing.title;
  const markdown = body.body_markdown ?? existing.body_markdown;
  const slug = body.slug ? slugify(body.slug) : existing.slug;
  const revisionId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE wiki_pages
       SET title = ?, slug = ?, body_markdown = ?, parent_page_id = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(title, slug, markdown, body.parent_page_id ?? existing.parent_page_id, user.id, pageId),
    env.DB.prepare(
      `INSERT INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
       VALUES (?, ?, ?, ?)`,
    ).bind(revisionId, pageId, markdown, user.id),
  ]);

  return getWikiPage(env, pageId);
}

async function listWikiRevisions(env: Env, pageId: string) {
  if (!env.DB) return demoWikiRevisions(pageId);

  const { results } = await env.DB.prepare(
    `SELECT r.*, u.name AS author_name
     FROM wiki_revisions r
     LEFT JOIN users u ON u.id = r.author_user_id
     WHERE r.wiki_page_id = ?
     ORDER BY r.created_at DESC`,
  )
    .bind(pageId)
    .all<WikiRevision>();

  return results;
}

async function createTask(request: Request, env: Env, projectId: string) {
  const body = await request.json<Partial<Task> & { dueDate?: string }>();
  return createProjectTaskUseCase(
    {
      projectId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigneeUserId: body.assignee_user_id,
      startsOn: body.starts_on,
      dueOn: body.due_on || body.dueDate,
      progress: body.progress,
      source: body.source,
      externalUrl: body.external_url,
      githubIssueUrl: body.github_issue_url,
      backlogIssueUrl: body.backlog_issue_url,
    },
    createTaskUseCasePorts(env),
  );
}

async function updateTask(request: Request, env: Env, taskId: string) {
  const body = await request.json<Partial<Task>>();
  const allowedStatus = body.status && body.status in taskStatusLabels ? body.status : undefined;
  const progress =
    typeof body.progress === "number" ? Math.min(100, Math.max(0, Math.round(body.progress))) : undefined;

  if (!env.DB) return { id: taskId, status: allowedStatus, progress };

  return updateTaskUseCase(
    taskId,
    {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      startsOn: body.starts_on,
      dueOn: body.due_on,
      progress: body.progress,
    },
    createTaskUseCasePorts(env),
  );
}

async function listProjectDependencies(env: Env, projectId: string) {
  if (!env.DB) return demoDependencies().filter((dependency) => dependency.task_id.startsWith("tsk_"));

  const { results } = await env.DB.prepare(
    `SELECT d.task_id, d.depends_on_task_id, t.title AS task_title, parent.title AS depends_on_title, d.created_at
     FROM task_dependencies d
     JOIN tasks t ON t.id = d.task_id
     JOIN tasks parent ON parent.id = d.depends_on_task_id
     WHERE t.project_id = ?
     ORDER BY d.created_at DESC`,
  )
    .bind(projectId)
    .all<TaskDependency>();

  return results;
}

async function listTaskDependencies(env: Env, taskId: string) {
  if (!env.DB) return demoDependencies().filter((dependency) => dependency.task_id === taskId);

  const { results } = await env.DB.prepare(
    `SELECT d.task_id, d.depends_on_task_id, t.title AS task_title, parent.title AS depends_on_title, d.created_at
     FROM task_dependencies d
     JOIN tasks t ON t.id = d.task_id
     JOIN tasks parent ON parent.id = d.depends_on_task_id
     WHERE d.task_id = ?
     ORDER BY d.created_at DESC`,
  )
    .bind(taskId)
    .all<TaskDependency>();

  return results;
}

async function createTaskDependency(request: Request, env: Env, taskId: string) {
  const body = await request.json<{ depends_on_task_id?: string }>();
  const dependsOnTaskId = body.depends_on_task_id?.trim();
  if (!dependsOnTaskId) return jsonError("depends_on_task_id_required", 400);
  if (dependsOnTaskId === taskId) return jsonError("task_cannot_depend_on_itself", 400);

  const dependency: TaskDependency = {
    task_id: taskId,
    depends_on_task_id: dependsOnTaskId,
    created_at: new Date().toISOString(),
  };

  if (!env.DB) return dependency;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id)
     VALUES (?, ?)`,
  )
    .bind(taskId, dependsOnTaskId)
    .run();

  return dependency;
}

async function listTaskComments(env: Env, taskId: string) {
  if (!env.DB) return demoComments(taskId);

  const { results } = await env.DB.prepare(
    `SELECT c.*, u.name AS author_name
     FROM task_comments c
     LEFT JOIN users u ON u.id = c.author_user_id
     WHERE c.task_id = ?
     ORDER BY c.created_at ASC`,
  )
    .bind(taskId)
    .all<TaskComment>();

  return results;
}

async function createTaskComment(request: Request, env: Env, taskId: string) {
  const user = await getOrCreateUser(request, env);
  const body = await request.json<Partial<TaskComment>>();
  const comment: TaskComment = {
    id: crypto.randomUUID(),
    task_id: taskId,
    author_user_id: user.id,
    author_name: user.name,
    body: body.body?.trim() || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!comment.body) return jsonError("comment_body_required", 400);
  if (!env.DB) return comment;

  await env.DB.prepare(
    `INSERT INTO task_comments (id, task_id, author_user_id, body)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(comment.id, taskId, user.id, comment.body)
    .run();

  const task = await env.DB.prepare("SELECT project_id, title FROM tasks WHERE id = ?")
    .bind(taskId)
    .first<{ project_id: string; title: string }>();
  if (task) {
    await notifyProject(env, task.project_id, {
      title: "Task comment added",
      body: `${user.name} commented on ${task.title}.`,
      source: "app",
    });
  }

  return comment;
}

async function handleGitHubWebhook(request: Request, env: Env) {
  const rawBody = await request.text();
  const eventName = request.headers.get("X-GitHub-Event") || "unknown";
  const deliveryId = request.headers.get("X-GitHub-Delivery");
  const signature = request.headers.get("X-Hub-Signature-256");

  if (env.GITHUB_WEBHOOK_SECRET) {
    const verified = await verifyGitHubSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET);
    if (!verified) return jsonError("invalid_github_signature", 401);
  }

  const payload = JSON.parse(rawBody) as GitHubWebhookPayload;
  const repositoryFullName = payload.repository?.full_name || repositoryFullNameFromPayload(payload);
  const projectId =
    env.DB && repositoryFullName ? await findProjectIdForGitHubRepository(env, repositoryFullName) : null;
  const eventId = crypto.randomUUID();

  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO webhook_events (id, project_id, source, event_type, payload_json, status)
       VALUES (?, ?, 'github', ?, ?, 'queued')`,
    )
      .bind(eventId, projectId, `${eventName}.${payload.action || "received"}`, rawBody)
      .run();
  }

  const message: GitHubQueueMessage = {
    type: "github.webhook",
    eventId,
    deliveryId,
    eventName,
    action: payload.action || null,
    repositoryFullName,
    payload,
  };

  if (env.PROJECTFLARE_QUEUE) {
    await env.PROJECTFLARE_QUEUE.send(message);
  } else {
    await processGitHubQueueMessage(env, message);
  }

  return {
    accepted: true,
    eventId,
    queued: Boolean(env.PROJECTFLARE_QUEUE),
    repositoryFullName,
    projectId,
    signatureVerified: Boolean(env.GITHUB_WEBHOOK_SECRET),
  };
}

async function processGitHubQueueMessage(env: Env, message: GitHubQueueMessage) {
  await processGitHubWebhookUseCase(
    {
      eventId: message.eventId,
      eventName: message.eventName,
      repositoryFullName: message.repositoryFullName,
      payload: message.payload,
    },
    createGitHubSyncPorts(env, (projectId, input) => notifyProject(env, projectId, input)),
  );
}

async function notifyProject(env: Env, projectId: string, input: { title: string; body: string; source: string }) {
  if (!env.DB) return;

  const notificationId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO notifications (id, project_id, title, body, source)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(notificationId, projectId, input.title, input.body, input.source)
    .run();

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM notification_channels
     WHERE project_id = ? AND enabled = 1`,
  )
    .bind(projectId)
    .all<NotificationChannel>();

  await Promise.all(results.map((channel) => sendNotificationChannel(channel, input)));
}

async function sendNotificationChannel(
  channel: NotificationChannel,
  input: { title: string; body: string; source: string },
) {
  const payload = {
    text: `${input.title}: ${input.body}`,
    title: input.title,
    body: input.body,
    source: input.source,
    projectflare: true,
  };

  try {
    await fetch(channel.target_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Notification channel delivery failed", channel.id, error);
  }
}

async function findProjectIdForGitHubRepository(env: Env, repositoryFullName: string): Promise<string | null> {
  if (!env.DB) return null;

  const [owner, name] = repositoryFullName.split("/");
  if (!owner || !name) return null;

  const repo = await env.DB.prepare(
    `SELECT project_id
     FROM github_repositories
     WHERE owner = ? AND name = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(owner, name)
    .first<{ project_id: string | null }>();

  return repo?.project_id || null;
}

async function handleGenericWebhook(request: Request, env: Env, projectId: string) {
  const payload = await request.json<Record<string, unknown>>();

  try {
    return await handleGenericWebhookUseCase(
      {
        endpointOrProjectId: projectId,
        token: bearerTokenFromRequest(request),
        payload,
      },
      createGenericWebhookPorts(env, (projectId, input) => notifyProject(env, projectId, input)),
    );
  } catch (error) {
    if (error instanceof ApplicationError) return jsonError(error.code, error.status);
    throw error;
  }
}

function bearerTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-projectflare-token");
}

function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `workspace-${Date.now()}`;
}

function demoWorkspaces(): Workspace[] {
  return [
    {
      id: "ws_demo",
      name: "ProjectFlare Demo",
      slug: "demo",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

function demoProjects() {
  return [
    {
      id: "prj_launch",
      workspace_id: "ws_demo",
      workspace_name: "ProjectFlare Demo",
      name: "Cloudflare Native MVP",
      description: "Tasks, gantt, wiki, webhooks, and Access-backed users.",
      status: "active",
      starts_on: "2026-06-01",
      due_on: "2026-07-15",
      github_repository_url: "https://github.com/example/projectflare",
    },
  ];
}

function demoTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: "tsk_schema",
      project_id: "prj_launch",
      title: "Design D1 schema",
      description: "Model the core project OS entities.",
      status: "done",
      priority: "high",
      assignee_user_id: null,
      starts_on: "2026-06-01",
      due_on: "2026-06-05",
      progress: 100,
      source: "seed",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "tsk_ui",
      project_id: "prj_launch",
      title: "Build project command center",
      description: "Dense scanning surface for task and schedule work.",
      status: "in_progress",
      priority: "high",
      assignee_user_id: null,
      starts_on: "2026-06-04",
      due_on: "2026-06-20",
      progress: 55,
      source: "seed",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "tsk_webhooks",
      project_id: "prj_launch",
      title: "Accept generic webhook tasks",
      description: "Turn JSON payloads into triage tasks.",
      status: "todo",
      priority: "medium",
      assignee_user_id: null,
      starts_on: "2026-06-18",
      due_on: "2026-06-28",
      progress: 10,
      source: "seed",
      external_url: null,
      github_issue_url: null,
      backlog_issue_url: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

function demoComments(taskId: string): TaskComment[] {
  if (taskId !== "tsk_ui") return [];

  const now = new Date().toISOString();
  return [
    {
      id: "comment_demo",
      task_id: taskId,
      author_user_id: "usr_demo",
      author_name: "ProjectFlare",
      body: "Phase 1 should make task updates and comments usable from the first screen.",
      created_at: now,
      updated_at: now,
    },
  ];
}

function demoDependencies(): TaskDependency[] {
  const now = new Date().toISOString();
  return [
    {
      task_id: "tsk_ui",
      depends_on_task_id: "tsk_schema",
      task_title: "Build project command center",
      depends_on_title: "Design D1 schema",
      created_at: now,
    },
    {
      task_id: "tsk_webhooks",
      depends_on_task_id: "tsk_schema",
      task_title: "Accept generic webhook tasks",
      depends_on_title: "Design D1 schema",
      created_at: now,
    },
  ];
}

function demoWikiPages(projectId: string): WikiPage[] {
  const now = new Date().toISOString();
  return [
    {
      id: "wiki_overview",
      project_id: projectId,
      parent_page_id: null,
      title: "MVP Scope",
      slug: "mvp-scope",
      body_markdown:
        "# MVP Scope\n\nProjectFlare starts as a Cloudflare-only project OS.\n\n- Task board\n- Gantt timeline\n- Markdown wiki\n- Webhook intake",
      created_by_user_id: null,
      updated_by_user_id: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

function demoWikiRevisions(pageId: string): WikiRevision[] {
  return [
    {
      id: "wiki_revision_demo",
      wiki_page_id: pageId,
      body_markdown: "# MVP Scope\n\nInitial demo revision.",
      author_user_id: "usr_demo",
      author_name: "ProjectFlare",
      created_at: new Date().toISOString(),
    },
  ];
}

function demoGitHubRepositories(workspaceId: string): GitHubRepository[] {
  const now = new Date().toISOString();
  return [
    {
      id: "github_repo_demo",
      github_integration_id: "github_integration_demo",
      project_id: "prj_launch",
      owner: "example",
      name: "projectflare",
      repository_url: "https://github.com/example/projectflare",
      created_at: now,
      updated_at: now,
    },
  ].filter(() => workspaceId === "ws_demo");
}

function demoWebhookEndpoints(projectId: string): WebhookEndpoint[] {
  if (projectId !== "prj_launch") return [];

  const now = new Date().toISOString();
  return [
    {
      id: "webhook_endpoint_demo",
      project_id: projectId,
      name: "Demo intake",
      secret_hash: "stored",
      mapping_json: JSON.stringify({ source: "demo", defaultPriority: "medium" }),
      enabled: 1,
      created_at: now,
      updated_at: now,
    },
  ];
}
