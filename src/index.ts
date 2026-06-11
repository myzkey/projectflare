type Env = {
  DB?: D1Database;
  FILES?: R2Bucket;
  PROJECTFLARE_QUEUE?: Queue<ProjectFlareQueueMessage>;
  GITHUB_WEBHOOK_SECRET?: string;
};

type AccessUser = {
  id: string;
  email: string;
  name: string;
  group: string | null;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

type Project = {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  name: string;
  description: string | null;
  status: string;
  starts_on: string | null;
  due_on: string | null;
  github_repository_url: string | null;
  created_at: string;
  updated_at: string;
};

type TaskStatus = "todo" | "in_progress" | "review" | "done" | "archived";

type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "urgent";
  assignee_user_id: string | null;
  starts_on: string | null;
  due_on: string | null;
  progress: number;
  source: string | null;
  external_url: string | null;
  github_issue_url: string | null;
  backlog_issue_url: string | null;
  created_at: string;
  updated_at: string;
};

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

type WikiPage = {
  id: string;
  project_id: string;
  parent_page_id: string | null;
  title: string;
  slug: string;
  body_markdown: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type WikiRevision = {
  id: string;
  wiki_page_id: string;
  body_markdown: string;
  author_user_id: string | null;
  author_name?: string | null;
  created_at: string;
};

type GitHubRepository = {
  id: string;
  github_integration_id: string;
  project_id: string | null;
  owner: string;
  name: string;
  repository_url: string;
  created_at: string;
  updated_at: string;
};

type GitHubWebhookPayload = {
  action?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
    owner?: { login?: string };
    name?: string;
  };
  issue?: {
    number?: number;
    title?: string;
    body?: string | null;
    html_url?: string;
    state?: string;
  };
  comment?: {
    body?: string;
    html_url?: string;
    user?: { login?: string };
  };
  pull_request?: {
    title?: string;
    body?: string | null;
    html_url?: string;
    state?: string;
    merged?: boolean;
  };
  sender?: { login?: string };
};

type GitHubQueueMessage = {
  type: "github.webhook";
  eventId: string;
  deliveryId: string | null;
  eventName: string;
  action: string | null;
  repositoryFullName: string | null;
  payload: GitHubWebhookPayload;
};

type GenericWebhookQueueMessage = {
  type: "generic.task.created";
  projectId: string;
  taskId: string;
  source: string | null;
};

type ProjectFlareQueueMessage = GitHubQueueMessage | GenericWebhookQueueMessage;

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

type NotificationChannel = {
  id: string;
  project_id: string;
  name: string;
  channel_type: "webhook" | "slack" | "lark";
  target_url: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

type Notification = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  source: string;
  read_at: string | null;
  created_at: string;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  archived: "Archived"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/") return htmlResponse(renderApp());
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
          source: "generic_webhook"
        });
      }
      message.ack();
    }
  }
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
     ON CONFLICT(email) DO UPDATE SET name = excluded.name, access_group = excluded.access_group, updated_at = CURRENT_TIMESTAMP`
  )
    .bind(id, email, name, group)
    .run();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role)
     VALUES ('ws_demo', ?, 'owner')`
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
     ORDER BY created_at DESC`
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
    updated_at: new Date().toISOString()
  };

  if (!env.DB) return workspace;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO workspaces (id, name, slug)
       VALUES (?, ?, ?)`
    ).bind(workspace.id, workspace.name, workspace.slug),
    env.DB.prepare(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).bind(workspace.id, user.id)
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
     WHERE p.id = ?`
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
    updated_at: new Date().toISOString()
  };

  if (!env.DB) return project;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO projects (id, workspace_id, name, description, status, starts_on, due_on, github_repository_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      project.id,
      project.workspace_id,
      project.name,
      project.description,
      project.status,
      project.starts_on,
      project.due_on,
      project.github_repository_url
    ),
    env.DB.prepare(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES (?, ?, 'owner')`
    ).bind(project.id, user.id)
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
     WHERE id = ?`
  )
    .bind(
      body.name?.trim() || existing.name,
      body.description ?? existing.description,
      body.status || existing.status,
      body.starts_on ?? existing.starts_on,
      body.due_on ?? existing.due_on,
      body.github_repository_url ?? existing.github_repository_url,
      projectId
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
     ORDER BY r.updated_at DESC`
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
    updated_at: new Date().toISOString()
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
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(repository.id, integrationId, repository.project_id, repository.owner, repository.name, repository.repository_url)
    .run();

  if (repository.project_id) {
    await env.DB.prepare(
      `UPDATE projects
       SET github_repository_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
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
  await env.DB.prepare("INSERT INTO github_integrations (id, workspace_id) VALUES (?, ?)")
    .bind(id, workspaceId)
    .run();
  return id;
}

async function listGitHubEvents(env: Env, projectId: string) {
  if (!env.DB) return [];

  const { results } = await env.DB.prepare(
    `SELECT id, project_id, source, event_type, status, payload_json, created_at, processed_at
     FROM webhook_events
     WHERE source = 'github' AND project_id = ?
     ORDER BY created_at DESC
     LIMIT 20`
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
     ORDER BY created_at DESC`
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
    defaultPriority: normalizePriority(body.default_priority)
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
    token
  };

  endpoint.endpoint_url = new URL(`/api/webhooks/generic/${endpoint.id}`, request.url).toString();

  if (!env.DB) return endpoint;

  await env.DB.prepare(
    `INSERT INTO webhook_endpoints (id, project_id, name, secret_hash, mapping_json, enabled)
     VALUES (?, ?, ?, ?, ?, 1)`
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
     ORDER BY created_at DESC`
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
    updated_at: new Date().toISOString()
  };

  if (!channel.target_url) return jsonError("notification_target_url_required", 400);
  if (!env.DB) return channel;

  await env.DB.prepare(
    `INSERT INTO notification_channels (id, project_id, name, channel_type, target_url, enabled)
     VALUES (?, ?, ?, ?, ?, 1)`
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
     LIMIT 30`
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
     WHERE id = ?`
  )
    .bind(notificationId)
    .run();

  return { id: notificationId, read: true };
}

async function listTasks(env: Env, projectId: string) {
  if (!env.DB) return demoTasks().filter((task) => task.project_id === projectId);

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM tasks
     WHERE project_id = ?
     ORDER BY
       CASE status
         WHEN 'in_progress' THEN 1
         WHEN 'review' THEN 2
         WHEN 'todo' THEN 3
         WHEN 'done' THEN 4
         ELSE 5
       END,
       COALESCE(due_on, '9999-12-31') ASC`
  )
    .bind(projectId)
    .all<Task>();

  return results.length ? results : demoTasks().filter((task) => task.project_id === projectId);
}

