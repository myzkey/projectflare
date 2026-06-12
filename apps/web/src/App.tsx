import {
  Bell,
  BookOpenText,
  CheckCircle2,
  GitBranch,
  GitPullRequest,
  LayoutDashboard,
  Link2,
  Loader2,
  MessageSquare,
  PlugZap,
  Plus,
  Power,
  RadioTower,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  detectInitialLocale,
  dictionaries,
  type Locale,
  localeDirections,
  localeNames,
  type Messages,
  supportedLocales,
} from "./i18n";
import type {
  AccessUser,
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
  TaskPriority,
  TaskStatus,
  WebhookEndpoint,
  WikiPage,
  WikiRevision,
  Workspace,
} from "./types";

const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done", "archived"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const tabs = ["overview", "plan", "wiki", "integrations", "plugins"] as const;
type Tab = (typeof tabs)[number];

export function App() {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [me, setMe] = useState<AccessUser | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [wikiRevisions, setWikiRevisions] = useState<WikiRevision[]>([]);
  const [githubRepos, setGitHubRepos] = useState<GitHubRepository[]>([]);
  const [githubEvents, setGitHubEvents] = useState<GitHubEvent[]>([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pluginCatalog, setPluginCatalog] = useState<PluginDescriptor[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [pluginRouteResult, setPluginRouteResult] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedWikiPageId, setSelectedWikiPageId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null;
  const selectedWikiPage = wikiPages.find((page) => page.id === selectedWikiPageId) ?? wikiPages[0] ?? null;
  const selectedTaskIdForLoad = selectedTask?.id ?? null;
  const selectedWikiPageIdForLoad = selectedWikiPage?.id ?? null;
  const messages = dictionaries[locale];

  const stats = useMemo(() => {
    const open = tasks.filter((task) => !["done", "archived"].includes(task.status)).length;
    const review = tasks.filter((task) => task.status === "review").length;
    const done = tasks.filter((task) => task.status === "done").length;
    const overdue = tasks.filter(
      (task) => task.due_on && task.status !== "done" && new Date(task.due_on) < new Date(),
    ).length;
    return { open, review, done, overdue };
  }, [tasks]);

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirections[locale];
    localStorage.setItem("projectflare.locale", locale);
  }, [locale]);

  useEffect(() => {
    if (!selectedTaskIdForLoad) {
      setComments([]);
      return;
    }
    void api
      .comments(selectedTaskIdForLoad)
      .then(setComments)
      .catch((caught) => setError(caught instanceof Error ? caught.message : messages.overview.unknown));
  }, [selectedTaskIdForLoad, messages.overview.unknown]);

  useEffect(() => {
    if (!selectedWikiPageIdForLoad) {
      setWikiRevisions([]);
      return;
    }
    void api
      .wikiRevisions(selectedWikiPageIdForLoad)
      .then(setWikiRevisions)
      .catch((caught) => setError(caught instanceof Error ? caught.message : messages.overview.unknown));
  }, [selectedWikiPageIdForLoad, messages.overview.unknown]);

  async function run(action: () => Promise<void>) {
    try {
      setError(null);
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.overview.unknown);
    }
  }

  async function boot() {
    await run(async () => {
      setLoading(true);
      const [currentUser, workspaces] = await Promise.all([api.me(), api.workspaces()]);
      const firstWorkspace = workspaces[0] ?? null;
      setMe(currentUser);
      setWorkspace(firstWorkspace);
      if (firstWorkspace) {
        const [nextProjects, nextCatalog, nextInstalledPlugins] = await Promise.all([
          api.projects(firstWorkspace.id),
          api.pluginCatalog(),
          api.installedPlugins(firstWorkspace.id),
        ]);
        setProjects(nextProjects);
        setPluginCatalog(nextCatalog);
        setInstalledPlugins(nextInstalledPlugins);
        const firstProject = nextProjects[0] ?? null;
        setProject(firstProject);
        if (firstProject) await refreshProject(firstWorkspace.id, firstProject);
      }
      setLoading(false);
    });
  }

  async function refreshProject(workspaceId = workspace?.id, currentProject = project) {
    if (!workspaceId || !currentProject) return;
    const [
      nextTasks,
      nextDependencies,
      nextWiki,
      nextRepos,
      nextEvents,
      nextEndpoints,
      nextChannels,
      nextNotifications,
    ] = await Promise.all([
      api.tasks(currentProject.id),
      api.projectDependencies(currentProject.id),
      api.wikiPages(currentProject.id),
      api.githubRepositories(workspaceId),
      api.githubEvents(currentProject.id),
      api.webhookEndpoints(currentProject.id),
      api.notificationChannels(currentProject.id),
      api.notifications(currentProject.id),
    ]);

    setTasks(nextTasks);
    setDependencies(nextDependencies);
    setWikiPages(nextWiki);
    setGitHubRepos(nextRepos);
    setGitHubEvents(nextEvents);
    setWebhookEndpoints(nextEndpoints);
    setNotificationChannels(nextChannels);
    setNotifications(nextNotifications);
    setSelectedTaskId((current) =>
      current && nextTasks.some((task) => task.id === current) ? current : (nextTasks[0]?.id ?? null),
    );
    setSelectedWikiPageId((current) =>
      current && nextWiki.some((page) => page.id === current) ? current : (nextWiki[0]?.id ?? null),
    );
    setInstalledPlugins(await api.installedPlugins(workspaceId));
  }

  async function selectProject(projectId: string) {
    const nextProject = projects.find((item) => item.id === projectId) ?? null;
    setProject(nextProject);
    setSelectedTaskId(null);
    setSelectedWikiPageId(null);
    if (workspace && nextProject) await run(async () => refreshProject(workspace.id, nextProject));
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    await run(async () => {
      await api.createProject(workspace.id, body);
      form.reset();
      const nextProjects = await api.projects(workspace.id);
      setProjects(nextProjects);
      const nextProject = nextProjects.at(-1) ?? nextProjects[0] ?? null;
      setProject(nextProject);
      if (nextProject) await refreshProject(workspace.id, nextProject);
    });
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    await run(async () => {
      await api.createTask(project.id, body);
      form.reset();
      await refreshProject();
    });
  }

  async function saveTask(task: Task, patch: Partial<Task>) {
    await run(async () => {
      await api.updateTask(task.id, patch);
      await refreshProject();
    });
  }

  async function createComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") || "");
    await run(async () => {
      await api.createComment(selectedTask.id, body);
      form.reset();
      setComments(await api.comments(selectedTask.id));
    });
  }

  async function createDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!data.task_id || !data.depends_on_task_id || data.task_id === data.depends_on_task_id) return;
    await run(async () => {
      await api.createDependency(String(data.task_id), String(data.depends_on_task_id));
      await refreshProject();
    });
  }

  async function saveWiki(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    await run(async () => {
      const saved = await api.saveWikiPage(project.id, selectedWikiPage?.id ?? null, body);
      setSelectedWikiPageId(saved.id);
      await refreshProject();
    });
  }

  async function createGitHubRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !project) return;
    const form = event.currentTarget;
    const body = { ...Object.fromEntries(new FormData(form).entries()), project_id: project.id };
    await run(async () => {
      await api.createGitHubRepository(workspace.id, body);
      form.reset();
      await refreshProject();
    });
  }

  async function createWebhookEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    await run(async () => {
      const endpoint = await api.createWebhookEndpoint(project.id, body);
      setNotice(
        messages.integrations.newToken(
          endpoint.token ?? messages.integrations.hidden,
          endpoint.endpoint_url ?? `/api/webhooks/generic/${endpoint.id}`,
        ),
      );
      form.reset();
      await refreshProject();
    });
  }

  async function createNotificationChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    await run(async () => {
      await api.createNotificationChannel(project.id, body);
      form.reset();
      await refreshProject();
    });
  }

  async function installPlugin(plugin: PluginDescriptor) {
    if (!workspace) return;
    await run(async () => {
      await api.installPlugin(workspace.id, {
        plugin_id: plugin.id,
        approved_capabilities: plugin.capabilities,
      });
      setInstalledPlugins(await api.installedPlugins(workspace.id));
    });
  }

  async function setPluginEnabled(plugin: InstalledPlugin, enabled: boolean) {
    if (!workspace) return;
    await run(async () => {
      await api.setPluginEnabled(workspace.id, plugin.plugin_id, enabled);
      setInstalledPlugins(await api.installedPlugins(workspace.id));
    });
  }

  async function invokePluginStatus(plugin: InstalledPlugin) {
    if (!workspace) return;
    await run(async () => {
      const result = await api.invokePluginRoute(workspace.id, plugin.plugin_id, "status", {
        projectId: project?.id ?? null,
        requestedAt: new Date().toISOString(),
      });
      setPluginRouteResult(JSON.stringify(result, null, 2));
    });
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" size={32} />
        <span>{messages.loading}</span>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="flare-block" />
          <div>
            <strong>ProjectFlare</strong>
            <small>{messages.appSubtitle}</small>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Primary">
          {tabs.map((item) => (
            <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
              {tabIcon(item)}
              <span>{messages.tabs[item]}</span>
            </button>
          ))}
        </nav>

        <section className="user-strip">
          <small>{messages.signedIn}</small>
          <strong>{me?.name}</strong>
          <span>{me?.email}</span>
        </section>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <small>{workspace?.name ?? messages.noWorkspace}</small>
            <h1>{project?.name ?? messages.createProjectTitle}</h1>
            <p>{project?.description ?? messages.projectFallback}</p>
          </div>
          <div className="top-actions">
            <label className="language-picker">
              <span>{messages.language.label}</span>
              <select
                aria-label={messages.language.label}
                value={locale}
                onChange={(event) => setLocale(event.currentTarget.value as Locale)}
              >
                {supportedLocales.map((localeOption) => (
                  <option key={localeOption} value={localeOption}>
                    {localeNames[localeOption]}
                  </option>
                ))}
              </select>
            </label>
            <span className="signal">
              <Sparkles size={16} />
              {project?.github_repository_url ? messages.githubLinked : messages.ready}
            </span>
            <button type="button" className="icon-button" onClick={() => void run(async () => refreshProject())}>
              <RadioTower size={18} />
            </button>
          </div>
        </header>

        {(error || notice) && (
          <div className={error ? "toast error" : "toast"}>
            {error ?? notice}
            <button type="button" onClick={() => (error ? setError(null) : setNotice(null))}>
              {messages.dismiss}
            </button>
          </div>
        )}

        <div className="project-switcher">
          {projects.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === project?.id ? "active" : ""}
              onClick={() => void selectProject(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <Overview
            stats={stats}
            tasks={tasks}
            selectedTask={selectedTask}
            comments={comments}
            onSelectTask={setSelectedTaskId}
            onSaveTask={saveTask}
            onCreateTask={createTask}
            onCreateProject={createProject}
            onCreateComment={createComment}
            messages={messages}
            locale={locale}
          />
        )}
        {tab === "plan" && (
          <Plan tasks={tasks} dependencies={dependencies} onCreateDependency={createDependency} messages={messages} />
        )}
        {tab === "wiki" && (
          <Wiki
            pages={wikiPages}
            selectedPage={selectedWikiPage}
            revisions={wikiRevisions}
            onSelectPage={setSelectedWikiPageId}
            onSaveWiki={saveWiki}
            messages={messages}
            locale={locale}
          />
        )}
        {tab === "integrations" && project && workspace && (
          <Integrations
            project={project}
            workspace={workspace}
            githubRepos={githubRepos}
            githubEvents={githubEvents}
            webhookEndpoints={webhookEndpoints}
            notificationChannels={notificationChannels}
            notifications={notifications}
            onCreateGitHubRepository={createGitHubRepository}
            onCreateWebhookEndpoint={createWebhookEndpoint}
            onCreateNotificationChannel={createNotificationChannel}
            messages={messages}
            locale={locale}
          />
        )}
        {tab === "plugins" && workspace && (
          <Plugins
            catalog={pluginCatalog}
            installed={installedPlugins}
            routeResult={pluginRouteResult}
            onInstall={installPlugin}
            onSetEnabled={setPluginEnabled}
            onInvokeStatus={invokePluginStatus}
            messages={messages}
            locale={locale}
          />
        )}
      </main>
    </div>
  );
}

