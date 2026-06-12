import type {
  InstalledPlugin,
  PluginDescriptor,
  PluginRouteInvocation,
  PluginRouteResult,
} from "../../../../../core/src/domain/plugin";
import type { PluginRuntime } from "../../../../../core/src/ports/plugins";
import type { Env } from "../env";

export const builtInPluginCatalog: PluginDescriptor[] = [
  {
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
      },
    ],
    storage: [{ name: "kv", indexes: ["key"] }],
  },
  {
    id: "projectflare-task-audit",
    name: "Task Audit Hook",
    version: "0.1.0",
    description: "Records task creation events through the plugin hook pipeline.",
    author: "ProjectFlare",
    entrypoint: "builtin:projectflare-task-audit",
    capabilities: ["hooks.tasks:register", "storage:kv"],
    hooks: ["task:created"],
    storage: [{ name: "events", indexes: ["created_at", "project_id"] }],
  },
];

export function createPluginCatalog() {
  return {
    async list(): Promise<PluginDescriptor[]> {
      return builtInPluginCatalog;
    },
    async findById(pluginId: string): Promise<PluginDescriptor | null> {
      return builtInPluginCatalog.find((plugin) => plugin.id === pluginId) ?? null;
    },
  };
}

export function createPluginRuntime(env: Env): PluginRuntime {
  return {
    async invokeRoute(descriptor, plugin, invocation) {
      if (descriptor.entrypoint === "builtin:projectflare-demo-plugin" && invocation.routeName === "status") {
        return demoPluginStatusRoute(descriptor, plugin, invocation);
      }

      return {
        ok: false,
        status: 404,
        data: { error: "plugin_route_not_implemented" },
      };
    },

    async dispatchHook(descriptor, plugin, event) {
      if (!env.DB) return;

      await env.DB.prepare(
        `INSERT INTO plugin_events (
           id, workspace_id, plugin_id, event_name, payload_json
         )
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(crypto.randomUUID(), event.workspaceId, plugin.plugin_id, event.name, JSON.stringify(event))
        .run();

      if (descriptor.entrypoint === "builtin:projectflare-task-audit" && event.name === "task:created") {
        await env.DB.prepare(
          `INSERT INTO plugin_kv (workspace_id, plugin_id, key, value_json)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(workspace_id, plugin_id, key) DO UPDATE SET
             value_json = excluded.value_json,
             updated_at = CURRENT_TIMESTAMP`,
        )
          .bind(event.workspaceId, plugin.plugin_id, `task:${event.taskId}`, JSON.stringify(event))
          .run();
      }
    },
  };
}

function demoPluginStatusRoute(
  descriptor: PluginDescriptor,
  plugin: InstalledPlugin,
  invocation: PluginRouteInvocation,
): PluginRouteResult {
  return {
    ok: true,
    data: {
      plugin: {
        id: descriptor.id,
        name: descriptor.name,
        version: plugin.version,
        enabled: Boolean(plugin.enabled),
      },
      workspaceId: invocation.workspaceId,
      capabilities: JSON.parse(plugin.capabilities_json) as string[],
      input: invocation.input,
    },
  };
}
