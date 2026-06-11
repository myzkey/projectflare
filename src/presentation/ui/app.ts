import { taskStatusLabels } from "../../domain/task";

export function renderApp(): string {
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
    const statusLabels = ${JSON.stringify(taskStatusLabels)};
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
