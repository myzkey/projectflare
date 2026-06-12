import type { TaskComment, TaskDependency } from "../domain/task-collaboration";

export type TaskCollaborationRepository = {
  listProjectDependencies(projectId: string): Promise<TaskDependency[]>;
  listTaskDependencies(taskId: string): Promise<TaskDependency[]>;
  createDependency(dependency: TaskDependency): Promise<void>;
  listComments(taskId: string, options: { limit: number }): Promise<TaskComment[]>;
  createComment(comment: TaskComment): Promise<void>;
  findTaskNotificationTarget(taskId: string): Promise<{ project_id: string; title: string } | null>;
};

export type TaskCollaborationUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  collaboration: TaskCollaborationRepository;
};