async function listWikiPages(env: Env, projectId: string) {
  if (!env.DB) return demoWikiPages(projectId);

  const { results } = await env.DB.prepare(
    `SELECT id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id, created_at, updated_at
     FROM wiki_pages
     WHERE project_id = ?
     ORDER BY updated_at DESC`
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
     WHERE id = ?`
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
    updated_at: new Date().toISOString()
  };

  if (!env.DB) return page;

  const revisionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO wiki_pages (
         id, project_id, parent_page_id, title, slug, body_markdown, created_by_user_id, updated_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      page.id,
      page.project_id,
      page.parent_page_id,
      page.title,
      page.slug,
      page.body_markdown,
      user.id,
      user.id
    ),
    env.DB.prepare(
      `INSERT INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
       VALUES (?, ?, ?, ?)`
    ).bind(revisionId, page.id, page.body_markdown, user.id)
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
       WHERE id = ?`
    ).bind(title, slug, markdown, body.parent_page_id ?? existing.parent_page_id, user.id, pageId),
    env.DB.prepare(
      `INSERT INTO wiki_revisions (id, wiki_page_id, body_markdown, author_user_id)
       VALUES (?, ?, ?, ?)`
    ).bind(revisionId, pageId, markdown, user.id)
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
     ORDER BY r.created_at DESC`
  )
    .bind(pageId)
    .all<WikiRevision>();

  return results;
}

async function createTask(request: Request, env: Env, projectId: string) {
  const body = await request.json<Partial<Task> & { dueDate?: string }>();
  const task = normalizeIncomingTask(projectId, body);

  if (!env.DB) return task;

  await env.DB.prepare(
    `INSERT INTO tasks (
       id, project_id, title, description, status, priority, starts_on, due_on,
       progress, source, external_url, github_issue_url, backlog_issue_url
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      task.id,
      task.project_id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.starts_on,
      task.due_on,
      task.progress,
      task.source,
      task.external_url,
      task.github_issue_url,
      task.backlog_issue_url
    )
    .run();

  return task;
}

async function updateTask(request: Request, env: Env, taskId: string) {
  const body = await request.json<Partial<Task>>();
  const allowedStatus = body.status && body.status in statusLabels ? body.status : undefined;
  const allowedPriority = body.priority ? normalizePriority(body.priority) : undefined;
  const progress = typeof body.progress === "number" ? clamp(body.progress, 0, 100) : undefined;

  if (!env.DB) return { id: taskId, status: allowedStatus, progress };

  const existing = await env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(taskId).first<Task>();
  if (!existing) return { error: "task_not_found" };

  await env.DB.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, starts_on = ?, due_on = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      body.title?.trim() || existing.title,
      body.description ?? existing.description,
      allowedStatus ?? existing.status,
      allowedPriority ?? existing.priority,
      body.starts_on ?? existing.starts_on,
      body.due_on ?? existing.due_on,
      progress ?? existing.progress,
      taskId
    )
    .run();

  return env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(taskId).first<Task>();
}

async function listProjectDependencies(env: Env, projectId: string) {
  if (!env.DB) return demoDependencies().filter((dependency) => dependency.task_id.startsWith("tsk_"));

  const { results } = await env.DB.prepare(
    `SELECT d.task_id, d.depends_on_task_id, t.title AS task_title, parent.title AS depends_on_title, d.created_at
     FROM task_dependencies d
     JOIN tasks t ON t.id = d.task_id
     JOIN tasks parent ON parent.id = d.depends_on_task_id
     WHERE t.project_id = ?
     ORDER BY d.created_at DESC`
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
     ORDER BY d.created_at DESC`
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
    created_at: new Date().toISOString()
  };

  if (!env.DB) return dependency;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id)
     VALUES (?, ?)`
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
     ORDER BY c.created_at ASC`
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
    updated_at: new Date().toISOString()
  };

  if (!comment.body) return jsonError("comment_body_required", 400);
  if (!env.DB) return comment;

  await env.DB.prepare(
    `INSERT INTO task_comments (id, task_id, author_user_id, body)
     VALUES (?, ?, ?, ?)`
  )
    .bind(comment.id, taskId, user.id, comment.body)
    .run();

  const task = await env.DB.prepare("SELECT project_id, title FROM tasks WHERE id = ?").bind(taskId).first<{ project_id: string; title: string }>();
  if (task) {
    await notifyProject(env, task.project_id, {
      title: "Task comment added",
      body: `${user.name} commented on ${task.title}.`,
      source: "app"
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
  const projectId = env.DB && repositoryFullName ? await findProjectIdForGitHubRepository(env, repositoryFullName) : null;
  const eventId = crypto.randomUUID();

  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO webhook_events (id, project_id, source, event_type, payload_json, status)
       VALUES (?, ?, 'github', ?, ?, 'queued')`
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
    payload
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
    signatureVerified: Boolean(env.GITHUB_WEBHOOK_SECRET)
  };
}

async function processGitHubQueueMessage(env: Env, message: GitHubQueueMessage) {
  if (!env.DB) return;

  const projectId = message.repositoryFullName ? await findProjectIdForGitHubRepository(env, message.repositoryFullName) : null;
  if (!projectId) {
    await markWebhookEventProcessed(env, message.eventId, "no_project_match");
    return;
  }

  if (message.eventName === "issues" && message.payload.issue) {
    await syncGitHubIssue(env, projectId, message.payload);
  } else if (message.eventName === "issue_comment" && message.payload.issue && message.payload.comment) {
    await syncGitHubIssueComment(env, message.payload);
  } else if (message.eventName === "pull_request" && message.payload.pull_request) {
    await syncGitHubPullRequest(env, message.payload);
  }

  await markWebhookEventProcessed(env, message.eventId, "processed");
}

async function syncGitHubIssue(env: Env, projectId: string, payload: GitHubWebhookPayload) {
  if (!env.DB || !payload.issue) return;

  const issue = payload.issue;
  const issueUrl = issue.html_url || "";
  const status: TaskStatus = issue.state === "closed" ? "done" : "todo";
  const title = issue.title || `GitHub Issue #${issue.number || ""}`.trim();
  const description = issue.body || issueUrl;
  const existing = await env.DB.prepare("SELECT id FROM tasks WHERE github_issue_url = ? LIMIT 1")
    .bind(issueUrl)
    .first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, source = 'github', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(title, description, status, existing.id)
      .run();
    await notifyProject(env, projectId, {
      title: "GitHub issue updated",
      body: title,
      source: "github"
    });
    return;
  }

  await env.DB.prepare(
    `INSERT INTO tasks (
       id, project_id, title, description, status, priority, progress, source, external_url, github_issue_url
     )
     VALUES (?, ?, ?, ?, ?, 'medium', ?, 'github', ?, ?)`
  )
    .bind(crypto.randomUUID(), projectId, title, description, status, status === "done" ? 100 : 0, issueUrl, issueUrl)
    .run();

  await notifyProject(env, projectId, {
    title: "GitHub issue synced",
    body: title,
    source: "github"
  });
}

