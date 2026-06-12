import {
  Bell,
  BookOpenText,
  CheckCircle2,
  Copy,
  GitBranch,
  GitPullRequest,
  Image,
  Link2,
  MessageSquare,
  PlugZap,
  Plus,
  Power,
  RadioTower,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { type CSSProperties, type FormEvent, lazy, Suspense, useMemo } from "react";
import type { Locale, Messages } from "../../../packages/admin/src/i18n";
import type {
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
  TaskPriority,
  TaskStatus,
  WebhookEndpoint,
  WikiPage,
  WikiRevision,
  Workspace,
} from "../../../packages/admin/src/types";
import {
  CapabilityRail,
  formatDate,
  Metric,
  PanelTitle,
  Progress,
  timelineBounds,
  timelinePosition,
} from "./components";

const MarkdownEditor = lazy(() => import("./MarkdownEditor"));

const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done", "archived"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export type TaskStats = { open: number; review: number; done: number; overdue: number };

export function Overview(props: {
  stats: TaskStats;
  tasks: Task[];
  selectedTask: Task | null;
  comments: TaskComment[];
  attachments: Attachment[];
  onSelectTask(id: string): void;
  onSaveTask(task: Task, patch: Partial<Task>): Promise<void>;
  onCreateTask(event: FormEvent<HTMLFormElement>): Promise<void>;
  onCreateProject(event: FormEvent<HTMLFormElement>): Promise<void>;
  onCreateComment(event: FormEvent<HTMLFormElement>): Promise<void>;
  onUploadAttachment(event: FormEvent<HTMLFormElement>): Promise<void>;
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
          <LazyMarkdownEditor
            name="description"
            placeholder={props.messages.overview.description}
            ariaLabel={props.messages.overview.description}
            compact={true}
          />
          <input name="categoryName" list="task-categories" placeholder={props.messages.overview.category} />
          <datalist id="task-categories">
            {categoryNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <input name="assigneeName" list="task-assignees" placeholder={props.messages.overview.assignee} />
          <datalist id="task-assignees">
            {assigneeNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <select name="parentTaskId" aria-label={props.messages.overview.parentTask} defaultValue="">
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
            <input name="milestoneName" list="task-milestones" placeholder={props.messages.overview.milestone} />
            <input name="milestoneDueOn" type="date" aria-label={props.messages.overview.milestoneDue} />
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
          <LazyMarkdownEditor
            name="body"
            placeholder={props.messages.overview.writeComment}
            ariaLabel={props.messages.overview.writeComment}
            compact={true}
          />
          <button type="submit">
            <Send size={16} />
          </button>
        </form>
      </section>

      <section className="panel attachment-panel">
        <PanelTitle
          icon={<Image size={18} />}
          title={props.messages.overview.attachments}
          meta={props.selectedTask?.title ?? props.messages.overview.noTask}
        />
        <AttachmentGrid attachments={props.attachments} emptyLabel={props.messages.overview.emptyMedia} />
        <form className="inline-form" onSubmit={(event) => void props.onUploadAttachment(event)}>
          <input
            name="file"
            type="file"
            accept="image/*,video/*"
            aria-label={props.messages.overview.mediaFile}
            required
          />
          <button type="submit">
            <Image size={16} />
            {props.messages.overview.uploadMedia}
          </button>
        </form>
      </section>
    </section>
  );
}

export function Plan(props: {
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
          <select name="dependsOnTaskId">
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

export function Wiki(props: {
  pages: WikiPage[];
  selectedPage: WikiPage | null;
  revisions: WikiRevision[];
  attachments: Attachment[];
  onSelectPage(id: string): void;
  onSaveWiki(event: FormEvent<HTMLFormElement>): Promise<void>;
  onUploadAttachment(event: FormEvent<HTMLFormElement>): Promise<void>;
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
          <LazyMarkdownEditor
            key={props.selectedPage?.id ?? "new-wiki-page"}
            name="body_markdown"
            placeholder={props.messages.wiki.markdownBody}
            ariaLabel={props.messages.wiki.markdownBody}
            value={props.selectedPage?.body_markdown ?? ""}
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

      <aside className="panel attachment-panel">
        <PanelTitle
          icon={<Image size={18} />}
          title={props.messages.wiki.attachments}
          meta={props.selectedPage?.title ?? props.messages.overview.noTask}
        />
        <AttachmentGrid
          attachments={props.attachments}
          showMarkdown={true}
          copyLabel={props.messages.wiki.copyMarkdown}
          emptyLabel={props.messages.wiki.emptyMedia}
        />
        <form className="form-grid compact" onSubmit={(event) => void props.onUploadAttachment(event)}>
          <input name="file" type="file" accept="image/*,video/*" aria-label={props.messages.wiki.mediaFile} required />
          <button type="submit">
            <Image size={16} />
            {props.messages.wiki.uploadMedia}
          </button>
        </form>
      </aside>
    </section>
  );
}

export function Integrations(props: {
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
          <input name="repositoryUrl" placeholder={props.messages.integrations.repositoryUrl} required />
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
            <select name="defaultPriority" defaultValue="medium">
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

export function Plugins(props: {
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

function AttachmentGrid(props: {
  attachments: Attachment[];
  showMarkdown?: boolean;
  copyLabel?: string;
  emptyLabel: string;
}) {
  if (!props.attachments.length) return <p className="empty">{props.emptyLabel}</p>;

  return (
    <div className="attachment-grid">
      {props.attachments.map((attachment) => (
        <article key={attachment.id} className="attachment-card">
          <a href={attachment.url} target="_blank" rel="noreferrer">
            {attachment.content_type.startsWith("video/") ? (
              <video src={attachment.url} controls preload="metadata">
                <track kind="captions" />
              </video>
            ) : (
              <img src={attachment.url} alt={attachment.filename} />
            )}
          </a>
          <strong>{attachment.filename}</strong>
          <small>{Math.ceil(attachment.byte_size / 1024)} KB</small>
          {props.showMarkdown && (
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(attachment.markdown)}
              title={attachment.markdown}
            >
              <Copy size={15} />
              {props.copyLabel}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function LazyMarkdownEditor(props: {
  name: string;
  value?: string | null;
  placeholder: string;
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <Suspense fallback={<EditorFallback compact={props.compact} placeholder={props.placeholder} />}>
      <MarkdownEditor {...props} />
    </Suspense>
  );
}

function EditorFallback(props: { compact?: boolean; placeholder: string }) {
  return (
    <div className={props.compact ? "markdown-editor compact loading" : "markdown-editor loading"}>
      <div className="markdown-editor-toolbar" />
      <div className="markdown-editor-input">
        <span className="markdown-editor-loading">{props.placeholder}</span>
      </div>
    </div>
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
