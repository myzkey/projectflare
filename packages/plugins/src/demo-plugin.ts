import { definePlugin } from "../../plugin-api/src";

export const demoPlugin = definePlugin({
  id: "projectflare-demo-plugin",
  name: "ProjectFlare Demo Plugin",
  version: "0.1.0",
  description: "A first-party sample plugin that exposes a status route and lifecycle hooks.",
  author: "ProjectFlare",
  entrypoint: "builtin:projectflare-demo-plugin",
  capabilities: ["routes:register", "hooks.lifecycle:register", "storage:kv"],
  hooks: ["plugin:install", "plugin:activate", "plugin:deactivate"],
  routes: [
    {
      name: "status",
      method: "POST",
      description: "Returns plugin runtime status for the current workspace.",
      handler: (_invocation) => ({
        ok: true,
        data: {
          status: "ok",
          runtime: "builtin",
        },
      }),
    },
  ],
  storage: [{ name: "kv", indexes: ["key"] }],
});