async function syncGitHubIssueComment(env: Env, payload: GitHubWebhookPayload) {
  if (!env.DB || !payload.issue || !payload.comment) return;

  const issueUrl = payload.issue.html_url || "";
  const task = await env.DB.prepare("SELECT id FROM tasks WHERE github_issue_url = ? LIMIT 1")
    .bind(issueUrl)
    .first<{ id: string }>();
  if (!task) return;

  const author = payload.comment.user?.login || payload.sender?.login || "github";
  await env.DB.prepare(
    `INSERT INTO task_comments (id, task_id, author_user_id, body)
     VALUES (?, ?, NULL, ?)`
  )
    .bind(crypto.randomUUID(), task.id, `[GitHub:${author}] ${payload.comment.body || ""}`)
    .run();

  const project = await env.DB.prepare("SELECT project_id, title FROM tasks WHERE id = ?").bind(task.id).first<{ project_id: string; title: string }>();
  if (project) {
    await notifyProject(env, project.project_id, {
      title: "GitHub comment synced",
      body: `${author} commented on ${project.title}.`,
      source: "github"
    });
  }
}

async function syncGitHubPullRequest(env: Env, payload: GitHubWebhookPayload) {
  if (!env.DB || !payload.pull_request) return;

  const linkedIssueUrls = extractGitHubIssueUrls(payload.pull_request.body || "");
  if (!linkedIssueUrls.length) return;

  const status: TaskStatus = payload.pull_request.merged || payload.pull_request.state === "closed" ? "done" : "review";
  const progress = status === "done" ? 100 : 70;

  for (const issueUrl of linkedIssueUrls) {
    await env.DB.prepare(
      `UPDATE tasks
       SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
       WHERE github_issue_url = ?`
    )
      .bind(status, progress, issueUrl)
      .run();

    const task = await env.DB.prepare("SELECT project_id, title FROM tasks WHERE github_issue_url = ?").bind(issueUrl).first<{ project_id: string; title: string }>();
    if (task) {
      await notifyProject(env, task.project_id, {
        title: "GitHub PR updated linked task",
        body: `${task.title} moved to ${statusLabels[status]}.`,
        source: "github"
      });
    }
  }
}

async function notifyProject(env: Env, projectId: string, input: { title: string; body: string; source: string }) {
  if (!env.DB) return;

  const notificationId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO notifications (id, project_id, title, body, source)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(notificationId, projectId, input.title, input.body, input.source)
    .run();

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM notification_channels
     WHERE project_id = ? AND enabled = 1`
  )
    .bind(projectId)
    .all<NotificationChannel>();

  await Promise.all(results.map((channel) => sendNotificationChannel(channel, input)));
}

async function sendNotificationChannel(channel: NotificationChannel, input: { title: string; body: string; source: string }) {
  const payload = {
    text: `${input.title}: ${input.body}`,
    title: input.title,
    body: input.body,
    source: input.source,
    projectflare: true
  };

  try {
    await fetch(channel.target_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
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
     LIMIT 1`
  )
    .bind(owner, name)
    .first<{ project_id: string | null }>();

  return repo?.project_id || null;
}

async function markWebhookEventProcessed(env: Env, eventId: string, status: string) {
  if (!env.DB) return;

  await env.DB.prepare(
    `UPDATE webhook_events
     SET status = ?, processed_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(status, eventId)
    .run();
}

async function handleGenericWebhook(request: Request, env: Env, projectId: string) {
  const endpoint = env.DB ? await findWebhookEndpoint(env, projectId) : null;
  if (endpoint) {
    if (!endpoint.enabled) return jsonError("webhook_endpoint_disabled", 403);
    const token = bearerTokenFromRequest(request);
    if (!token || (await sha256Hex(token)) !== endpoint.secret_hash) {
      return jsonError("invalid_webhook_token", 401);
    }
    projectId = endpoint.project_id;
  }

  const payload = await request.json<Record<string, unknown>>();
  const mapping = parseWebhookMapping(endpoint?.mapping_json || null);
  const task = normalizeIncomingTask(projectId, {
    title: stringFrom(payload.title) ?? "Untitled webhook task",
    description: stringFrom(payload.description),
    priority: normalizePriority(stringFrom(payload.priority) || mapping.defaultPriority),
    due_on: stringFrom(payload.dueDate) ?? stringFrom(payload.due_on),
    source: stringFrom(payload.source) ?? mapping.source,
    external_url: stringFrom(payload.externalUrl) ?? stringFrom(payload.external_url)
  });

  if (env.DB) {
    const eventId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO webhook_events (id, project_id, source, event_type, payload_json)
         VALUES (?, ?, ?, 'generic.task.create', ?)`
      ).bind(eventId, projectId, task.source, JSON.stringify({ endpointId: endpoint?.id || null, payload })),
      env.DB.prepare(
        `INSERT INTO tasks (
           id, project_id, title, description, status, priority, starts_on, due_on,
           progress, source, external_url, github_issue_url, backlog_issue_url
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        task.id,
        task.project_id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.starts_on,
        task.due_on,
        task.progress,
        task.source,
        task.external_url,
        null,
        null
      )
    ]);
  }

  if (env.PROJECTFLARE_QUEUE) {
    await env.PROJECTFLARE_QUEUE.send({
      type: "generic.task.created",
      projectId,
      taskId: task.id,
      source: task.source
    });
  } else {
    await notifyProject(env, projectId, {
      title: "Webhook task created",
      body: `${task.title} was created from ${task.source || "generic webhook"}.`,
      source: "generic_webhook"
    });
  }

  return { accepted: true, task };
}

async function findWebhookEndpoint(env: Env, endpointOrProjectId: string): Promise<WebhookEndpoint | null> {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT *
     FROM webhook_endpoints
     WHERE id = ?
     LIMIT 1`
  )
    .bind(endpointOrProjectId)
    .first<WebhookEndpoint>();
}

function bearerTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-projectflare-token");
}

function parseWebhookMapping(mappingJson: string | null): { source: string; defaultPriority: Task["priority"] } {
  if (!mappingJson) return { source: "generic_webhook", defaultPriority: "medium" };

  try {
    const parsed = JSON.parse(mappingJson) as { source?: string; defaultPriority?: string };
    return {
      source: parsed.source || "generic_webhook",
      defaultPriority: normalizePriority(parsed.defaultPriority)
    };
  } catch {
    return { source: "generic_webhook", defaultPriority: "medium" };
  }
}

