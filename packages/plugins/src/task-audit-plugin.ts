import { definePlugin } from "../../plugin-api/src";

export const taskAuditPlugin = definePlugin({
  id: "projectflare-task-audit",
  name: "Task Audit Hook",
  version: "0.1.0",
  description: "Records task creation events through the plugin hook pipeline.",
  author: "ProjectFlare",
  entrypoint: "builtin:projectflare-task-audit",
  capabilities: ["hooks.tasks:register", "storage:kv"],
  hooks: ["task:created"],
  storage: [{ name: "events", indexes: ["created_at", "project_id"] }],
  onHook: async (event, context) => {
    if (event.name !== "task:created") return;
    await context.kv.put(`task:${event.taskId}`, event);
  },
});
