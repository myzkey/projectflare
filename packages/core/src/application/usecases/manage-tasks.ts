import { ApplicationError } from "../../domain/errors";
import {
  createTask,
  normalizePriority,
  normalizeTags,
  type Task,
  type TaskStatus,
  type TaskStatusDefinition,
  taskStatusLabels,
} from "../../domain/task";
import type { TaskCreateInput, TaskUpdateInput, TaskUseCasePorts } from "../../ports/tasks";

const MAX_TASK_DEPTH = 3;

export async function listProjectTasksUseCase(projectId: string, ports: TaskUseCasePorts): Promise<Task[]> {
  return ports.tasks.listByProjectId(projectId);
}

export async function listTaskStatusesUseCase(
  projectId: string,
  ports: TaskUseCasePorts,
): Promise<TaskStatusDefinition[]> {
  const statuses = await ports.tasks.listStatuses(projectId);
  return statuses.length ? statuses : defaultTaskStatuses(projectId, ports.clock.now());
}

export async function createTaskStatusUseCase(
  input: {
    projectId: string;
    name?: string | null;
    color?: string | null;
    isDone?: boolean | null;
    isArchived?: boolean | null;
  },
  ports: TaskUseCasePorts,
): Promise<TaskStatusDefinition> {
  const statuses = await listTaskStatusesUseCase(input.projectId, ports);
  const status: TaskStatusDefinition = {
    id: ports.ids.create(),
    project_id: input.projectId,
    name: input.name?.trim() || "New status",
    color: normalizeColor(input.color),
    position: statuses.length ? Math.max(...statuses.map((item) => item.position)) + 1 : 1,
    is_done: input.isDone ? 1 : 0,
    is_archived: input.isArchived ? 1 : 0,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };

  await ports.tasks.createStatus(status);
  return status;
}

export async function updateTaskStatusUseCase(
  input: {
    projectId: string;
    statusId: string;
    name?: string | null;
    color?: string | null;
    position?: number | null;
    isDone?: boolean | null;
    isArchived?: boolean | null;
  },
  ports: TaskUseCasePorts,
): Promise<TaskStatusDefinition> {
  const statuses = await listTaskStatusesUseCase(input.projectId, ports);
  const existing = statuses.find((status) => status.id === input.statusId);
  if (!existing) throw new ApplicationError("task_status_not_found", 404);

  await ports.tasks.updateStatus(input.projectId, input.statusId, {
    name: input.name?.trim() || existing.name,
    color: normalizeColor(input.color ?? existing.color),
    position: Math.max(1, Math.round(input.position ?? existing.position)),
    is_done: (input.isDone ?? Boolean(existing.is_done)) ? 1 : 0,
    is_archived: (input.isArchived ?? Boolean(existing.is_archived)) ? 1 : 0,
  });

  const updated = (await listTaskStatusesUseCase(input.projectId, ports)).find(
    (status) => status.id === input.statusId,
  );
  if (!updated) throw new ApplicationError("task_status_not_found", 404);
  return updated;
}

export async function createProjectTaskUseCase(input: TaskCreateInput, ports: TaskUseCasePorts): Promise<Task> {
  const statuses = await listTaskStatusesUseCase(input.projectId, ports);
  const parentTaskId = normalizeParentTaskId(input.parentTaskId);
  if (parentTaskId) {
    const projectTasks = await ports.tasks.listByProjectId(input.projectId);
    validateTaskParent({
      taskId: null,
      projectId: input.projectId,
      parentTaskId,
      projectTasks,
    });
  }

  const task = createTask({
    id: ports.ids.create(),
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    status: normalizeStatus(input.status, statuses),
    priority: input.priority,
    assigneeUserId: input.assigneeUserId,
    startsOn: input.startsOn,
    dueOn: input.dueOn,
    progress: input.progress,
    parentTaskId,
    categoryId: normalizeOptionalId(input.categoryId),
    milestoneId: normalizeOptionalId(input.milestoneId),
    tags: input.tags,
    source: input.source,
    externalUrl: input.externalUrl,
    githubIssueUrl: input.githubIssueUrl,
    backlogIssueUrl: input.backlogIssueUrl,
    now: ports.clock.now(),
  });

  await ports.tasks.create(task);
  return task;
}

export async function updateTaskUseCase(
  taskId: string,
  input: TaskUpdateInput,
  ports: TaskUseCasePorts,
): Promise<Task> {
  const existing = await ports.tasks.findById(taskId);
  if (!existing) throw new ApplicationError("task_not_found", 404);
  const statuses = await listTaskStatusesUseCase(existing.project_id, ports);

  const hasParentUpdate = Object.hasOwn(input, "parentTaskId");
  const hasAssigneeUpdate = Object.hasOwn(input, "assigneeUserId");
  const parentTaskId = hasParentUpdate ? normalizeParentTaskId(input.parentTaskId) : existing.parent_task_id;
  const hasCategoryUpdate = Object.hasOwn(input, "categoryId");
  const hasMilestoneUpdate = Object.hasOwn(input, "milestoneId");
  const hasTagsUpdate = Object.hasOwn(input, "tags");
  if (hasParentUpdate) {
    const projectTasks = await ports.tasks.listByProjectId(existing.project_id);
    validateTaskParent({
      taskId,
      projectId: existing.project_id,
      parentTaskId,
      projectTasks,
    });
  }

  await ports.tasks.update(taskId, {
    title: input.title?.trim() || existing.title,
    description: input.description ?? existing.description,
    status: normalizeStatus(input.status, statuses) ?? existing.status,
    priority: input.priority ? normalizePriority(input.priority) : existing.priority,
    assignee_user_id: hasAssigneeUpdate ? normalizeOptionalId(input.assigneeUserId) : existing.assignee_user_id,
    starts_on: input.startsOn ?? existing.starts_on,
    due_on: input.dueOn ?? existing.due_on,
    progress: clampProgress(input.progress ?? existing.progress),
    parent_task_id: parentTaskId,
    category_id: hasCategoryUpdate ? normalizeOptionalId(input.categoryId) : existing.category_id,
    milestone_id: hasMilestoneUpdate ? normalizeOptionalId(input.milestoneId) : existing.milestone_id,
    tags: hasTagsUpdate ? normalizeTags(input.tags) : existing.tags,
  });

  const updated = await ports.tasks.findById(taskId);
  if (!updated) throw new ApplicationError("task_not_found", 404);
  return updated;
}

