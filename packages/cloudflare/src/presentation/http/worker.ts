import { handleGenericWebhookUseCase } from "../../../../core/src/application/usecases/handle-generic-webhook";
import {
  getAttachmentContentUseCase,
  listAttachmentsUseCase,
  uploadAttachmentUseCase,
} from "../../../../core/src/application/usecases/manage-attachments";
import {
  createGitHubRepositoryUseCase,
  listGitHubRepositoriesUseCase,
} from "../../../../core/src/application/usecases/manage-github-repositories";
import {
  createNotificationChannelUseCase,
  listNotificationChannelsUseCase,
  listNotificationsUseCase,
  markNotificationReadUseCase,
  notifyProjectUseCase,
} from "../../../../core/src/application/usecases/manage-notifications";
import {
  dispatchPluginHookUseCase,
  installPluginUseCase,
  invokePluginRouteUseCase,
  listInstalledPluginsUseCase,
  listPluginCatalogUseCase,
  setPluginEnabledUseCase,
} from "../../../../core/src/application/usecases/manage-plugins";
import {
  createProjectUseCase,
  createWorkspaceUseCase,
  getProjectUseCase,
  listProjectsUseCase,
  listWorkspacesUseCase,
  updateProjectUseCase,
} from "../../../../core/src/application/usecases/manage-projects";
import {
  createTaskCommentUseCase,
  createTaskDependencyUseCase,
  listProjectDependenciesUseCase,
  listTaskCommentsUseCase,
  listTaskDependenciesUseCase,
} from "../../../../core/src/application/usecases/manage-task-collaboration";
import {
  createProjectTaskUseCase,
  listProjectTasksUseCase,
  updateTaskUseCase,
} from "../../../../core/src/application/usecases/manage-tasks";
import {
  createWebhookEndpointUseCase,
  listWebhookEndpointsUseCase,
} from "../../../../core/src/application/usecases/manage-webhook-endpoints";
import {
  createWikiPageUseCase,
  getWikiPageUseCase,
  listWikiPagesUseCase,
  listWikiRevisionsUseCase,
  updateWikiPageUseCase,
} from "../../../../core/src/application/usecases/manage-wiki";
import { processGitHubWebhookUseCase } from "../../../../core/src/application/usecases/process-github-webhook";
import type { AttachmentOwnerType } from "../../../../core/src/domain/attachment";
import { ApplicationError } from "../../../../core/src/domain/errors";
import { type GitHubWebhookPayload, repositoryFullNameFromPayload } from "../../../../core/src/domain/github";
import type { NotificationChannel } from "../../../../core/src/domain/notification";
import type { PluginCapability } from "../../../../core/src/domain/plugin";
import type { Project, Workspace } from "../../../../core/src/domain/project";
import { verifyGitHubSignature } from "../../../../core/src/domain/security";
import { type Task as DomainTask, taskStatusLabels } from "../../../../core/src/domain/task";
import type { WikiPage } from "../../../../core/src/domain/wiki";
import type { GitHubQueueMessage, ProjectFlareQueueMessage } from "../../../../core/src/ports/queue";
import { createAttachmentUseCasePorts } from "../../infrastructure/cloudflare/d1/attachment-repository";
import { createGenericWebhookPorts } from "../../infrastructure/cloudflare/d1/generic-webhook-adapter";
import { createGitHubRepositoryUseCasePorts } from "../../infrastructure/cloudflare/d1/github-repository";
import { createGitHubSyncPorts } from "../../infrastructure/cloudflare/d1/github-sync-adapter";
import { createNotificationUseCasePorts } from "../../infrastructure/cloudflare/d1/notification-repository";
import { createPluginRepository } from "../../infrastructure/cloudflare/d1/plugin-repository";
import { createProjectUseCasePorts } from "../../infrastructure/cloudflare/d1/project-repository";
import { createTaskCollaborationUseCasePorts } from "../../infrastructure/cloudflare/d1/task-collaboration-repository";
import {
  resolveTaskAssigneeId,
  resolveTaskCategoryId,
  resolveTaskMilestoneId,
} from "../../infrastructure/cloudflare/d1/task-metadata";
import { createTaskUseCasePorts } from "../../infrastructure/cloudflare/d1/task-repository";
import { createWebhookEndpointUseCasePorts } from "../../infrastructure/cloudflare/d1/webhook-endpoint-repository";
import { createWikiUseCasePorts } from "../../infrastructure/cloudflare/d1/wiki-repository";
import type { Env } from "../../infrastructure/cloudflare/env";
import { getOrCreateAccessUser } from "../../infrastructure/cloudflare/identity/access-user";
import { createPluginCatalog, createPluginRuntime } from "../../infrastructure/cloudflare/plugins/builtin";
import { renderApp } from "../ui/app";
import {
  demoComments,
  demoDependencies,
  demoGitHubRepositories,
  demoProjects,
  demoTasks,
  demoWebhookEndpoints,
  demoWikiPages,
  demoWikiRevisions,
  demoWorkspaces,
} from "./demo-data";
import { htmlResponse, json, jsonError } from "./responses";
import type { TaskComment } from "./types";

