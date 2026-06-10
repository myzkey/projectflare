type Env = {
  DB?: D1Database;
  FILES?: R2Bucket;
  PROJECTFLARE_QUEUE?: Queue;
};

type AccessUser = {
  id: string;
  email: string;
  name: string;
  group: string | null;
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
      if (path === "/api/projects") return json(await listProjects(env));
      if (path.match(/^\/api\/projects\/[^/]+\/tasks$/)) {
        const projectId = path.split("/")[3];
        if (request.method === "GET") return json(await listTasks(env, projectId));
        if (request.method === "POST") return json(await createTask(request, env, projectId), 201);
      }
      if (path.match(/^\/api\/projects\/[^/]+\/wiki$/) && request.method === "GET") {
        const projectId = path.split("/")[3];
        return json(await listWikiPages(env, projectId));
      }
      if (path.match(/^\/api\/tasks\/[^/]+$/) && request.method === "PATCH") {
        const taskId = path.split("/")[3];
        return json(await updateTask(request, env, taskId));
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

async function listProjects(env: Env) {
  if (!env.DB) return demoProjects();

  const { results } = await env.DB.prepare(
    `SELECT p.*, w.name AS workspace_name
     FROM projects p
     JOIN workspaces w ON w.id = p.workspace_id
     ORDER BY p.created_at DESC`
  ).all();

  return results.length ? results : demoProjects();
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
  if (!env.DB) {
    return [
      {
        id: "wiki_overview",
        project_id: projectId,
        title: "MVP Scope",
        slug: "mvp-scope",
        updated_at: new Date().toISOString()
      }
    ];
  }

  const { results } = await env.DB.prepare(
    `SELECT id, project_id, title, slug, updated_at
     FROM wiki_pages
     WHERE project_id = ?
     ORDER BY updated_at DESC`
  )
    .bind(projectId)
    .all();

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
  const progress = typeof body.progress === "number" ? clamp(body.progress, 0, 100) : undefined;

  if (!env.DB) return { id: taskId, status: allowedStatus, progress };

  const existing = await env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(taskId).first<Task>();
  if (!existing) return { error: "task_not_found" };

  await env.DB.prepare(
    `UPDATE tasks
     SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(allowedStatus ?? existing.status, progress ?? existing.progress, taskId)
    .run();

  return env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(taskId).first<Task>();
}

async function handleGenericWebhook(request: Request, env: Env, projectId: string) {
  const payload = await request.json<Record<string, unknown>>();
  const task = normalizeIncomingTask(projectId, {
    title: stringFrom(payload.title) ?? "Untitled webhook task",
    description: stringFrom(payload.description),
    priority: normalizePriority(stringFrom(payload.priority)),
    due_on: stringFrom(payload.dueDate) ?? stringFrom(payload.due_on),
    source: stringFrom(payload.source) ?? "generic_webhook",
    external_url: stringFrom(payload.externalUrl) ?? stringFrom(payload.external_url)
  });

  if (env.DB) {
    const eventId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO webhook_events (id, project_id, source, event_type, payload_json)
         VALUES (?, ?, ?, 'generic.task.create', ?)`
      ).bind(eventId, projectId, task.source, JSON.stringify(payload)),
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
  }

  return { accepted: true, task };
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

function json(data: unknown, status = 200): Response {
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

      .grid, .stats {
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
        <a href="#tasks">Tasks</a>
        <a href="#gantt">Gantt</a>
        <a href="#wiki">Wiki</a>
        <a href="#webhooks">Webhooks</a>
      </nav>
    </aside>
    <main id="command">
      <div class="topbar">
        <div>
          <h1>Cloudflare Native MVP</h1>
          <p class="subtitle" id="project-copy">Loading project state from D1 or local demo data...</p>
        </div>
        <div class="user" id="user">Checking Access identity...</div>
      </div>

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
              </tr>
            </thead>
            <tbody id="tasks-body"></tbody>
          </table>

          <section class="band" id="gantt">
            <div class="section-title">
              <h2>Gantt</h2>
              <span class="pill">MVP timeline</span>
            </div>
            <div class="timeline" id="timeline"></div>
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

          <section class="panel" id="wiki">
            <div class="section-title">
              <h2>Wiki</h2>
              <span class="pill">Markdown</span>
            </div>
            <p>仕様、意思決定、運用メモをタスクとは別に残す場所。</p>
            <ul class="wiki-list" id="wiki-list"></ul>
          </section>

          <section class="panel" id="webhooks">
            <div class="section-title">
              <h2>Webhook Intake</h2>
              <span class="pill">JSON</span>
            </div>
            <p id="webhook-url">Loading endpoint...</p>
          </section>
        </aside>
      </div>
    </main>
  </div>

  <script>
    const state = { project: null, tasks: [] };
    const statusLabels = ${JSON.stringify(statusLabels)};

    async function boot() {
      const [me, projects] = await Promise.all([
        fetchJson('/api/me'),
        fetchJson('/api/projects')
      ]);
      state.project = projects[0];
      document.getElementById('user').innerHTML = '<strong>' + escapeHtml(me.name) + '</strong><br><small>' + escapeHtml(me.email) + '</small>';
      document.getElementById('project-copy').textContent = state.project.description || 'No project description yet.';
      document.getElementById('repo-pill').textContent = state.project.github_repository_url ? 'GitHub linked' : 'GitHub not linked';
      document.getElementById('webhook-url').textContent = location.origin + '/api/webhooks/generic/' + state.project.id;
      await refreshProject();
      bindForm();
    }

    async function refreshProject() {
      state.tasks = await fetchJson('/api/projects/' + state.project.id + '/tasks');
      const wiki = await fetchJson('/api/projects/' + state.project.id + '/wiki');
      renderStats();
      renderTasks();
      renderTimeline();
      renderWiki(wiki);
    }

    function bindForm() {
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
          '<td><strong>' + escapeHtml(task.title) + '</strong><br><small>' + escapeHtml(task.description || '') + '</small></td>' +
          '<td><span class="pill status-' + task.status + '">' + statusLabels[task.status] + '</span></td>' +
          '<td><span class="pill priority-' + task.priority + '">' + task.priority + '</span></td>' +
          '<td><small>' + (task.starts_on || '-') + '<br>' + (task.due_on || '-') + '</small></td>' +
          '<td>' + task.progress + '%<div class="progress"><span style="width:' + task.progress + '%"></span></div></td>' +
        '</tr>';
      }).join('');
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
        return '<div class="bar-row"><small>' + escapeHtml(task.title) + '</small><div class="bar-track"><span class="bar" style="left:' + left + '%;width:' + width + '%"></span></div></div>';
      }).join('');
    }

    function renderWiki(pages) {
      document.getElementById('wiki-list').innerHTML = pages.length
        ? pages.map((page) => '<li><strong>' + escapeHtml(page.title) + '</strong><br><small>/' + escapeHtml(page.slug) + '</small></li>').join('')
        : '<li><small>No wiki pages yet.</small></li>';
    }

    async function fetchJson(path) {
      const response = await fetch(path);
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

    boot().catch((error) => {
      document.body.innerHTML = '<pre>' + escapeHtml(error.stack || error.message) + '</pre>';
    });
  </script>
</body>
</html>`;
}
