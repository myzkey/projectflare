import { Loader2, RadioTower, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../../packages/admin/src/api";
import {
  detectInitialLocale,
  dictionaries,
  type Locale,
  localeDirections,
  localeNames,
  supportedLocales,
} from "../../../packages/admin/src/i18n";
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
} from "../../../packages/admin/src/types";
import { type AppTab, tabIcon } from "./components";
import { applyServiceWorkerUpdate, type ServiceWorkerUpdateEvent } from "./pwa";
import { Integrations, Overview, Plan, Plugins, Wiki } from "./views";

const tabs = ["overview", "plan", "wiki", "integrations", "plugins"] as const;
type Tab = AppTab;
const initialCommentLimit = 20;
const expandedCommentLimit = 50;

export function App() {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const [me, setMe] = useState<AccessUser | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusDefinition[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentLimit, setCommentLimit] = useState(initialCommentLimit);
  const [taskAttachments, setTaskAttachments] = useState<Attachment[]>([]);
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [wikiRevisions, setWikiRevisions] = useState<WikiRevision[]>([]);
  const [wikiAttachments, setWikiAttachments] = useState<Attachment[]>([]);
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
  const [isOffline, setIsOffline] = useState(() => (typeof navigator === "undefined" ? false : !navigator.onLine));
  const [serviceWorkerUpdate, setServiceWorkerUpdate] = useState<ServiceWorkerRegistration | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null;
  const selectedWikiPage = wikiPages.find((page) => page.id === selectedWikiPageId) ?? wikiPages[0] ?? null;
  const selectedTaskIdForLoad = selectedTask?.id ?? null;
  const selectedWikiPageIdForLoad = selectedWikiPage?.id ?? null;
  const messages = dictionaries[locale];

  const stats = useMemo(() => {
    const doneStatuses = new Set(taskStatuses.filter((status) => status.is_done).map((status) => status.id));
    const archivedStatuses = new Set(taskStatuses.filter((status) => status.is_archived).map((status) => status.id));
    const reviewStatus = taskStatuses.find((status) => status.id === "review" || /review/i.test(status.name));
    const open = tasks.filter((task) => !doneStatuses.has(task.status) && !archivedStatuses.has(task.status)).length;
    const review = tasks.filter((task) => task.status === reviewStatus?.id).length;
    const done = tasks.filter((task) => doneStatuses.has(task.status)).length;
    const overdue = tasks.filter(
      (task) => task.due_on && !doneStatuses.has(task.status) && new Date(task.due_on) < new Date(),
    ).length;
    return { open, review, done, overdue };
  }, [tasks, taskStatuses]);

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirections[locale];
    localStorage.setItem("projectflare.locale", locale);
  }, [locale]);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    function handleServiceWorkerUpdate(event: ServiceWorkerUpdateEvent) {
      setServiceWorkerUpdate(event.detail);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("projectflare:sw-update", handleServiceWorkerUpdate);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("projectflare:sw-update", handleServiceWorkerUpdate);
    };
  }, []);

  useEffect(() => {
    setCommentLimit(initialCommentLimit);
  }, [selectedTaskIdForLoad]);

  useEffect(() => {
    if (!selectedTaskIdForLoad) {
      setComments([]);
      setTaskAttachments([]);
      return;
    }
    void Promise.all([api.comments(selectedTaskIdForLoad, commentLimit), api.taskAttachments(selectedTaskIdForLoad)])
      .then(([nextComments, nextAttachments]) => {
        setComments(nextComments);
        setTaskAttachments(nextAttachments);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : messages.overview.unknown));
  }, [selectedTaskIdForLoad, commentLimit, messages.overview.unknown]);

  useEffect(() => {
    if (!selectedWikiPageIdForLoad) {
      setWikiRevisions([]);
      setWikiAttachments([]);
      return;
    }
    void Promise.all([api.wikiRevisions(selectedWikiPageIdForLoad), api.wikiAttachments(selectedWikiPageIdForLoad)])
      .then(([nextRevisions, nextAttachments]) => {
        setWikiRevisions(nextRevisions);
        setWikiAttachments(nextAttachments);
      })
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
      nextStatuses,
      nextTasks,
      nextDependencies,
      nextWiki,
      nextRepos,
      nextEvents,
      nextEndpoints,
      nextChannels,
      nextNotifications,
    ] = await Promise.all([
      api.taskStatuses(currentProject.id),
      api.tasks(currentProject.id),
      api.projectDependencies(currentProject.id),
      api.wikiPages(currentProject.id),
      api.githubRepositories(workspaceId),
      api.githubEvents(currentProject.id),
      api.webhookEndpoints(currentProject.id),
      api.notificationChannels(currentProject.id),
      api.notifications(currentProject.id),
    ]);

    setTaskStatuses(nextStatuses);
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

  async function createTaskStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      await api.createTaskStatus(project.id, {
        name: data.get("name"),
        color: data.get("color"),
        isDone: data.get("isDone") === "on",
        isArchived: data.get("isArchived") === "on",
      });
      form.reset();
      await refreshProject();
    });
  }

  async function saveTaskStatus(status: TaskStatusDefinition, patch: Partial<TaskStatusDefinition>) {
    if (!project) return;
    await run(async () => {
      await api.updateTaskStatus(project.id, status.id, patch);
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
      setComments(await api.comments(selectedTask.id, commentLimit));
    });
  }

  async function showMoreComments() {
    setCommentLimit(expandedCommentLimit);
  }

  async function uploadTaskAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      await api.uploadTaskAttachment(selectedTask.id, data);
      form.reset();
      setTaskAttachments(await api.taskAttachments(selectedTask.id));
    });
  }

  async function uploadTaskAttachmentFiles(files: File[]): Promise<string[]> {
    if (!selectedTask) return [];
    try {
      setError(null);
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const data = new FormData();
        data.set("file", file);
        uploaded.push(await api.uploadTaskAttachment(selectedTask.id, data));
      }
      setTaskAttachments(await api.taskAttachments(selectedTask.id));
      return uploaded.map((attachment) => attachment.markdown);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.overview.unknown);
      return [];
    }
  }

  async function createDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!data.task_id || !data.dependsOnTaskId || data.task_id === data.dependsOnTaskId) return;
    await run(async () => {
      await api.createDependency(String(data.task_id), String(data.dependsOnTaskId));
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

  async function uploadWikiAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWikiPage) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      const attachment = await api.uploadWikiAttachment(selectedWikiPage.id, data);
      form.reset();
      setWikiAttachments(await api.wikiAttachments(selectedWikiPage.id));
      setNotice(attachment.markdown);
    });
  }

  async function uploadWikiAttachmentFiles(files: File[]): Promise<string[]> {
    if (!selectedWikiPage) return [];
    try {
      setError(null);
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const data = new FormData();
        data.set("file", file);
        uploaded.push(await api.uploadWikiAttachment(selectedWikiPage.id, data));
      }
      setWikiAttachments(await api.wikiAttachments(selectedWikiPage.id));
      setNotice(uploaded.at(-1)?.markdown ?? null);
      return uploaded.map((attachment) => attachment.markdown);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.overview.unknown);
      return [];
    }
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

        {isOffline && (
          <div className="toast warning" role="status">
            {messages.pwa.offline}
          </div>
        )}

        {serviceWorkerUpdate && (
          <div className="toast" role="status">
            {messages.pwa.updateAvailable}
            <button type="button" onClick={() => applyServiceWorkerUpdate(serviceWorkerUpdate)}>
              {messages.pwa.updateNow}
            </button>
          </div>
        )}

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
            statuses={taskStatuses}
            selectedTask={selectedTask}
            comments={comments}
            attachments={taskAttachments}
            onSelectTask={setSelectedTaskId}
            onSaveTask={saveTask}
            onCreateStatus={createTaskStatus}
            onSaveStatus={saveTaskStatus}
            onCreateTask={createTask}
            onCreateProject={createProject}
            onCreateComment={createComment}
            commentLimit={commentLimit}
            canLoadMoreComments={commentLimit < expandedCommentLimit && comments.length >= commentLimit}
            onLoadMoreComments={showMoreComments}
            onUploadAttachment={uploadTaskAttachment}
            onUploadAttachmentFiles={uploadTaskAttachmentFiles}
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
            attachments={wikiAttachments}
            onSelectPage={setSelectedWikiPageId}
            onSaveWiki={saveWiki}
            onUploadAttachment={uploadWikiAttachment}
            onUploadAttachmentFiles={uploadWikiAttachmentFiles}
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