type Task = DomainTask;

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
      if (path === "/api/me") return json(await getOrCreateAccessUser(request, env));
      if (path === "/api/plugins/catalog" && request.method === "GET") {
        return json(await listPluginCatalogUseCase(createPluginPorts(env)));
      }
      if (path === "/api/workspaces") {
        if (request.method === "GET") return json(await listWorkspaces(env));
        if (request.method === "POST") return json(await createWorkspace(request, env), 201);
      }
      if (path.match(/^\/api\/workspaces\/[^/]+\/plugins$/)) {
        const workspaceId = path.split("/")[3];
        if (request.method === "GET")
          return json(await listInstalledPluginsUseCase(workspaceId, createPluginPorts(env)));
        if (request.method === "POST") return json(await installPlugin(request, env, workspaceId), 201);
      }
      if (path.match(/^\/api\/workspaces\/[^/]+\/plugins\/[^/]+$/) && request.method === "PATCH") {
        const [, , , workspaceId, , pluginId] = path.split("/");
        return json(await setPluginEnabled(request, env, workspaceId, decodeURIComponent(pluginId)));
      }
      if (path.match(/^\/api\/workspaces\/[^/]+\/plugins\/[^/]+\/routes\/[^/]+$/)) {
        const [, , , workspaceId, , pluginId, , routeName] = path.split("/");
        return json(
          await invokePluginRoute(
            request,
            env,
            workspaceId,
            decodeURIComponent(pluginId),
            decodeURIComponent(routeName),
          ),
        );
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
        if (request.method === "GET") return json(await listTaskComments(request, env, taskId));
        if (request.method === "POST") return json(await createTaskComment(request, env, taskId), 201);
      }
      if (path.match(/^\/api\/tasks\/[^/]+\/attachments$/)) {
        const taskId = path.split("/")[3];
        if (request.method === "GET") return json(await listAttachments(env, "task", taskId));
        if (request.method === "POST") return json(await uploadAttachment(request, env, "task", taskId), 201);
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
      if (path.match(/^\/api\/wiki\/[^/]+\/attachments$/)) {
        const pageId = path.split("/")[3];
        if (request.method === "GET") return json(await listAttachments(env, "wiki_page", pageId));
        if (request.method === "POST") return json(await uploadAttachment(request, env, "wiki_page", pageId), 201);
      }
      if (path.match(/^\/api\/attachments\/[^/]+\/content$/) && request.method === "GET") {
        const attachmentId = path.split("/")[3];
        return attachmentContent(env, attachmentId);
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

async function listWorkspaces(env: Env) {
  const workspaces = await listWorkspacesUseCase(createProjectUseCasePorts(env));
  return workspaces.length ? workspaces : demoWorkspaces();
}

async function createWorkspace(request: Request, env: Env) {
  const user = await getOrCreateAccessUser(request, env);
  const body = await request.json<Partial<Workspace>>();
  return createWorkspaceUseCase(
    {
      name: body.name,
      slug: body.slug,
      ownerUserId: user.id,
    },
    createProjectUseCasePorts(env),
  );
}

function createPluginPorts(env: Env) {
  return {
    catalog: createPluginCatalog(),
    plugins: createPluginRepository(env),
    runtime: createPluginRuntime(env),
  };
}

async function installPlugin(request: Request, env: Env, workspaceId: string) {
  const body = await request.json<{
    pluginId?: string;
    plugin_id?: string;
    approvedCapabilities?: string[];
    approved_capabilities?: string[];
    settings?: Record<string, unknown> | null;
  }>();

  return installPluginUseCase(
    {
      workspaceId,
      pluginId: (body.pluginId ?? body.plugin_id)?.trim() || "",
      approvedCapabilities: pluginCapabilitiesFrom(body.approvedCapabilities ?? body.approved_capabilities),
      settings: body.settings ?? null,
    },
    createPluginPorts(env),
  );
}

async function setPluginEnabled(request: Request, env: Env, workspaceId: string, pluginId: string) {
  const body = await request.json<{ enabled?: boolean }>();
  return setPluginEnabledUseCase(workspaceId, pluginId, body.enabled !== false, createPluginPorts(env));
}

async function invokePluginRoute(request: Request, env: Env, workspaceId: string, pluginId: string, routeName: string) {
  const input =
    request.method === "POST" && request.headers.get("content-type")?.includes("application/json")
      ? await request.json<Record<string, unknown>>()
      : Object.fromEntries(new URL(request.url).searchParams.entries());

  const result = await invokePluginRouteUseCase(
    {
      workspaceId,
      pluginId,
      routeName,
      method: request.method === "GET" ? "GET" : "POST",
      input,
    },
    createPluginPorts(env),
  );

  if (!result.ok)
    return jsonError(String((result.data as { error?: string }).error || "plugin_route_failed"), result.status ?? 500);
  return result.data;
}

function pluginCapabilitiesFrom(value: string[] | undefined): PluginCapability[] {
  return (value ?? []).filter((capability): capability is PluginCapability => typeof capability === "string");
}

async function listProjects(env: Env, workspaceId?: string) {
  const projects = await listProjectsUseCase({ workspaceId }, createProjectUseCasePorts(env));
  const fallback = workspaceId
    ? demoProjects().filter((project) => project.workspace_id === workspaceId)
    : demoProjects();
  return projects.length ? projects : fallback;
}

async function getProject(env: Env, projectId: string) {
  return (
    (await getProjectUseCase(projectId, createProjectUseCasePorts(env))) ??
    demoProjects().find((project) => project.id === projectId) ??
    null
  );
}

async function createProject(request: Request, env: Env, workspaceId: string) {
  const user = await getOrCreateAccessUser(request, env);
  const body = await request.json<
    Partial<Project> & {
      startsOn?: string | null;
      dueOn?: string | null;
      githubRepositoryUrl?: string | null;
    }
  >();
  return createProjectUseCase(
    {
      workspaceId,
      ownerUserId: user.id,
      name: body.name,
      description: body.description,
      status: body.status,
      startsOn: body.startsOn ?? body.starts_on,
      dueOn: body.dueOn ?? body.due_on,
      githubRepositoryUrl: body.githubRepositoryUrl ?? body.github_repository_url,
    },
    createProjectUseCasePorts(env),
  );
}

async function updateProject(request: Request, env: Env, projectId: string) {
  const body = await request.json<
    Partial<Project> & {
      startsOn?: string | null;
      dueOn?: string | null;
      githubRepositoryUrl?: string | null;
    }
  >();
  return updateProjectUseCase(
    projectId,
    {
      name: body.name,
      description: body.description,
      status: body.status,
      startsOn: body.startsOn ?? body.starts_on,
      dueOn: body.dueOn ?? body.due_on,
      githubRepositoryUrl: body.githubRepositoryUrl ?? body.github_repository_url,
    },
    createProjectUseCasePorts(env),
  );
}

async function listGitHubRepositories(env: Env, workspaceId: string) {
  const repositories = await listGitHubRepositoriesUseCase(workspaceId, createGitHubRepositoryUseCasePorts(env));
  return repositories.length ? repositories : demoGitHubRepositories(workspaceId);
}

async function createGitHubRepository(request: Request, env: Env, workspaceId: string) {
  const body = await request.json<{
    projectId?: string | null;
    project_id?: string | null;
    owner?: string | null;
    name?: string | null;
    repositoryUrl?: string | null;
    repository_url?: string | null;
  }>();
  return createGitHubRepositoryUseCase(
    {
      workspaceId,
      projectId: body.projectId ?? body.project_id,
      owner: body.owner,
      name: body.name,
      repositoryUrl: body.repositoryUrl ?? body.repository_url,
    },
    createGitHubRepositoryUseCasePorts(env),
  );
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
  const endpoints = await listWebhookEndpointsUseCase(projectId, createWebhookEndpointUseCasePorts(env));
  return endpoints.length ? endpoints : demoWebhookEndpoints(projectId);
}

async function createWebhookEndpoint(request: Request, env: Env, projectId: string) {
  const body = await request.json<{
    name?: string | null;
    defaultPriority?: string | null;
    default_priority?: string | null;
    source?: string | null;
  }>();
  return createWebhookEndpointUseCase(
    {
      projectId,
      baseUrl: request.url,
      name: body.name,
      source: body.source,
      defaultPriority: body.defaultPriority ?? body.default_priority,
    },
    createWebhookEndpointUseCasePorts(env),
  );
}

async function listNotificationChannels(env: Env, projectId: string) {
  return listNotificationChannelsUseCase(projectId, createNotificationUseCasePorts(env));
}

async function createNotificationChannel(request: Request, env: Env, projectId: string) {
  const body = await request.json<
    Partial<NotificationChannel> & { channelType?: string | null; targetUrl?: string | null }
  >();
  return createNotificationChannelUseCase(
    {
      projectId,
      name: body.name,
      channelType: body.channelType ?? body.channel_type,
      targetUrl: body.targetUrl ?? body.target_url,
    },
    createNotificationUseCasePorts(env),
  );
}

async function listNotifications(env: Env, projectId: string) {
  return listNotificationsUseCase(projectId, createNotificationUseCasePorts(env));
}

async function markNotificationRead(env: Env, notificationId: string) {
  return markNotificationReadUseCase(notificationId, createNotificationUseCasePorts(env));
}

async function listTasks(env: Env, projectId: string) {
  const tasks = await listProjectTasksUseCase(projectId, createTaskUseCasePorts(env));
  return tasks.length ? tasks : demoTasks().filter((task) => task.project_id === projectId);
}

async function listWikiPages(env: Env, projectId: string) {
  const pages = await listWikiPagesUseCase(projectId, createWikiUseCasePorts(env));
  return pages.length ? pages : demoWikiPages(projectId);
}

async function getWikiPage(env: Env, pageId: string) {
  return (
    (await getWikiPageUseCase(pageId, createWikiUseCasePorts(env))) ??
    demoWikiPages("prj_launch").find((page) => page.id === pageId) ??
    null
  );
}

async function createWikiPage(request: Request, env: Env, projectId: string) {
  const user = await getOrCreateAccessUser(request, env);
  const body = await request.json<Partial<WikiPage> & { bodyMarkdown?: string; parentPageId?: string | null }>();
  return createWikiPageUseCase(
    {
      projectId,
      authorUserId: user.id,
      title: body.title,
      slug: body.slug,
      bodyMarkdown: body.bodyMarkdown ?? body.body_markdown,
      parentPageId: body.parentPageId ?? body.parent_page_id,
    },
    createWikiUseCasePorts(env),
  );
}

async function updateWikiPage(request: Request, env: Env, pageId: string) {
  const user = await getOrCreateAccessUser(request, env);
  const body = await request.json<Partial<WikiPage> & { bodyMarkdown?: string; parentPageId?: string | null }>();
  return updateWikiPageUseCase(
    pageId,
    {
      authorUserId: user.id,
      title: body.title,
      slug: body.slug,
      bodyMarkdown: body.bodyMarkdown ?? body.body_markdown,
      parentPageId: body.parentPageId ?? body.parent_page_id,
    },
    createWikiUseCasePorts(env),
  );
}

async function listWikiRevisions(env: Env, pageId: string) {
  const revisions = await listWikiRevisionsUseCase(pageId, createWikiUseCasePorts(env));
  return revisions.length ? revisions : demoWikiRevisions(pageId);
}

async function createTask(request: Request, env: Env, projectId: string) {
  const body = await request.json<
    Partial<Task> & {
      dueDate?: string;
      dueOn?: string;
      parentTaskId?: string | null;
      categoryName?: string;
      category_name?: string;
      milestoneName?: string;
      milestone_name?: string;
      milestoneDueOn?: string;
      milestone_due_on?: string;
      assigneeName?: string;
      assignee_name?: string;
      tags?: string | string[];
    }
  >();
  const categoryId =
    body.category_id || (await resolveTaskCategoryId(env, projectId, body.categoryName ?? body.category_name));
  const milestoneId =
    body.milestone_id ||
    (await resolveTaskMilestoneId(
      env,
      projectId,
      body.milestoneName ?? body.milestone_name,
      body.milestoneDueOn ?? body.milestone_due_on,
    ));
  const assigneeUserId =
    body.assignee_user_id || (await resolveTaskAssigneeId(env, body.assigneeName ?? body.assignee_name));
  const task = await createProjectTaskUseCase(
    {
      projectId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigneeUserId,
      startsOn: body.starts_on,
      dueOn: body.due_on || body.dueOn || body.dueDate,
      progress: body.progress,
      parentTaskId: body.parent_task_id ?? body.parentTaskId,
      categoryId,
      milestoneId,
      tags: body.tags,
      source: body.source,
      externalUrl: body.external_url,
      githubIssueUrl: body.github_issue_url,
      backlogIssueUrl: body.backlog_issue_url,
    },
    createTaskUseCasePorts(env),
  );

  const workspaceId = await findWorkspaceIdForProject(env, projectId);
  if (workspaceId) {
    await dispatchPluginHookUseCase(
      {
        name: "task:created",
        workspaceId,
        projectId,
        taskId: task.id,
        title: task.title,
        source: task.source,
      },
      createPluginPorts(env),
    );
  }
  await notifyProject(env, projectId, {
    title: "Task created",
    body: `${task.title} was created.`,
    source: task.source || "app",
  });

  return task;
}

async function updateTask(request: Request, env: Env, taskId: string) {
  const body = await request.json<
    Partial<Task> & {
      assigneeName?: string;
      assignee_name?: string;
      startsOn?: string | null;
      dueOn?: string | null;
      categoryId?: string | null;
      milestoneId?: string | null;
      parentTaskId?: string | null;
      tags?: string | string[];
    }
  >();
  const allowedStatus = body.status && body.status in taskStatusLabels ? body.status : undefined;
  const progress =
    typeof body.progress === "number" ? Math.min(100, Math.max(0, Math.round(body.progress))) : undefined;

  if (!env.DB) return { id: taskId, status: allowedStatus, progress };

  const assigneeUserId =
    Object.hasOwn(body, "assigneeName") || Object.hasOwn(body, "assignee_name")
      ? await resolveTaskAssigneeId(env, body.assigneeName ?? body.assignee_name)
      : body.assignee_user_id;
  const patch = {
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    ...(Object.hasOwn(body, "assignee_user_id") ||
    Object.hasOwn(body, "assigneeName") ||
    Object.hasOwn(body, "assignee_name")
      ? { assigneeUserId }
      : {}),
    startsOn: body.startsOn ?? body.starts_on,
    dueOn: body.dueOn ?? body.due_on,
    progress: body.progress,
    ...(Object.hasOwn(body, "categoryId") || Object.hasOwn(body, "category_id")
      ? { categoryId: body.categoryId ?? body.category_id }
      : {}),
    ...(Object.hasOwn(body, "milestoneId") || Object.hasOwn(body, "milestone_id")
      ? { milestoneId: body.milestoneId ?? body.milestone_id }
      : {}),
    ...(Object.hasOwn(body, "tags") ? { tags: body.tags } : {}),
    ...(Object.hasOwn(body, "parentTaskId") || Object.hasOwn(body, "parent_task_id")
      ? { parentTaskId: body.parentTaskId ?? body.parent_task_id }
      : {}),
  };

  return updateTaskUseCase(taskId, patch, createTaskUseCasePorts(env));
}

async function listProjectDependencies(env: Env, projectId: string) {
  const dependencies = await listProjectDependenciesUseCase(projectId, createTaskCollaborationUseCasePorts(env));
  return dependencies.length
    ? dependencies
    : demoDependencies().filter((dependency) => dependency.task_id.startsWith("tsk_"));
}

async function listTaskDependencies(env: Env, taskId: string) {
  const dependencies = await listTaskDependenciesUseCase(taskId, createTaskCollaborationUseCasePorts(env));
  return dependencies.length ? dependencies : demoDependencies().filter((dependency) => dependency.task_id === taskId);
}

async function createTaskDependency(request: Request, env: Env, taskId: string) {
  const body = await request.json<{ dependsOnTaskId?: string; depends_on_task_id?: string }>();
  return createTaskDependencyUseCase(
    {
      taskId,
      dependsOnTaskId: body.dependsOnTaskId ?? body.depends_on_task_id,
    },
    createTaskCollaborationUseCasePorts(env),
  );
}

async function listTaskComments(request: Request, env: Env, taskId: string) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "20");
  const comments = await listTaskCommentsUseCase({ taskId, limit }, createTaskCollaborationUseCasePorts(env));
  return comments.length ? comments : demoComments(taskId).slice(0, Math.min(Math.max(limit || 20, 1), 50));
}

