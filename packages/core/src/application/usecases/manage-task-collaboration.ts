import { ApplicationError } from "../../domain/errors";
import type { TaskComment, TaskDependency } from "../../domain/task-collaboration";
import type { TaskCollaborationUseCasePorts } from "../../ports/task-collaboration";

export async function listProjectDependenciesUseCase(
  projectId: string,
  ports: TaskCollaborationUseCasePorts,
): Promise<TaskDependency[]> {
  return ports.collaboration.listProjectDependencies(projectId);
}

export async function listTaskDependenciesUseCase(
  taskId: string,
  ports: TaskCollaborationUseCasePorts,
): Promise<TaskDependency[]> {
  return ports.collaboration.listTaskDependencies(taskId);
}

export async function createTaskDependencyUseCase(
  input: { taskId: string; dependsOnTaskId?: string | null },
  ports: TaskCollaborationUseCasePorts,
): Promise<TaskDependency> {
  const dependsOnTaskId = input.dependsOnTaskId?.trim();
  if (!dependsOnTaskId) throw new ApplicationError("depends_on_task_id_required", 400);
  if (dependsOnTaskId === input.taskId) throw new ApplicationError("task_cannot_depend_on_itself", 400);

  const dependency: TaskDependency = {
    task_id: input.taskId,
    depends_on_task_id: dependsOnTaskId,
    created_at: ports.clock.now(),
  };

  await ports.collaboration.createDependency(dependency);
  return dependency;
}

export async function listTaskCommentsUseCase(
  taskId: string,
  ports: TaskCollaborationUseCasePorts,
): Promise<TaskComment[]> {
  return ports.collaboration.listComments(taskId);
}

export async function createTaskCommentUseCase(
  input: { taskId: string; authorUserId: string; authorName: string; body?: string | null },
  ports: TaskCollaborationUseCasePorts,
): Promise<{ comment: TaskComment; notificationTarget: { project_id: string; title: string } | null }> {
  const body = input.body?.trim() || "";
  if (!body) throw new ApplicationError("comment_body_required", 400);

  const comment: TaskComment = {
    id: ports.ids.create(),
    task_id: input.taskId,
    author_user_id: input.authorUserId,
    author_name: input.authorName,
    body,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };

  await ports.collaboration.createComment(comment);
  const notificationTarget = await ports.collaboration.findTaskNotificationTarget(input.taskId);
  return { comment, notificationTarget };
}