function Overview(props: {
  stats: { open: number; review: number; done: number; overdue: number };
  tasks: Task[];
  selectedTask: Task | null;
  comments: TaskComment[];
  onSelectTask(id: string): void;
  onSaveTask(task: Task, patch: Partial<Task>): Promise<void>;
  onCreateTask(event: FormEvent<HTMLFormElement>): Promise<void>;
  onCreateProject(event: FormEvent<HTMLFormElement>): Promise<void>;
  onCreateComment(event: FormEvent<HTMLFormElement>): Promise<void>;
  messages: Messages;
  locale: Locale;
}) {
  const visibleTasks = useMemo(() => flattenTasks(props.tasks), [props.tasks]);
  const categoryNames = useMemo(() => uniqueTaskValues(props.tasks, "category_name"), [props.tasks]);
  const milestoneNames = useMemo(() => uniqueTaskValues(props.tasks, "milestone_name"), [props.tasks]);
  const assigneeNames = useMemo(() => uniqueTaskValues(props.tasks, "assignee_name"), [props.tasks]);

  return (
    <section className="dashboard-grid">
      <div className="stat-band">
        <Metric label={props.messages.metrics.open} value={props.stats.open} />
        <Metric label={props.messages.metrics.review} value={props.stats.review} />
        <Metric label={props.messages.metrics.done} value={props.stats.done} />
        <Metric
          label={props.messages.metrics.overdue}
          value={props.stats.overdue}
          tone={props.stats.overdue ? "hot" : undefined}
        />
      </div>

      <section className="panel task-panel">
        <PanelTitle
          icon={<CheckCircle2 size={18} />}
          title={props.messages.overview.tasks}
          meta={props.messages.overview.taskCount(props.tasks.length)}
        />
        <div className="task-table">
          {visibleTasks.map(({ task, depth }) => (
            <article
              key={task.id}
              className={props.selectedTask?.id === task.id ? "task-row selected" : "task-row"}
              style={{ "--task-depth": depth } as CSSProperties}
            >
              <button type="button" className="task-name" onClick={() => props.onSelectTask(task.id)}>
                <strong>{task.title}</strong>
                <span>{task.description || props.messages.overview.noDescription}</span>
                <TaskChips task={task} />
              </button>
              <select
                defaultValue={task.status}
                onChange={(event) => void props.onSaveTask(task, { status: event.currentTarget.value as TaskStatus })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {props.messages.status[status]}
                  </option>
                ))}
              </select>
              <select
                defaultValue={task.priority}
                onChange={(event) =>
                  void props.onSaveTask(task, { priority: event.currentTarget.value as TaskPriority })
                }
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {props.messages.priority[priority]}
                  </option>
                ))}
              </select>
              <Progress value={task.progress} />
            </article>
          ))}
        </div>
      </section>

      <aside className="panel side-stack">
        <PanelTitle
          icon={<Plus size={18} />}
          title={props.messages.overview.create}
          meta={props.messages.overview.createMeta}
        />
        <form className="form-grid" onSubmit={(event) => void props.onCreateTask(event)}>
          <input name="title" placeholder={props.messages.overview.taskTitle} required />
          <textarea name="description" placeholder={props.messages.overview.description} />
          <input name="category_name" list="task-categories" placeholder={props.messages.overview.category} />
          <datalist id="task-categories">
            {categoryNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <input name="assignee_name" list="task-assignees" placeholder={props.messages.overview.assignee} />
          <datalist id="task-assignees">
            {assigneeNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <select name="parent_task_id" aria-label={props.messages.overview.parentTask} defaultValue="">
            <option value="">{props.messages.overview.rootTask}</option>
            {visibleTasks
              .filter(({ depth }) => depth < 2)
              .map(({ task, depth }) => (
                <option key={task.id} value={task.id}>
                  {"- ".repeat(depth)}
                  {task.title}
                </option>
              ))}
          </select>
          <input name="tags" placeholder={props.messages.overview.tags} />
          <div className="two-col">
            <input name="milestone_name" list="task-milestones" placeholder={props.messages.overview.milestone} />
            <input name="milestone_due_on" type="date" aria-label={props.messages.overview.milestoneDue} />
          </div>
          <datalist id="task-milestones">
            {milestoneNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="two-col">
            <select name="priority" defaultValue="medium">
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {props.messages.priority[priority]}
                </option>
              ))}
            </select>
            <input name="dueDate" type="date" />
          </div>
          <button type="submit">
            <Plus size={16} />
            {props.messages.overview.addTask}
          </button>
        </form>
        <form className="form-grid compact" onSubmit={(event) => void props.onCreateProject(event)}>
          <input name="name" placeholder={props.messages.overview.newProjectName} required />
          <input name="description" placeholder={props.messages.overview.shortDescription} />
          <button type="submit">
            <Plus size={16} />
            {props.messages.overview.addProject}
          </button>
        </form>
      </aside>

      <section className="panel comment-panel">
        <PanelTitle
          icon={<MessageSquare size={18} />}
          title={props.messages.overview.comments}
          meta={props.selectedTask?.title ?? props.messages.overview.noTask}
        />
        <div className="comment-list">
          {props.comments.length ? (
            props.comments.map((comment) => (
              <article key={comment.id} className="comment">
                <strong>{comment.author_name || props.messages.overview.unknown}</strong>
                <small>{formatDate(comment.created_at, props.locale)}</small>
                <p>{comment.body}</p>
              </article>
            ))
          ) : (
            <p className="empty">{props.messages.overview.emptyComments}</p>
          )}
        </div>
        <form className="inline-form" onSubmit={(event) => void props.onCreateComment(event)}>
          <input name="body" placeholder={props.messages.overview.writeComment} required />
          <button type="submit">
            <Send size={16} />
          </button>
        </form>
      </section>
    </section>
  );
}