function normalizeIncomingTask(projectId: string, body: Partial<Task> & { dueDate?: string }): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    project_id: projectId,
    title: body.title?.trim() || "Untitled task",
    description: body.description || null,
    status: body.status && body.status in statusLabels ? body.status : "todo",
    priority: normalizePriority(body.priority),
    assignee_user_id: body.assignee_user_id || null,
    starts_on: body.starts_on || null,
    due_on: body.due_on || body.dueDate || null,
    progress: clamp(body.progress ?? 0, 0, 100),
    source: body.source || "app",
    external_url: body.external_url || null,
    github_issue_url: body.github_issue_url || null,
    backlog_issue_url: body.backlog_issue_url || null,
    created_at: now,
    updated_at: now
  };
}

function normalizePriority(value: unknown): Task["priority"] {
  return value === "low" || value === "medium" || value === "high" || value === "urgent" ? value : "medium";
}

function createApiToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `pfl_${arrayBufferToHex(bytes.buffer)}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return arrayBufferToHex(digest);
}

async function verifyGitHubSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = `sha256=${arrayBufferToHex(digest)}`;
  return timingSafeEqual(expected, signature);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function repositoryFullNameFromPayload(payload: GitHubWebhookPayload): string | null {
  const owner = payload.repository?.owner?.login;
  const name = payload.repository?.name;
  return owner && name ? `${owner}/${name}` : null;
}

function extractGitHubIssueUrls(text: string): string[] {
  const matches = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/\d+/g);
  return [...new Set(matches || [])];
}

function jsonError(error: string, status: number): Response {
  return json({ error }, status);
}

function json(data: unknown, status = 200): Response {
  if (data instanceof Response) return data;
  return new Response(JSON.stringify(data, null, 2), { status, headers: jsonHeaders });
}

function htmlResponse(markup: string): Response {
  return new Response(markup, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
      updated_at: new Date().toISOString()
    }
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
      github_repository_url: "https://github.com/example/projectflare"
    }
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
      updated_at: now
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
      updated_at: now
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
      updated_at: now
    }
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
      updated_at: now
    }
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
      created_at: now
    },
    {
      task_id: "tsk_webhooks",
      depends_on_task_id: "tsk_schema",
      task_title: "Accept generic webhook tasks",
      depends_on_title: "Design D1 schema",
      created_at: now
    }
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
      updated_at: now
    }
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
      created_at: new Date().toISOString()
    }
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
      updated_at: now
    }
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
      updated_at: now
    }
  ];
}

function renderApp(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProjectFlare</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #20231f;
      --muted: #6c6f68;
      --line: #d7d8cf;
      --paper: #f6f3e8;
      --panel: #fffdf4;
      --field: #ebe7d9;
      --green: #2f6b4f;
      --blue: #315c7b;
      --red: #aa3e2d;
      --gold: #bb7a24;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(rgba(32, 35, 31, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(32, 35, 31, 0.035) 1px, transparent 1px),
        var(--paper);
      background-size: 32px 32px;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
    }

    button, input, textarea, select {
      font: inherit;
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 256px minmax(0, 1fr);
    }

    .rail {
      border-right: 1px solid var(--line);
      background: rgba(255, 253, 244, 0.76);
      padding: 24px 18px;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 22px;
    }

    .flare {
      width: 24px;
      height: 24px;
      border: 2px solid var(--ink);
      background: var(--gold);
      transform: rotate(12deg);
      box-shadow: 4px 4px 0 var(--ink);
    }

    .rail small {
      color: var(--muted);
      display: block;
      margin: 10px 0 28px;
      line-height: 1.45;
    }

    .nav {
      display: grid;
      gap: 8px;
    }

    .nav a {
      color: var(--ink);
      text-decoration: none;
      padding: 9px 10px;
      border: 1px solid transparent;
    }

    .nav a.active {
      border-color: var(--ink);
      background: var(--panel);
      box-shadow: 3px 3px 0 var(--ink);
    }

    main {
      padding: 24px;
      max-width: 1480px;
      width: 100%;
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
      margin-bottom: 22px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: clamp(34px, 5vw, 74px);
      line-height: 0.9;
      max-width: 780px;
    }

    .subtitle {
      color: var(--muted);
      max-width: 720px;
      line-height: 1.5;
      margin: 0;
    }

    .user {
      min-width: 220px;
      border: 1px solid var(--ink);
      background: var(--panel);
      padding: 12px;
      box-shadow: 4px 4px 0 var(--ink);
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(360px, 0.7fr);
      gap: 18px;
      align-items: start;
    }

    .workspace-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
      gap: 14px;
      align-items: start;
    }

    .project-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .project-button {
      border: 1px solid var(--ink);
      background: var(--panel);
      color: var(--ink);
      min-height: 36px;
      padding: 7px 9px;
      box-shadow: none;
    }

    .project-button[aria-current="true"] {
      background: var(--gold);
      box-shadow: 3px 3px 0 var(--ink);
    }

    .band {
      border-top: 2px solid var(--ink);
      padding-top: 14px;
      margin-top: 18px;
    }

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 20px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .stat {
      border: 1px solid var(--line);
      background: rgba(255, 253, 244, 0.7);
      padding: 12px;
      min-height: 78px;
    }

    .stat b {
      display: block;
      font-size: 30px;
      line-height: 1;
    }

    .task-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--ink);
    }

    th, td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      text-align: left;
    }

    th {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      background: var(--field);
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border: 1px solid var(--ink);
      padding: 3px 7px;
      font-size: 13px;
      background: white;
      white-space: nowrap;
    }

    .status-in_progress { background: #dbe8ef; }
    .status-review { background: #f4e1b8; }
    .status-done { background: #d8ead7; }
    .status-todo { background: #f1eee2; }
    .priority-urgent, .priority-high { border-color: var(--red); color: var(--red); }

    .task-title {
      border: 0;
      background: transparent;
      color: var(--ink);
      min-height: 0;
      padding: 0;
      text-align: left;
      font-weight: 800;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
    }

    .inline-controls {
      display: grid;
      grid-template-columns: minmax(112px, 1fr) 86px;
      gap: 6px;
      min-width: 190px;
    }

    .inline-controls select,
    .inline-controls input {
      min-height: 34px;
      padding: 6px 7px;
      font-size: 13px;
    }

    .progress {
      height: 9px;
      width: 100%;
      border: 1px solid var(--ink);
      background: var(--field);
      margin-top: 6px;
    }

    .progress span {
      display: block;
      height: 100%;
      background: var(--green);
    }

    .timeline {
      display: grid;
      gap: 10px;
      border: 1px solid var(--ink);
      background: var(--panel);
      padding: 12px;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 160px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
    }

    .bar-track {
      height: 28px;
      border: 1px solid var(--line);
      background: repeating-linear-gradient(90deg, #f5f1e4 0 36px, #ebe6d5 36px 37px);
      position: relative;
      overflow: hidden;
    }

    .bar {
      position: absolute;
      top: 4px;
      bottom: 4px;
      min-width: 8px;
      background: var(--blue);
      border: 1px solid var(--ink);
    }

    .dependency-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .dependency {
      border: 1px solid var(--line);
      background: #fffef8;
      padding: 9px;
    }

    .dependency b {
      display: block;
    }

    .side {
      display: grid;
      gap: 18px;
    }

    .panel {
      border: 1px solid var(--ink);
      background: var(--panel);
      padding: 14px;
      box-shadow: 4px 4px 0 rgba(32, 35, 31, 0.25);
    }

    .panel p {
      margin: 6px 0 0;
      color: var(--muted);
      line-height: 1.45;
    }

    form {
      display: grid;
      gap: 10px;
    }

    label {
      display: grid;
      gap: 5px;
      font-size: 13px;
      color: var(--muted);
    }

    input, textarea, select {
      width: 100%;
      border: 1px solid var(--ink);
      background: #fffef8;
      color: var(--ink);
      padding: 9px 10px;
      min-height: 40px;
    }

    textarea {
      min-height: 84px;
      resize: vertical;
    }

    button {
      border: 1px solid var(--ink);
      background: var(--ink);
      color: white;
      min-height: 42px;
      padding: 9px 12px;
      cursor: pointer;
    }

    button:hover {
      background: var(--green);
    }

    .wiki-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0;
      display: grid;
      gap: 8px;
    }

    .wiki-list li {
      border-top: 1px solid var(--line);
      padding-top: 8px;
    }

    .wiki-page-button {
      border: 0;
      background: transparent;
      color: var(--ink);
      min-height: 0;
      padding: 0;
      text-align: left;
      font-weight: 800;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .wiki-editor {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    .wiki-editor textarea {
      min-height: 180px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      line-height: 1.45;
    }

    .markdown-preview {
      border: 1px solid var(--line);
      background: #fffef8;
      padding: 12px;
      min-height: 120px;
      line-height: 1.5;
    }

    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3 {
      margin: 0 0 8px;
      line-height: 1.1;
      text-transform: none;
    }

    .markdown-preview p {
      color: var(--ink);
      margin: 0 0 8px;
    }

    .revision-list {
      display: grid;
      gap: 6px;
      max-height: 160px;
      overflow: auto;
      margin-top: 8px;
    }

    .revision {
      border-top: 1px solid var(--line);
      padding-top: 6px;
    }

    .github-list {
      display: grid;
      gap: 8px;
      margin: 10px 0;
    }

    .github-item {
      border-top: 1px solid var(--line);
      padding-top: 8px;
    }

    .event-list {
      display: grid;
      gap: 6px;
      max-height: 170px;
      overflow: auto;
      margin-top: 8px;
    }

    .event {
      border: 1px solid var(--line);
      background: #fffef8;
      padding: 8px;
    }

    .comment-list {
      display: grid;
      gap: 9px;
      margin: 10px 0;
    }

    .comment {
      border-top: 1px solid var(--line);
      padding-top: 9px;
    }

    .comment small {
      color: var(--muted);
    }

    .empty {
      color: var(--muted);
      font-style: italic;
    }

    @media (max-width: 980px) {
      .shell {
        display: block;
      }

      .rail {
        position: static;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .grid, .stats, .workspace-strip {
        grid-template-columns: 1fr;
      }

      .topbar {
        display: grid;
      }

      .user {
        min-width: 0;
      }
    }

    @media (max-width: 620px) {
      main {
        padding: 16px;
      }

      .task-table, .task-table tbody, .task-table tr, .task-table td {
        display: block;
        width: 100%;
      }

      .task-table thead {
        display: none;
      }

      .task-table tr {
        border-bottom: 1px solid var(--ink);
        padding: 8px 0;
      }

      .bar-row {
        grid-template-columns: 1fr;
        gap: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="rail">
      <div class="brand"><span class="flare"></span>ProjectFlare</div>
      <small>Cloudflareだけで動く、軽量プロジェクト管理OSS。</small>
      <nav class="nav" aria-label="Primary">
        <a class="active" href="#command">Command Center</a>
        <a href="#workspace">Workspace</a>
        <a href="#tasks">Tasks</a>
        <a href="#comments">Comments</a>
        <a href="#gantt">Gantt</a>
        <a href="#wiki">Wiki</a>
        <a href="#github">GitHub</a>
        <a href="#webhooks">Webhooks</a>
      </nav>
    </aside>
    <main id="command">
      <div class="topbar">
        <div>
          <h1 id="project-title">ProjectFlare</h1>
          <p class="subtitle" id="project-copy">Loading project state from D1 or local demo data...</p>
        </div>
        <div class="user" id="user">Checking Access identity...</div>
      </div>

      <section class="band" id="workspace">
        <div class="section-title">
          <h2>Workspace</h2>
          <span class="pill" id="workspace-pill">Loading workspace</span>
        </div>
        <div class="workspace-strip">
          <div>
            <div class="project-list" id="project-list"></div>
          </div>
          <form id="project-form">
            <label>Project name<input name="name" required maxlength="120"></label>
            <label>Description<textarea name="description"></textarea></label>
            <button type="submit">Create Project</button>
          </form>
        </div>
      </section>

      <section class="band">
        <div class="section-title">
          <h2>Project Pulse</h2>
          <span class="pill" id="repo-pill">GitHub not linked</span>
        </div>
        <div class="stats" id="stats"></div>
      </section>

      <div class="grid">
        <section class="band" id="tasks">
          <div class="section-title">
            <h2>Tasks</h2>
            <span class="pill" id="task-count">0 tasks</span>
          </div>
          <table class="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Dates</th>
                <th>Progress</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody id="tasks-body"></tbody>
          </table>

          <section class="band" id="gantt">
            <div class="section-title">
              <h2>Gantt</h2>
              <span class="pill" id="dependency-count">0 dependencies</span>
            </div>
            <div class="timeline" id="timeline"></div>
            <div class="dependency-list" id="dependency-list"></div>
            <form id="dependency-form" class="workspace-strip">
              <label>Task<select name="task_id" id="dependency-task"></select></label>
              <label>Depends on<select name="depends_on_task_id" id="dependency-parent"></select></label>
              <button type="submit">Add Dependency</button>
            </form>
          </section>
        </section>

        <aside class="side">
          <section class="panel">
            <div class="section-title">
              <h2>New Task</h2>
            </div>
            <form id="task-form">
              <label>Title<input name="title" required maxlength="160"></label>
              <label>Description<textarea name="description"></textarea></label>
              <label>Start date<input name="starts_on" type="date"></label>
              <label>Priority
                <select name="priority">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label>Due date<input name="due_on" type="date"></label>
              <button type="submit">Create Task</button>
            </form>
          </section>

          <section class="panel" id="comments">
            <div class="section-title">
              <h2>Comments</h2>
              <span class="pill" id="selected-task-pill">No task</span>
            </div>
            <div id="comment-list" class="comment-list">
              <p class="empty">Select a task to read or add comments.</p>
            </div>
            <form id="comment-form">
              <label>Comment<textarea name="body" required></textarea></label>
              <button type="submit">Add Comment</button>
            </form>
          </section>

          <section class="panel" id="wiki">
            <div class="section-title">
              <h2>Wiki</h2>
              <span class="pill" id="wiki-revision-count">0 revisions</span>
            </div>
            <p>仕様、意思決定、運用メモをタスクとは別に残す場所。</p>
            <ul class="wiki-list" id="wiki-list"></ul>
            <form id="wiki-form" class="wiki-editor">
              <label>Title<input name="title" id="wiki-title" required maxlength="160"></label>
              <label>Slug<input name="slug" id="wiki-slug" required maxlength="160"></label>
              <label>Markdown<textarea name="body_markdown" id="wiki-body" required></textarea></label>
              <button type="submit">Save Wiki Page</button>
            </form>
            <div class="markdown-preview" id="wiki-preview"></div>
            <div class="revision-list" id="wiki-revisions"></div>
          </section>

          <section class="panel" id="github">
            <div class="section-title">
              <h2>GitHub Sync</h2>
              <span class="pill" id="github-event-count">0 events</span>
            </div>
            <p id="github-webhook-url">Loading webhook URL...</p>
            <form id="github-repo-form">
              <label>Owner<input name="owner" required maxlength="120" placeholder="openai"></label>
              <label>Repository<input name="name" required maxlength="120" placeholder="projectflare"></label>
              <label>Repository URL<input name="repository_url" type="url" placeholder="https://github.com/openai/projectflare"></label>
              <button type="submit">Link Repository</button>
            </form>
            <div class="github-list" id="github-repos"></div>
            <div class="event-list" id="github-events"></div>
          </section>

          <section class="panel" id="webhooks">
            <div class="section-title">
              <h2>Webhook Intake</h2>
              <span class="pill" id="notification-count">0 notifications</span>
            </div>
            <p id="webhook-url">Loading endpoint...</p>
            <form id="webhook-endpoint-form">
              <label>Name<input name="name" required maxlength="120" placeholder="Support inbox"></label>
              <label>Source<input name="source" maxlength="80" placeholder="slack"></label>
              <label>Default priority
                <select name="default_priority">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <button type="submit">Create Intake Token</button>
            </form>
            <div class="event-list" id="webhook-endpoints"></div>
            <p id="new-token" class="empty"></p>
            <form id="notification-channel-form">
              <label>Channel name<input name="name" required maxlength="120" placeholder="Ops webhook"></label>
              <label>Type
                <select name="channel_type">
                  <option value="webhook">Webhook</option>
                  <option value="slack">Slack</option>
                  <option value="lark">Lark</option>
                </select>
              </label>
              <label>Target URL<input name="target_url" type="url" required placeholder="https://example.com/webhook"></label>
              <button type="submit">Add Notification Channel</button>
            </form>
            <div class="event-list" id="notification-channels"></div>
            <div class="event-list" id="notifications"></div>
          </section>
        </aside>
      </div>
    </main>
  </div>

  <script>
    const state = {
      me: null,
      workspace: null,
      projects: [],
      project: null,
      tasks: [],
      dependencies: [],
      githubRepos: [],
      githubEvents: [],
      webhookEndpoints: [],
      notificationChannels: [],
      notifications: [],
      wikiPages: [],
      selectedTaskId: null,
      selectedWikiPageId: null
    };
    const statusLabels = ${JSON.stringify(statusLabels)};
    const priorities = ['low', 'medium', 'high', 'urgent'];

    async function boot() {
      const [me, workspaces] = await Promise.all([
        fetchJson('/api/me'),
        fetchJson('/api/workspaces')
      ]);
      state.me = me;
      state.workspace = workspaces[0];
      document.getElementById('user').innerHTML = '<strong>' + escapeHtml(me.name) + '</strong><br><small>' + escapeHtml(me.email) + '</small>';
      document.getElementById('workspace-pill').textContent = state.workspace.name;
      await refreshProjects();
      bindForms();
    }

    async function refreshProjects() {
      state.projects = await fetchJson('/api/workspaces/' + state.workspace.id + '/projects');
      if (!state.project || !state.projects.some((project) => project.id === state.project.id)) {
        state.project = state.projects[0];
      } else {
        state.project = state.projects.find((project) => project.id === state.project.id);
      }
      renderProjects();
      await refreshProject();
    }

    async function selectProject(projectId) {
      state.project = state.projects.find((project) => project.id === projectId);
      state.selectedTaskId = null;
      state.selectedWikiPageId = null;
      renderProjects();
      await refreshProject();
    }

    async function refreshProject() {
      if (!state.project) return;
      document.getElementById('project-title').textContent = state.project.name;
      document.getElementById('project-copy').textContent = state.project.description || 'No project description yet.';
      document.getElementById('repo-pill').textContent = state.project.github_repository_url ? 'GitHub linked' : 'GitHub not linked';
      document.getElementById('webhook-url').textContent = location.origin + '/api/webhooks/generic/' + state.project.id;
      document.getElementById('github-webhook-url').textContent = location.origin + '/api/github/webhook';
      const [tasks, dependencies, wiki] = await Promise.all([
        fetchJson('/api/projects/' + state.project.id + '/tasks'),
        fetchJson('/api/projects/' + state.project.id + '/dependencies'),
        fetchJson('/api/projects/' + state.project.id + '/wiki')
      ]);
      state.tasks = tasks;
      state.dependencies = dependencies;
      state.wikiPages = wiki;
      if (!state.selectedTaskId && state.tasks[0]) state.selectedTaskId = state.tasks[0].id;
      if (!state.selectedWikiPageId && state.wikiPages[0]) state.selectedWikiPageId = state.wikiPages[0].id;
      renderStats();
      renderTasks();
      renderTimeline();
      renderDependencies();
      await renderWiki();
      await refreshGitHub();
      await refreshPhase4();
      await refreshComments();
    }

    function bindForms() {
      document.getElementById('project-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        await fetch('/api/workspaces/' + state.workspace.id + '/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        event.currentTarget.reset();
        await refreshProjects();
      });

      document.getElementById('task-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        await fetch('/api/projects/' + state.project.id + '/tasks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        event.currentTarget.reset();
        await refreshProject();
      });

      document.getElementById('comment-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!state.selectedTaskId) return;
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        await fetch('/api/tasks/' + state.selectedTaskId + '/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        event.currentTarget.reset();
        await refreshComments();
      });

      document.getElementById('dependency-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        if (!data.task_id || !data.depends_on_task_id || data.task_id === data.depends_on_task_id) return;
        await fetch('/api/tasks/' + data.task_id + '/dependencies', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ depends_on_task_id: data.depends_on_task_id })
        });
        await refreshProject();
      });

      document.getElementById('github-repo-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        data.project_id = state.project.id;
        await fetch('/api/workspaces/' + state.workspace.id + '/github/repositories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        event.currentTarget.reset();
        await refreshGitHub();
      });

      document.getElementById('webhook-endpoint-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const endpoint = await fetchJson('/api/projects/' + state.project.id + '/webhook-endpoints', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        document.getElementById('new-token').textContent = 'New token: ' + endpoint.token + ' / ' + endpoint.endpoint_url;
        event.currentTarget.reset();
        await refreshPhase4();
      });

      document.getElementById('notification-channel-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        await fetch('/api/projects/' + state.project.id + '/notification-channels', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        event.currentTarget.reset();
        await refreshPhase4();
      });

      document.getElementById('wiki-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        const path = state.selectedWikiPageId ? '/api/wiki/' + state.selectedWikiPageId : '/api/projects/' + state.project.id + '/wiki';
        const method = state.selectedWikiPageId ? 'PATCH' : 'POST';
        const saved = await fetchJson(path, {
          method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        state.selectedWikiPageId = saved.id;
        await refreshProject();
      });

      document.getElementById('wiki-body').addEventListener('input', () => {
        document.getElementById('wiki-preview').innerHTML = markdownToHtml(document.getElementById('wiki-body').value);
      });
    }

    function renderProjects() {
      document.getElementById('project-list').innerHTML = state.projects.map((project) => {
        return '<button class="project-button" type="button" aria-current="' + String(project.id === state.project.id) + '" onclick="selectProject(\\'' + escapeJs(project.id) + '\\')">' +
          escapeHtml(project.name) +
          '</button>';
      }).join('');
    }

    function renderStats() {
      const counts = state.tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});
      const overdue = state.tasks.filter((task) => task.due_on && task.status !== 'done' && new Date(task.due_on) < new Date()).length;
      const stats = [
        ['Open', state.tasks.filter((task) => !['done', 'archived'].includes(task.status)).length],
        ['In Progress', counts.in_progress || 0],
        ['Done', counts.done || 0],
        ['Overdue', overdue]
      ];
      document.getElementById('stats').innerHTML = stats.map(([label, value]) => '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>').join('');
    }

    function renderTasks() {
      document.getElementById('task-count').textContent = state.tasks.length + ' tasks';
      document.getElementById('tasks-body').innerHTML = state.tasks.map((task) => {
        return '<tr>' +
          '<td><button class="task-title" type="button" onclick="selectTask(\\'' + escapeJs(task.id) + '\\')">' + escapeHtml(task.title) + '</button><br><small>' + escapeHtml(task.description || '') + '</small></td>' +
          '<td>' + renderSelect('status-' + task.id, Object.keys(statusLabels), task.status) + '</td>' +
          '<td>' + renderSelect('priority-' + task.id, priorities, task.priority) + '</td>' +
          '<td><small>' + (task.starts_on || '-') + '<br>' + (task.due_on || '-') + '</small></td>' +
          '<td>' + task.progress + '%<div class="progress"><span style="width:' + task.progress + '%"></span></div></td>' +
          '<td><div class="inline-controls"><input id="progress-' + task.id + '" type="number" min="0" max="100" value="' + task.progress + '"><button type="button" onclick="saveTask(\\'' + escapeJs(task.id) + '\\')">Save</button></div></td>' +
        '</tr>';
      }).join('');
    }

    function renderSelect(id, values, selectedValue) {
      return '<select id="' + escapeHtml(id) + '">' + values.map((value) => {
        const label = statusLabels[value] || value;
        return '<option value="' + escapeHtml(value) + '"' + (value === selectedValue ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
      }).join('') + '</select>';
    }

    async function saveTask(taskId) {
      await fetch('/api/tasks/' + taskId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: document.getElementById('status-' + taskId).value,
          priority: document.getElementById('priority-' + taskId).value,
          progress: Number(document.getElementById('progress-' + taskId).value)
        })
      });
      await refreshProject();
    }

    async function selectTask(taskId) {
      state.selectedTaskId = taskId;
      await refreshComments();
    }

    async function refreshComments() {
      const task = state.tasks.find((item) => item.id === state.selectedTaskId);
      document.getElementById('selected-task-pill').textContent = task ? task.title : 'No task';
      if (!task) {
        document.getElementById('comment-list').innerHTML = '<p class="empty">Select a task to read or add comments.</p>';
        return;
      }
      const comments = await fetchJson('/api/tasks/' + task.id + '/comments');
      document.getElementById('comment-list').innerHTML = comments.length
        ? comments.map((comment) => '<article class="comment"><strong>' + escapeHtml(comment.author_name || 'Unknown') + '</strong><br><small>' + escapeHtml(comment.created_at) + '</small><p>' + escapeHtml(comment.body) + '</p></article>').join('')
        : '<p class="empty">No comments yet.</p>';
    }

    async function refreshGitHub() {
      if (!state.workspace || !state.project) return;
      const [repos, events] = await Promise.all([
        fetchJson('/api/workspaces/' + state.workspace.id + '/github/repositories'),
        fetchJson('/api/projects/' + state.project.id + '/github/events')
      ]);
      state.githubRepos = repos;
      state.githubEvents = events;
      renderGitHub();
    }

    function renderGitHub() {
      const linkedRepos = state.githubRepos.filter((repo) => repo.project_id === state.project.id);
      document.getElementById('github-repos').innerHTML = linkedRepos.length
        ? linkedRepos.map((repo) => '<article class="github-item"><strong>' + escapeHtml(repo.owner + '/' + repo.name) + '</strong><br><small>' + escapeHtml(repo.repository_url) + '</small></article>').join('')
        : '<p class="empty">No GitHub repository linked to this project.</p>';

      document.getElementById('github-event-count').textContent = state.githubEvents.length + ' events';
      document.getElementById('github-events').innerHTML = state.githubEvents.length
        ? state.githubEvents.map((event) => '<article class="event"><strong>' + escapeHtml(event.event_type) + '</strong><br><small>' + escapeHtml(event.status) + ' / ' + escapeHtml(event.created_at) + '</small></article>').join('')
        : '<p class="empty">No GitHub webhook events yet.</p>';
    }

    async function refreshPhase4() {
      if (!state.project) return;
      const [endpoints, channels, notifications] = await Promise.all([
        fetchJson('/api/projects/' + state.project.id + '/webhook-endpoints'),
        fetchJson('/api/projects/' + state.project.id + '/notification-channels'),
        fetchJson('/api/projects/' + state.project.id + '/notifications')
      ]);
      state.webhookEndpoints = endpoints;
      state.notificationChannels = channels;
      state.notifications = notifications;
      renderPhase4();
    }

    function renderPhase4() {
      document.getElementById('webhook-endpoints').innerHTML = state.webhookEndpoints.length
        ? state.webhookEndpoints.map((endpoint) => '<article class="event"><strong>' + escapeHtml(endpoint.name) + '</strong><br><small>/api/webhooks/generic/' + escapeHtml(endpoint.id) + '</small></article>').join('')
        : '<p class="empty">No tokenized webhook endpoints yet.</p>';

      document.getElementById('notification-channels').innerHTML = state.notificationChannels.length
        ? state.notificationChannels.map((channel) => '<article class="event"><strong>' + escapeHtml(channel.name) + '</strong><br><small>' + escapeHtml(channel.channel_type) + ' / ' + escapeHtml(channel.target_url) + '</small></article>').join('')
        : '<p class="empty">No notification channels yet.</p>';

      document.getElementById('notification-count').textContent = state.notifications.filter((notification) => !notification.read_at).length + ' unread';
      document.getElementById('notifications').innerHTML = state.notifications.length
        ? state.notifications.map((notification) => '<article class="event"><strong>' + escapeHtml(notification.title) + '</strong><br><small>' + escapeHtml(notification.source) + ' / ' + escapeHtml(notification.created_at) + '</small><p>' + escapeHtml(notification.body) + '</p></article>').join('')
        : '<p class="empty">No app notifications yet.</p>';
    }

    function renderTimeline() {
      const dates = state.tasks.flatMap((task) => [task.starts_on, task.due_on].filter(Boolean)).map((date) => new Date(date).getTime());
      const min = dates.length ? Math.min(...dates) : Date.now();
      const max = dates.length ? Math.max(...dates) : Date.now() + 86400000;
      const span = Math.max(1, max - min);
      document.getElementById('timeline').innerHTML = state.tasks.map((task) => {
        const start = task.starts_on ? new Date(task.starts_on).getTime() : min;
        const end = task.due_on ? new Date(task.due_on).getTime() : start + 86400000;
        const left = Math.max(0, ((start - min) / span) * 100);
        const width = Math.max(4, ((end - start) / span) * 100);
        const dependencyCount = state.dependencies.filter((dependency) => dependency.task_id === task.id).length;
        return '<div class="bar-row"><small>' + escapeHtml(task.title) + (dependencyCount ? ' <- ' + dependencyCount : '') + '</small><div class="bar-track"><span class="bar" style="left:' + left + '%;width:' + width + '%"></span></div></div>';
      }).join('');
    }

    function renderDependencies() {
      document.getElementById('dependency-count').textContent = state.dependencies.length + ' dependencies';
      document.getElementById('dependency-list').innerHTML = state.dependencies.length
        ? state.dependencies.map((dependency) => '<article class="dependency"><small>depends on</small><b>' + escapeHtml(dependency.depends_on_title || dependency.depends_on_task_id) + '</b><small>before</small><b>' + escapeHtml(dependency.task_title || dependency.task_id) + '</b></article>').join('')
        : '<p class="empty">No task dependencies yet.</p>';

      const options = state.tasks.map((task) => '<option value="' + escapeHtml(task.id) + '">' + escapeHtml(task.title) + '</option>').join('');
      document.getElementById('dependency-task').innerHTML = options;
      document.getElementById('dependency-parent').innerHTML = options;
    }

    async function renderWiki() {
      document.getElementById('wiki-list').innerHTML = state.wikiPages.length
        ? state.wikiPages.map((page) => '<li><button class="wiki-page-button" type="button" onclick="selectWikiPage(\\'' + escapeJs(page.id) + '\\')">' + escapeHtml(page.title) + '</button><br><small>/' + escapeHtml(page.slug) + '</small></li>').join('')
        : '<li><small>No wiki pages yet.</small></li>';

      const selected = state.wikiPages.find((page) => page.id === state.selectedWikiPageId) || state.wikiPages[0];
      if (!selected) {
        document.getElementById('wiki-title').value = '';
        document.getElementById('wiki-slug').value = '';
        document.getElementById('wiki-body').value = '';
        document.getElementById('wiki-preview').innerHTML = '';
        document.getElementById('wiki-revisions').innerHTML = '<p class="empty">No revisions yet.</p>';
        document.getElementById('wiki-revision-count').textContent = '0 revisions';
        return;
      }

      state.selectedWikiPageId = selected.id;
      document.getElementById('wiki-title').value = selected.title;
      document.getElementById('wiki-slug').value = selected.slug;
      document.getElementById('wiki-body').value = selected.body_markdown || '';
      document.getElementById('wiki-preview').innerHTML = markdownToHtml(selected.body_markdown || '');
      const revisions = await fetchJson('/api/wiki/' + selected.id + '/revisions');
      document.getElementById('wiki-revision-count').textContent = revisions.length + ' revisions';
      document.getElementById('wiki-revisions').innerHTML = revisions.length
        ? revisions.map((revision) => '<article class="revision"><strong>' + escapeHtml(revision.author_name || 'Unknown') + '</strong><br><small>' + escapeHtml(revision.created_at) + '</small></article>').join('')
        : '<p class="empty">No revisions yet.</p>';
    }

    async function selectWikiPage(pageId) {
      state.selectedWikiPageId = pageId;
      await renderWiki();
    }

    async function fetchJson(path, options) {
      const response = await fetch(path, options);
      if (!response.ok) throw new Error('Request failed: ' + path);
      return response.json();
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function escapeJs(value) {
      return String(value).replaceAll('\\\\', '\\\\\\\\').replaceAll("'", "\\\\'");
    }

    function markdownToHtml(markdown) {
      const lines = String(markdown || '').split('\\n');
      let inList = false;
      const html = [];
      for (const line of lines) {
        const safe = escapeHtml(line);
        if (safe.startsWith('### ')) {
          if (inList) { html.push('</ul>'); inList = false; }
          html.push('<h3>' + safe.slice(4) + '</h3>');
        } else if (safe.startsWith('## ')) {
          if (inList) { html.push('</ul>'); inList = false; }
          html.push('<h2>' + safe.slice(3) + '</h2>');
        } else if (safe.startsWith('# ')) {
          if (inList) { html.push('</ul>'); inList = false; }
          html.push('<h1>' + safe.slice(2) + '</h1>');
        } else if (safe.startsWith('- ')) {
          if (!inList) { html.push('<ul>'); inList = true; }
          html.push('<li>' + safe.slice(2) + '</li>');
        } else if (safe.trim()) {
          if (inList) { html.push('</ul>'); inList = false; }
          html.push('<p>' + safe + '</p>');
        }
      }
      if (inList) html.push('</ul>');
      return html.join('');
    }

    boot().catch((error) => {
      document.body.innerHTML = '<pre>' + escapeHtml(error.stack || error.message) + '</pre>';
    });
  </script>
</body>
</html>`;
}
