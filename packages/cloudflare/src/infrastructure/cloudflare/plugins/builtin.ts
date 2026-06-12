import type {
  InstalledPlugin,
  PluginDescriptor,
  PluginRouteInvocation,
  PluginRouteResult,
} from "../../../../../core/src/domain/plugin";
import { validatePluginDescriptor } from "../../../../../core/src/domain/plugin";
import type { PluginRuntime } from "../../../../../core/src/ports/plugins";
import type { ProjectFlarePlugin } from "../../../../../plugin-api/src";
import { demoPlugin, taskAuditPlugin } from "../../../../../plugins/src";
import type { Env } from "../env";

export const builtInPlugins: ProjectFlarePlugin[] = [demoPlugin, taskAuditPlugin];

export const builtInPluginCatalog: PluginDescriptor[] = builtInPlugins.map((plugin) => {
  validatePluginDescriptor(plugin);
  return plugin;
});

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
      const firstPartyPlugin = findBuiltInPlugin(descriptor.id);
      const route = firstPartyPlugin?.routes?.find((route) => route.name === invocation.routeName);
      if (route?.handler) {
        const result = await route.handler(invocation);
        if (descriptor.id === "projectflare-demo-plugin" && invocation.routeName === "status" && result.ok) {
          return demoPluginStatusRoute(descriptor, plugin, invocation, result);
        }
        return result;
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
        const firstPartyPlugin = findBuiltInPlugin(descriptor.id);
        await firstPartyPlugin?.onHook?.(event, {
          kv: {
            put: async (key, value) => {
              await env.DB?.prepare(
                `INSERT INTO plugin_kv (workspace_id, plugin_id, key, value_json)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(workspace_id, plugin_id, key) DO UPDATE SET
                   value_json = excluded.value_json,
                   updated_at = CURRENT_TIMESTAMP`,
              )
                .bind(event.workspaceId, plugin.plugin_id, key, JSON.stringify(value))
                .run();
            },
          },
        });
      }
    },
  };
}

function findBuiltInPlugin(pluginId: string): ProjectFlarePlugin | null {
  return builtInPlugins.find((plugin) => plugin.id === pluginId) ?? null;
}

function demoPluginStatusRoute(
  descriptor: PluginDescriptor,
  plugin: InstalledPlugin,
  invocation: PluginRouteInvocation,
  routeResult: PluginRouteResult,
): PluginRouteResult {
  return {
    ok: true,
    data: {
      ...(routeResult.data && typeof routeResult.data === "object" ? routeResult.data : {}),
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