function TaskChips({ task }: { task: Task }) {
  const chips = [
    task.assignee_name,
    task.category_name,
    task.milestone_name,
    ...task.tags.map((tag) => `#${tag}`),
  ].filter(Boolean);

  if (!chips.length) return null;

  return (
    <span className="task-chips">
      {chips.map((chip) => (
        <small key={chip}>{chip}</small>
      ))}
    </span>
  );
}

function uniqueTaskValues(tasks: Task[], key: "assignee_name" | "category_name" | "milestone_name"): string[] {
  return [...new Set(tasks.map((task) => task[key]?.trim()).filter((value): value is string => Boolean(value)))];
}

function flattenTasks(tasks: Task[]): Array<{ task: Task; depth: number }> {
  const ordered: Array<{ task: Task; depth: number }> = [];
  const byParent = new Map<string | null, Task[]>();

  for (const task of tasks) {
    const siblings = byParent.get(task.parent_task_id) ?? [];
    siblings.push(task);
    byParent.set(task.parent_task_id, siblings);
  }

  const visit = (parentId: string | null, depth: number, seen: Set<string>) => {
    for (const task of byParent.get(parentId) ?? []) {
      if (seen.has(task.id)) continue;
      ordered.push({ task, depth });
      visit(task.id, depth + 1, new Set([...seen, task.id]));
    }
  };

  visit(null, 0, new Set());

  for (const task of tasks) {
    if (!ordered.some((item) => item.task.id === task.id)) ordered.push({ task, depth: 0 });
  }

  return ordered;
}

