import type { InstalledPlugin } from "../../../../../core/src/domain/plugin";
import type { PluginRepository } from "../../../../../core/src/ports/plugins";
import type { Env } from "../env";

export function createPluginRepository(env: Env): PluginRepository {
  const findInstalled = async (workspaceId: string, pluginId: string): Promise<InstalledPlugin | null> => {
    if (!env.DB) {
      return demoInstalledPlugins(workspaceId).find((plugin) => plugin.plugin_id === pluginId) ?? null;
    }

    return env.DB.prepare(
      `SELECT *
       FROM installed_plugins
       WHERE workspace_id = ? AND plugin_id = ?`,
    )
      .bind(workspaceId, pluginId)
      .first<InstalledPlugin>();
  };

  return {
    async listInstalled(workspaceId) {
      if (!env.DB) return demoInstalledPlugins(workspaceId);

      const { results } = await env.DB.prepare(
        `SELECT *
         FROM installed_plugins
         WHERE workspace_id = ?
         ORDER BY installed_at DESC`,
      )
        .bind(workspaceId)
        .all<InstalledPlugin>();

      return results;
    },

    findInstalled,

    async install(input) {
      const plugin: InstalledPlugin = {
        workspace_id: input.workspaceId,
        plugin_id: input.pluginId,
        version: input.version,
        enabled: 1,
        capabilities_json: JSON.stringify(input.approvedCapabilities),
        settings_json: input.settings ? JSON.stringify(input.settings) : null,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!env.DB) return plugin;

      await env.DB.prepare(
        `INSERT INTO installed_plugins (
           workspace_id, plugin_id, version, enabled, capabilities_json, settings_json
         )
         VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT(workspace_id, plugin_id) DO UPDATE SET
           version = excluded.version,
           enabled = 1,
           capabilities_json = excluded.capabilities_json,
           settings_json = excluded.settings_json,
           updated_at = CURRENT_TIMESTAMP`,
      )
        .bind(plugin.workspace_id, plugin.plugin_id, plugin.version, plugin.capabilities_json, plugin.settings_json)
        .run();

      const installed = await findInstalled(input.workspaceId, input.pluginId);
      return installed ?? plugin;
    },

    async setEnabled(workspaceId, pluginId, enabled) {
      if (!env.DB) {
        const existing = demoInstalledPlugins(workspaceId).find((plugin) => plugin.plugin_id === pluginId);
        if (!existing) throw new Error("plugin_not_installed");
        return { ...existing, enabled: enabled ? 1 : 0, updated_at: new Date().toISOString() };
      }

      await env.DB.prepare(
        `UPDATE installed_plugins
         SET enabled = ?, updated_at = CURRENT_TIMESTAMP
         WHERE workspace_id = ? AND plugin_id = ?`,
      )
        .bind(enabled ? 1 : 0, workspaceId, pluginId)
        .run();

      const installed = await findInstalled(workspaceId, pluginId);
      if (!installed) throw new Error("plugin_not_installed");
      return installed;
    },
  };
}

function demoInstalledPlugins(workspaceId: string): InstalledPlugin[] {
  return [
    {
      workspace_id: workspaceId,
      plugin_id: "projectflare-demo-plugin",
      version: "0.1.0",
      enabled: 1,
      capabilities_json: JSON.stringify(["routes:register", "hooks.lifecycle:register", "storage:kv"]),
      settings_json: JSON.stringify({ mode: "demo" }),
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}
