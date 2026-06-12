import type {
  InstalledPlugin,
  PluginDescriptor,
  PluginHookEvent,
  PluginRouteInvocation,
  PluginRouteResult,
} from "../domain/plugin";

export type PluginRepository = {
  listInstalled(workspaceId: string): Promise<InstalledPlugin[]>;
  findInstalled(workspaceId: string, pluginId: string): Promise<InstalledPlugin | null>;
  install(input: {
    workspaceId: string;
    pluginId: string;
    version: string;
    approvedCapabilities: string[];
    settings: Record<string, unknown> | null;
  }): Promise<InstalledPlugin>;
  setEnabled(workspaceId: string, pluginId: string, enabled: boolean): Promise<InstalledPlugin>;
};

export type PluginRuntime = {
  invokeRoute(
    descriptor: PluginDescriptor,
    plugin: InstalledPlugin,
    invocation: PluginRouteInvocation,
  ): Promise<PluginRouteResult>;
  dispatchHook(descriptor: PluginDescriptor, plugin: InstalledPlugin, event: PluginHookEvent): Promise<void>;
};

export type PluginUseCasePorts = {
  catalog: {
    list(): Promise<PluginDescriptor[]>;
    findById(pluginId: string): Promise<PluginDescriptor | null>;
  };
  plugins: PluginRepository;
  runtime: PluginRuntime;
};