function Plan(props: {
  tasks: Task[];
  dependencies: TaskDependency[];
  onCreateDependency(event: FormEvent<HTMLFormElement>): Promise<void>;
  messages: Messages;
}) {
  const bounds = timelineBounds(props.tasks);

  return (
    <section className="split-view">
      <section className="panel">
        <PanelTitle
          icon={<GitBranch size={18} />}
          title={props.messages.plan.timeline}
          meta={props.messages.plan.dependencyCount(props.dependencies.length)}
        />
        <div className="timeline">
          {props.tasks.map((task) => {
            const position = timelinePosition(task, bounds);
            return (
              <div key={task.id} className="timeline-row">
                <span>{task.title}</span>
                <div className="timeline-track">
                  <i style={{ left: `${position.left}%`, width: `${position.width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="panel">
        <PanelTitle
          icon={<Link2 size={18} />}
          title={props.messages.plan.dependencies}
          meta={props.messages.plan.planningLinks}
        />
        <form className="form-grid" onSubmit={(event) => void props.onCreateDependency(event)}>
          <select name="task_id">
            {props.tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <select name="depends_on_task_id">
            {props.tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <button type="submit">
            <Link2 size={16} />
            {props.messages.plan.linkTasks}
          </button>
        </form>
        <div className="dependency-list">
          {props.dependencies.map((dependency) => (
            <article key={`${dependency.task_id}-${dependency.depends_on_task_id}`}>
              <small>{props.messages.plan.before}</small>
              <strong>{dependency.task_title || dependency.task_id}</strong>
              <small>{props.messages.plan.needs}</small>
              <strong>{dependency.depends_on_title || dependency.depends_on_task_id}</strong>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}

function Wiki(props: {
  pages: WikiPage[];
  selectedPage: WikiPage | null;
  revisions: WikiRevision[];
  onSelectPage(id: string): void;
  onSaveWiki(event: FormEvent<HTMLFormElement>): Promise<void>;
  messages: Messages;
  locale: Locale;
}) {
  return (
    <section className="wiki-layout">
      <aside className="panel wiki-index">
        <PanelTitle
          icon={<BookOpenText size={18} />}
          title={props.messages.wiki.pages}
          meta={props.messages.wiki.pageCount(props.pages.length)}
        />
        {props.pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={page.id === props.selectedPage?.id ? "active" : ""}
            onClick={() => props.onSelectPage(page.id)}
          >
            <strong>{page.title}</strong>
            <span>/{page.slug}</span>
          </button>
        ))}
      </aside>

      <section className="panel wiki-editor">
        <PanelTitle
          icon={<Save size={18} />}
          title={props.messages.wiki.editor}
          meta={props.messages.wiki.revisionCount(props.revisions.length)}
        />
        <form className="wiki-form" onSubmit={(event) => void props.onSaveWiki(event)}>
          <input
            name="title"
            placeholder={props.messages.wiki.pageTitle}
            defaultValue={props.selectedPage?.title ?? ""}
            required
          />
          <input name="slug" placeholder={props.messages.wiki.slug} defaultValue={props.selectedPage?.slug ?? ""} />
          <textarea
            name="body_markdown"
            placeholder={props.messages.wiki.markdownBody}
            defaultValue={props.selectedPage?.body_markdown ?? ""}
          />
          <button type="submit">
            <Save size={16} />
            {props.messages.wiki.savePage}
          </button>
        </form>
      </section>

      <aside className="panel">
        <PanelTitle
          icon={<BookOpenText size={18} />}
          title={props.messages.wiki.revisions}
          meta={props.messages.wiki.history}
        />
        <div className="event-list">
          {props.revisions.map((revision) => (
            <article key={revision.id}>
              <strong>{revision.author_name || props.messages.wiki.unknown}</strong>
              <small>{formatDate(revision.created_at, props.locale)}</small>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}

function Integrations(props: {
  project: Project;
  workspace: Workspace;
  githubRepos: GitHubRepository[];
  githubEvents: GitHubEvent[];
  webhookEndpoints: WebhookEndpoint[];
  notificationChannels: NotificationChannel[];
  notifications: Notification[];
  onCreateGitHubRepository(event: FormEvent<HTMLFormElement>): Promise<void>;
  onCreateWebhookEndpoint(event: FormEvent<HTMLFormElement>): Promise<void>;
  onCreateNotificationChannel(event: FormEvent<HTMLFormElement>): Promise<void>;
  messages: Messages;
  locale: Locale;
}) {
  const linkedRepos = props.githubRepos.filter((repo) => repo.project_id === props.project.id);

  return (
    <section className="integrations-grid">
      <section className="panel">
        <PanelTitle
          icon={<GitPullRequest size={18} />}
          title="GitHub"
          meta={props.messages.integrations.eventCount(props.githubEvents.length)}
        />
        <form className="form-grid" onSubmit={(event) => void props.onCreateGitHubRepository(event)}>
          <div className="two-col">
            <input name="owner" placeholder={props.messages.integrations.owner} required />
            <input name="name" placeholder={props.messages.integrations.repo} required />
          </div>
          <input name="repository_url" placeholder={props.messages.integrations.repositoryUrl} required />
          <button type="submit">
            <GitPullRequest size={16} />
            {props.messages.integrations.linkRepository}
          </button>
        </form>
        <div className="event-list">
          {linkedRepos.map((repo) => (
            <article key={repo.id}>
              <strong>
                {repo.owner}/{repo.name}
              </strong>
              <small>{repo.repository_url}</small>
            </article>
          ))}
          {props.githubEvents.map((event) => (
            <article key={event.id}>
              <strong>{event.event_type}</strong>
              <small>
                {event.status} / {formatDate(event.created_at, props.locale)}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle
          icon={<RadioTower size={18} />}
          title={props.messages.integrations.genericWebhooks}
          meta={props.messages.integrations.endpointCount(props.webhookEndpoints.length)}
        />
        <form className="form-grid" onSubmit={(event) => void props.onCreateWebhookEndpoint(event)}>
          <input name="name" placeholder={props.messages.integrations.endpointName} required />
          <div className="two-col">
            <input name="source" placeholder={props.messages.integrations.source} />
            <select name="default_priority" defaultValue="medium">
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {props.messages.priority[priority]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">
            <RadioTower size={16} />
            {props.messages.integrations.createEndpoint}
          </button>
        </form>
        <div className="event-list">
          {props.webhookEndpoints.map((endpoint) => (
            <article key={endpoint.id}>
              <strong>{endpoint.name}</strong>
              <small>
                {location.origin}/api/webhooks/generic/{endpoint.id}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle
          icon={<Bell size={18} />}
          title={props.messages.integrations.notifications}
          meta={props.messages.integrations.unreadCount(props.notifications.filter((item) => !item.read_at).length)}
        />
        <form className="form-grid" onSubmit={(event) => void props.onCreateNotificationChannel(event)}>
          <input name="name" placeholder={props.messages.integrations.channelName} required />
          <div className="two-col">
            <select name="channel_type" defaultValue="slack">
              <option value="slack">slack</option>
              <option value="webhook">webhook</option>
              <option value="lark">lark</option>
            </select>
            <input name="target_url" placeholder={props.messages.integrations.slackWebhookUrl} required />
          </div>
          <button type="submit">
            <Bell size={16} />
            {props.messages.integrations.addChannel}
          </button>
        </form>
        <div className="event-list">
          {props.notificationChannels.map((channel) => (
            <article key={channel.id}>
              <strong>{channel.name}</strong>
              <small>
                {channel.channel_type} / {channel.target_url}
              </small>
            </article>
          ))}
          {props.notifications.map((notification) => (
            <article key={notification.id}>
              <strong>{notification.title}</strong>
              <small>
                {notification.source} / {formatDate(notification.created_at, props.locale)}
              </small>
              <p>{notification.body}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function Plugins(props: {
  catalog: PluginDescriptor[];
  installed: InstalledPlugin[];
  routeResult: string | null;
  onInstall(plugin: PluginDescriptor): Promise<void>;
  onSetEnabled(plugin: InstalledPlugin, enabled: boolean): Promise<void>;
  onInvokeStatus(plugin: InstalledPlugin): Promise<void>;
  messages: Messages;
  locale: Locale;
}) {
  const installedById = new Map(props.installed.map((plugin) => [plugin.plugin_id, plugin]));
  const enabledCount = props.installed.filter((plugin) => plugin.enabled).length;

  return (
    <section className="plugins-layout">
      <section className="panel plugin-catalog">
        <PanelTitle
          icon={<PlugZap size={18} />}
          title={props.messages.plugins.catalog}
          meta={props.messages.plugins.availableCount(props.catalog.length)}
        />
        <div className="plugin-list">
          {props.catalog.map((plugin) => {
            const installed = installedById.get(plugin.id);
            return (
              <article key={plugin.id} className={installed?.enabled ? "plugin-card enabled" : "plugin-card"}>
                <div className="plugin-card-main">
                  <div>
                    <strong>{plugin.name}</strong>
                    <small>
                      {plugin.id} / v{plugin.version}
                    </small>
                  </div>
                  <span className={installed ? "plugin-pill installed" : "plugin-pill"}>
                    {installed ? props.messages.plugins.installed : props.messages.plugins.notInstalled}
                  </span>
                </div>
                <p>{plugin.description}</p>
                <CapabilityRail capabilities={plugin.capabilities} messages={props.messages} />
                <div className="plugin-meta-grid">
                  <span>
                    <ShieldCheck size={15} />
                    {props.messages.plugins.hookCount(plugin.hooks?.length ?? 0)}
                  </span>
                  <span>
                    <RadioTower size={15} />
                    {props.messages.plugins.routeCount(plugin.routes?.length ?? 0)}
                  </span>
                  <span>
                    <Save size={15} />
                    {props.messages.plugins.storageCount(plugin.storage?.length ?? 0)}
                  </span>
                </div>
                <div className="plugin-actions">
                  {installed ? (
                    <>
                      <button
                        type="button"
                        className={installed.enabled ? "danger-ghost" : ""}
                        onClick={() => void props.onSetEnabled(installed, !installed.enabled)}
                      >
                        <Power size={16} />
                        {installed.enabled ? props.messages.plugins.disable : props.messages.plugins.enable}
                      </button>
                      {plugin.routes?.some((route) => route.name === "status" && route.method === "POST") && (
                        <button type="button" onClick={() => void props.onInvokeStatus(installed)}>
                          <RadioTower size={16} />
                          {props.messages.plugins.runStatus}
                        </button>
                      )}
                    </>
                  ) : (
                    <button type="button" onClick={() => void props.onInstall(plugin)}>
                      <Plus size={16} />
                      {props.messages.plugins.install}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="panel plugin-console">
        <PanelTitle
          icon={<ShieldCheck size={18} />}
          title={props.messages.plugins.installedPlugins}
          meta={props.messages.plugins.enabledCount(enabledCount)}
        />
        <div className="event-list">
          {props.installed.map((plugin) => (
            <article key={plugin.plugin_id}>
              <strong>{plugin.descriptor?.name ?? plugin.plugin_id}</strong>
              <small>
                {plugin.enabled ? props.messages.plugins.enabled : props.messages.plugins.disabled} /{" "}
                {formatDate(plugin.updated_at, props.locale)}
              </small>
            </article>
          ))}
        </div>
        <div className="route-console">
          <small>{props.messages.plugins.routeResult}</small>
          <pre>{props.routeResult ?? props.messages.plugins.noRouteResult}</pre>
        </div>
      </aside>
    </section>
  );
}

function CapabilityRail(props: { capabilities: string[]; messages: Messages }) {
  return (
    <ul className="capability-rail" aria-label={props.messages.plugins.capabilities}>
      {props.capabilities.map((capability) => (
        <li key={capability}>{capability}</li>
      ))}
    </ul>
  );
}

function Metric(props: { label: string; value: number; tone?: "hot" }) {
  return (
    <article className={props.tone === "hot" ? "metric hot" : "metric"}>
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </article>
  );
}

function PanelTitle(props: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <header className="panel-title">
      <div>
        {props.icon}
        <strong>{props.title}</strong>
      </div>
      <small>{props.meta}</small>
    </header>
  );
}

function Progress(props: { value: number }) {
  return (
    <div className="progress-cell">
      <span>{props.value}%</span>
      <i>
        <b style={{ width: `${props.value}%` }} />
      </i>
    </div>
  );
}

function tabIcon(tab: Tab) {
  if (tab === "overview") return <LayoutDashboard size={17} />;
  if (tab === "plan") return <GitBranch size={17} />;
  if (tab === "wiki") return <BookOpenText size={17} />;
  if (tab === "integrations") return <RadioTower size={17} />;
  return <PlugZap size={17} />;
}

function timelineBounds(tasks: Task[]) {
  const dates = tasks
    .flatMap((task) => [task.starts_on, task.due_on].filter(Boolean))
    .map((date) => new Date(String(date)).getTime());
  const min = dates.length ? Math.min(...dates) : Date.now();
  const max = dates.length ? Math.max(...dates) : Date.now() + 86_400_000;
  return { min, span: Math.max(1, max - min) };
}

function timelinePosition(task: Task, bounds: { min: number; span: number }) {
  const start = task.starts_on ? new Date(task.starts_on).getTime() : bounds.min;
  const end = task.due_on ? new Date(task.due_on).getTime() : start + 86_400_000;
  const left = Math.max(0, ((start - bounds.min) / bounds.span) * 100);
  const width = Math.max(5, ((end - start) / bounds.span) * 100);
  return { left, width };
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