function normalizeStatus(value: string | null | undefined, statuses: TaskStatusDefinition[]): TaskStatus | undefined {
  if (value && statuses.some((status) => status.id === value)) return value;
  if (value && value in taskStatusLabels) return value;
  return statuses[0]?.id;
}

function defaultTaskStatuses(projectId: string, now: string): TaskStatusDefinition[] {
  return [
    ["todo", "Todo", "#64748b", 1, 0, 0],
    ["in_progress", "In Progress", "#2563eb", 2, 0, 0],
    ["review", "Review", "#d97706", 3, 0, 0],
    ["done", "Done", "#16a34a", 4, 1, 0],
    ["archived", "Archived", "#6b7280", 5, 0, 1],
  ].map(([id, name, color, position, isDone, isArchived]) => ({
    id: String(id),
    project_id: projectId,
    name: String(name),
    color: String(color),
    position: Number(position),
    is_done: Number(isDone),
    is_archived: Number(isArchived),
    created_at: now,
    updated_at: now,
  }));
}

function normalizeColor(value: string | null | undefined) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? String(value) : "#64748b";
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeParentTaskId(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function validateTaskParent(input: {
  taskId: string | null;
  projectId: string;
  parentTaskId: string | null;
  projectTasks: Task[];
}) {
  if (!input.parentTaskId) {
    ensureDescendantsFitDepth(input.taskId, null, input.projectTasks);
    return;
  }

  if (input.taskId === input.parentTaskId) throw new ApplicationError("task_cannot_parent_itself", 400);

  const parent = input.projectTasks.find((task) => task.id === input.parentTaskId);
  if (!parent) throw new ApplicationError("parent_task_not_found", 404);
  if (parent.project_id !== input.projectId) throw new ApplicationError("parent_task_project_mismatch", 400);

  if (input.taskId && isDescendant(input.parentTaskId, input.taskId, input.projectTasks)) {
    throw new ApplicationError("task_parent_cycle", 400);
  }

  ensureDescendantsFitDepth(input.taskId, input.parentTaskId, input.projectTasks);
}

function ensureDescendantsFitDepth(taskId: string | null, parentTaskId: string | null, tasks: Task[]) {
  const parentDepth = parentTaskId ? depthOf(parentTaskId, tasks) : 0;
  if (parentDepth >= MAX_TASK_DEPTH) throw new ApplicationError("task_nesting_limit_exceeded", 400);

  if (!taskId) return;

  const descendants = descendantTasks(taskId, tasks);
  const deepestDescendantDistance = descendants.reduce(
    (deepest, task) => Math.max(deepest, distanceFromAncestor(task.id, taskId, tasks)),
    0,
  );
  if (parentDepth + 1 + deepestDescendantDistance > MAX_TASK_DEPTH) {
    throw new ApplicationError("task_nesting_limit_exceeded", 400);
  }
}

function depthOf(taskId: string, tasks: Task[]): number {
  let depth = 0;
  let currentId: string | null = taskId;
  const seen = new Set<string>();

  while (currentId) {
    if (seen.has(currentId)) throw new ApplicationError("task_parent_cycle", 400);
    seen.add(currentId);
    const current = tasks.find((task) => task.id === currentId);
    if (!current) throw new ApplicationError("parent_task_not_found", 404);
    depth += 1;
    currentId = current.parent_task_id;
  }

  return depth;
}

function isDescendant(taskId: string, ancestorId: string, tasks: Task[]): boolean {
  let current = tasks.find((task) => task.id === taskId) ?? null;
  const seen = new Set<string>();

  while (current?.parent_task_id) {
    if (current.parent_task_id === ancestorId) return true;
    if (seen.has(current.parent_task_id)) throw new ApplicationError("task_parent_cycle", 400);
    seen.add(current.parent_task_id);
    current = tasks.find((task) => task.id === current?.parent_task_id) ?? null;
  }

  return false;
}

function descendantTasks(taskId: string, tasks: Task[]): Task[] {
  const descendants: Task[] = [];
  const queue = tasks.filter((task) => task.parent_task_id === taskId);

  while (queue.length) {
    const next = queue.shift();
    if (!next) continue;
    descendants.push(next);
    queue.push(...tasks.filter((task) => task.parent_task_id === next.id));
  }

  return descendants;
}

function distanceFromAncestor(taskId: string, ancestorId: string, tasks: Task[]): number {
  let distance = 0;
  let current = tasks.find((task) => task.id === taskId) ?? null;
  const seen = new Set<string>();

  while (current && current.id !== ancestorId) {
    if (seen.has(current.id)) throw new ApplicationError("task_parent_cycle", 400);
    seen.add(current.id);
    distance += 1;
    current = tasks.find((task) => task.id === current?.parent_task_id) ?? null;
  }

  return distance;
}
