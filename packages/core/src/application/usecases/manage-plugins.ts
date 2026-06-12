import { ApplicationError } from "../../domain/errors";
import {
  assertValidPluginId,
  hasCapabilities,
  type InstalledPlugin,
  type PluginDescriptor,
  type PluginHookEvent,
  type PluginInstallInput,
  type PluginRouteInvocation,
  type PluginRouteResult,
} from "../../domain/plugin";
import type { PluginUseCasePorts } from "../../ports/plugins";

export async function listPluginCatalogUseCase(ports: PluginUseCasePorts): Promise<PluginDescriptor[]> {
  return ports.catalog.list();
}

export async function listInstalledPluginsUseCase(
  workspaceId: string,
  ports: PluginUseCasePorts,
): Promise<Array<InstalledPlugin & { descriptor: PluginDescriptor | null }>> {
  const installed = await ports.plugins.listInstalled(workspaceId);
  const catalog = await ports.catalog.list();

  return installed.map((plugin) => ({
    ...plugin,
    descriptor: catalog.find((descriptor) => descriptor.id === plugin.plugin_id) ?? null,
  }));
}

export async function installPluginUseCase(
  input: PluginInstallInput,
  ports: PluginUseCasePorts,
): Promise<InstalledPlugin> {
  try {
    assertValidPluginId(input.pluginId);
  } catch {
    throw new ApplicationError("invalid_plugin_id", 400);
  }
  const descriptor = await ports.catalog.findById(input.pluginId);
  if (!descriptor) throw new ApplicationError("plugin_not_found", 404);
  if (!hasCapabilities(input.approvedCapabilities, descriptor.capabilities)) {
    throw new ApplicationError("plugin_capability_consent_required", 400);
  }

  const installed = await ports.plugins.install({
    workspaceId: input.workspaceId,
    pluginId: descriptor.id,
    version: descriptor.version,
    approvedCapabilities: input.approvedCapabilities,
    settings: input.settings ?? null,
  });

  await ports.runtime.dispatchHook(descriptor, installed, {
    name: "plugin:install",
    workspaceId: input.workspaceId,
    pluginId: descriptor.id,
  });

  if (installed.enabled) {
    await ports.runtime.dispatchHook(descriptor, installed, {
      name: "plugin:activate",
      workspaceId: input.workspaceId,
      pluginId: descriptor.id,
    });
  }

  return installed;
}

export async function setPluginEnabledUseCase(
  workspaceId: string,
  pluginId: string,
  enabled: boolean,
  ports: PluginUseCasePorts,
): Promise<InstalledPlugin> {
  try {
    assertValidPluginId(pluginId);
  } catch {
    throw new ApplicationError("invalid_plugin_id", 400);
  }
  const descriptor = await ports.catalog.findById(pluginId);
  if (!descriptor) throw new ApplicationError("plugin_not_found", 404);
  const existing = await ports.plugins.findInstalled(workspaceId, pluginId);
  if (!existing) throw new ApplicationError("plugin_not_installed", 404);

  const installed = await ports.plugins.setEnabled(workspaceId, pluginId, enabled);
  await ports.runtime.dispatchHook(descriptor, installed, {
    name: enabled ? "plugin:activate" : "plugin:deactivate",
    workspaceId,
    pluginId,
  });

  return installed;
}

export async function invokePluginRouteUseCase(
  invocation: PluginRouteInvocation,
  ports: PluginUseCasePorts,
): Promise<PluginRouteResult> {
  try {
    assertValidPluginId(invocation.pluginId);
  } catch {
    throw new ApplicationError("invalid_plugin_id", 400);
  }
  const descriptor = await ports.catalog.findById(invocation.pluginId);
  if (!descriptor) throw new ApplicationError("plugin_not_found", 404);

  const route = descriptor.routes?.find(
    (candidate) => candidate.name === invocation.routeName && candidate.method === invocation.method,
  );
  if (!route) throw new ApplicationError("plugin_route_not_found", 404);

  const installed = await ports.plugins.findInstalled(invocation.workspaceId, invocation.pluginId);
  if (!installed?.enabled) throw new ApplicationError("plugin_not_enabled", 403);

  return ports.runtime.invokeRoute(descriptor, installed, invocation);
}

export async function dispatchPluginHookUseCase(event: PluginHookEvent, ports: PluginUseCasePorts): Promise<void> {
  const installed = await ports.plugins.listInstalled(event.workspaceId);
  const enabled = installed.filter((plugin) => plugin.enabled);

  for (const plugin of enabled) {
    const descriptor = await ports.catalog.findById(plugin.plugin_id);
    if (!descriptor?.hooks?.includes(event.name)) continue;
    await ports.runtime.dispatchHook(descriptor, plugin, event);
  }
}
