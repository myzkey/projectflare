export type PluginCapability =
  | "tasks:read"
  | "tasks:write"
  | "projects:read"
  | "notifications:write"
  | "webhooks:receive"
  | "network:request"
  | "storage:kv"
  | "hooks.lifecycle:register"
  | "hooks.tasks:register"
  | "routes:register";

export type PluginHookName = "plugin:install" | "plugin:activate" | "plugin:deactivate" | "task:created";

export type PluginRouteMethod = "GET" | "POST";

export type PluginRouteDescriptor = {
  name: string;
  method: PluginRouteMethod;
  description: string;
};

export type PluginStorageCollectionDescriptor = {
  name: string;
  indexes?: string[];
};

export type PluginDescriptor = {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  entrypoint: string;
  capabilities: PluginCapability[];
  hooks?: PluginHookName[];
  routes?: PluginRouteDescriptor[];
  storage?: PluginStorageCollectionDescriptor[];
};

export type InstalledPlugin = {
  workspace_id: string;
  plugin_id: string;
  version: string;
  enabled: number;
  capabilities_json: string;
  settings_json: string | null;
  installed_at: string;
  updated_at: string;
};

export type PluginInstallInput = {
  workspaceId: string;
  pluginId: string;
  approvedCapabilities: PluginCapability[];
  settings?: Record<string, unknown> | null;
};

export type PluginContext = {
  workspaceId: string;
  pluginId: string;
  version: string;
  capabilities: PluginCapability[];
  settings: Record<string, unknown>;
};

export type PluginRouteInvocation = {
  workspaceId: string;
  pluginId: string;
  routeName: string;
  method: PluginRouteMethod;
  input: Record<string, unknown>;
};

export type PluginRouteResult = {
  ok: boolean;
  status?: number;
  data: unknown;
};

export type PluginHookEvent =
  | {
      name: "plugin:install" | "plugin:activate" | "plugin:deactivate";
      workspaceId: string;
      pluginId: string;
    }
  | {
      name: "task:created";
      workspaceId: string;
      pluginId?: string;
      projectId: string;
      taskId: string;
      title: string;
      source: string | null;
    };

export function assertValidPluginId(pluginId: string): void {
  if (!/^(@[a-z0-9][a-z0-9-_.]*\/)?[a-z0-9][a-z0-9-_.]*$/.test(pluginId)) {
    throw new Error("invalid_plugin_id");
  }
}

export function hasCapabilities(
  approvedCapabilities: PluginCapability[],
  requestedCapabilities: PluginCapability[],
): boolean {
  return requestedCapabilities.every((capability) => approvedCapabilities.includes(capability));
}
