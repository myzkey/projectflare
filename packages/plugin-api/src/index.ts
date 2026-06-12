import type {
  PluginDescriptor,
  PluginHookEvent,
  PluginRouteInvocation,
  PluginRouteResult,
} from "../../core/src/domain/plugin";

export type ProjectFlarePlugin = Omit<PluginDescriptor, "routes"> & {
  routes?: Array<{
    name: string;
    method: "GET" | "POST";
    description: string;
    handler?: (invocation: PluginRouteInvocation) => Promise<PluginRouteResult> | PluginRouteResult;
  }>;
  hooks?: PluginDescriptor["hooks"];
  onHook?: (event: PluginHookEvent, context: ProjectFlarePluginContext) => Promise<void> | void;
};

export type ProjectFlarePluginContext = {
  kv: {
    put(key: string, value: unknown): Promise<void>;
  };
};

export function definePlugin(plugin: ProjectFlarePlugin): ProjectFlarePlugin {
  return plugin;
}