async function createTaskComment(request: Request, env: Env, taskId: string) {
  const user = await getOrCreateAccessUser(request, env);
  const body = await request.json<Partial<TaskComment>>();
  const { comment, notificationTarget } = await createTaskCommentUseCase(
    {
      taskId,
      authorUserId: user.id,
      authorName: user.name,
      body: body.body,
    },
    createTaskCollaborationUseCasePorts(env),
  );
  if (notificationTarget) {
    await notifyProject(env, notificationTarget.project_id, {
      title: "Task comment added",
      body: `${user.name} commented on ${notificationTarget.title}.`,
      source: "app",
    });
  }

  return comment;
}

async function listAttachments(env: Env, ownerType: AttachmentOwnerType, ownerId: string) {
  return listAttachmentsUseCase({ ownerType, ownerId }, createAttachmentUseCasePorts(env));
}

async function uploadAttachment(request: Request, env: Env, ownerType: AttachmentOwnerType, ownerId: string) {
  const user = await getOrCreateAccessUser(request, env);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApplicationError("attachment_file_required", 400);

  return uploadAttachmentUseCase(
    {
      ownerType,
      ownerId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      byteSize: file.size,
      body: await file.arrayBuffer(),
      createdByUserId: user.id,
    },
    createAttachmentUseCasePorts(env),
  );
}

async function attachmentContent(env: Env, attachmentId: string) {
  const content = await getAttachmentContentUseCase(attachmentId, createAttachmentUseCasePorts(env));
  return new Response(content.body, {
    headers: {
      "content-type": content.contentType,
      "content-length": String(content.byteSize),
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": `inline; filename="${content.attachment.filename.replaceAll('"', "")}"`,
    },
  });
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
  await notifyProjectUseCase(projectId, input, createNotificationUseCasePorts(env));
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

async function findWorkspaceIdForProject(env: Env, projectId: string): Promise<string | null> {
  if (!env.DB) return projectId === "prj_launch" ? "ws_demo" : null;

  const project = await env.DB.prepare("SELECT workspace_id FROM projects WHERE id = ?")
    .bind(projectId)
    .first<{ workspace_id: string }>();
  return project?.workspace_id ?? null;
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
