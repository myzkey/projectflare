import { ApplicationError } from "../../domain/errors";
import { createTask, normalizePriority, type Task, type TaskStatus, taskStatusLabels } from "../../domain/task";
import type { TaskCreateInput, TaskUpdateInput, TaskUseCasePorts } from "../../ports/tasks";

export async function listProjectTasksUseCase(projectId: string, ports: TaskUseCasePorts): Promise<Task[]> {
  return ports.tasks.listByProjectId(projectId);
}

export async function createProjectTaskUseCase(input: TaskCreateInput, ports: TaskUseCasePorts): Promise<Task> {
  const task = createTask({
    id: ports.ids.create(),
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    status: normalizeStatus(input.status),
    priority: input.priority,
    assigneeUserId: input.assigneeUserId,
    startsOn: input.startsOn,
    dueOn: input.dueOn,
    progress: input.progress,
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

  await ports.tasks.update(taskId, {
    title: input.title?.trim() || existing.title,
    description: input.description ?? existing.description,
    status: normalizeStatus(input.status) ?? existing.status,
    priority: input.priority ? normalizePriority(input.priority) : existing.priority,
    starts_on: input.startsOn ?? existing.starts_on,
    due_on: input.dueOn ?? existing.due_on,
    progress: clampProgress(input.progress ?? existing.progress),
  });

  const updated = await ports.tasks.findById(taskId);
  if (!updated) throw new ApplicationError("task_not_found", 404);
  return updated;
}

function normalizeStatus(value: string | null | undefined): TaskStatus | undefined {
  return value && value in taskStatusLabels ? (value as TaskStatus) : undefined;
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
