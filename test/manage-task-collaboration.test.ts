import { describe, expect, it, vi } from "vitest";
import { listTaskCommentsUseCase } from "../packages/core/src/application/usecases/manage-task-collaboration";
import type { TaskComment } from "../packages/core/src/domain/task-collaboration";
import type { TaskCollaborationUseCasePorts } from "../packages/core/src/ports/task-collaboration";

function createPorts() {
  const comments: TaskComment[] = Array.from({ length: 75 }, (_, index) => ({
    id: `comment_${index}`,
    task_id: "task_1",
    author_user_id: "user_1",
    author_name: "Local",
    body: `Comment ${index}`,
    created_at: `2026-06-11T00:${String(index).padStart(2, "0")}:00.000Z`,
    updated_at: `2026-06-11T00:${String(index).padStart(2, "0")}:00.000Z`,
  }));

  const ports: TaskCollaborationUseCasePorts = {
    ids: { create: vi.fn(() => "comment_new") },
    clock: { now: vi.fn(() => "2026-06-11T00:00:00.000Z") },
    collaboration: {
      listProjectDependencies: vi.fn(async () => []),
      listTaskDependencies: vi.fn(async () => []),
      createDependency: vi.fn(async () => undefined),
      listComments: vi.fn(async (_taskId, options) => comments.slice(0, options.limit)),
      createComment: vi.fn(async () => undefined),
      findTaskNotificationTarget: vi.fn(async () => null),
    },
  };

  return ports;
}

describe("task collaboration use cases", () => {
  it("defaults comment listing to the latest 20 entries", async () => {
    const ports = createPorts();

    const comments = await listTaskCommentsUseCase({ taskId: "task_1" }, ports);

    expect(comments).toHaveLength(20);
    expect(ports.collaboration.listComments).toHaveBeenCalledWith("task_1", { limit: 20 });
  });

  it("caps requested comment listing at 50 entries", async () => {
    const ports = createPorts();

    const comments = await listTaskCommentsUseCase({ taskId: "task_1", limit: 100 }, ports);

    expect(comments).toHaveLength(50);
    expect(ports.collaboration.listComments).toHaveBeenCalledWith("task_1", { limit: 50 });
  });
});
