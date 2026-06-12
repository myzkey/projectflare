import { describe, expect, it } from "vitest";
import {
  dispatchPluginHookUseCase,
  installPluginUseCase,
  invokePluginRouteUseCase,
  listPluginCatalogUseCase,
  setPluginEnabledUseCase,
} from "../packages/core/src/application/usecases/manage-plugins";
import type { InstalledPlugin, PluginDescriptor } from "../packages/core/src/domain/plugin";
import type { PluginUseCasePorts } from "../packages/core/src/ports/plugins";

const descriptor: PluginDescriptor = {
  id: "sample-plugin",
  name: "Sample Plugin",
  version: "1.0.0",
  description: "Test plugin",
  entrypoint: "test:sample",
  capabilities: ["routes:register"],
  hooks: ["task:created"],
  routes: [{ name: "status", method: "POST", description: "Status route" }],
};

function createPorts() {
  const installed: InstalledPlugin[] = [];
  const hookEvents: string[] = [];
  const ports: PluginUseCasePorts = {
    catalog: {
      async list() {
        return [descriptor];
      },
      async findById(pluginId) {
        return pluginId === descriptor.id ? descriptor : null;
      },
    },
    plugins: {
      async listInstalled() {
        return installed;
      },
      async findInstalled(workspaceId, pluginId) {
        return installed.find((plugin) => plugin.workspace_id === workspaceId && plugin.plugin_id === pluginId) ?? null;
      },
      async install(input) {
        const plugin: InstalledPlugin = {
          workspace_id: input.workspaceId,
          plugin_id: input.pluginId,
          version: input.version,
          enabled: 1,
          capabilities_json: JSON.stringify(input.approvedCapabilities),
          settings_json: input.settings ? JSON.stringify(input.settings) : null,
          installed_at: "2026-06-12T00:00:00.000Z",
          updated_at: "2026-06-12T00:00:00.000Z",
        };
        installed.push(plugin);
        return plugin;
      },
      async setEnabled(workspaceId, pluginId, enabled) {
        const plugin = installed.find(
          (candidate) => candidate.workspace_id === workspaceId && candidate.plugin_id === pluginId,
        );
        if (!plugin) throw new Error("missing");
        plugin.enabled = enabled ? 1 : 0;
        return plugin;
      },
    },
    runtime: {
      async invokeRoute(_descriptor, plugin, invocation) {
        return {
          ok: true,
          data: {
            pluginId: plugin.plugin_id,
            routeName: invocation.routeName,
            input: invocation.input,
          },
        };
      },
      async dispatchHook(_descriptor, _plugin, event) {
        hookEvents.push(event.name);
      },
    },
  };

  return { ports, hookEvents };
}

describe("plugin management use cases", () => {
  it("lists plugin catalog descriptors", async () => {
    const { ports } = createPorts();

    await expect(listPluginCatalogUseCase(ports)).resolves.toEqual([descriptor]);
  });

  it("requires capability consent before install", async () => {
    const { ports } = createPorts();

    await expect(
      installPluginUseCase(
        {
          workspaceId: "ws_demo",
          pluginId: "sample-plugin",
          approvedCapabilities: [],
        },
        ports,
      ),
    ).rejects.toMatchObject({ code: "plugin_capability_consent_required" });
  });

  it("installs plugins and invokes routes through the runtime port", async () => {
    const { ports, hookEvents } = createPorts();

    await installPluginUseCase(
      {
        workspaceId: "ws_demo",
        pluginId: "sample-plugin",
        approvedCapabilities: ["routes:register"],
      },
      ports,
    );

    const routeResult = await invokePluginRouteUseCase(
      {
        workspaceId: "ws_demo",
        pluginId: "sample-plugin",
        routeName: "status",
        method: "POST",
        input: { ping: true },
      },
      ports,
    );

    expect(hookEvents).toEqual(["plugin:install", "plugin:activate"]);
    expect(routeResult).toMatchObject({
      ok: true,
      data: {
        pluginId: "sample-plugin",
        routeName: "status",
        input: { ping: true },
      },
    });
  });

  it("rejects unknown plugins and invalid plugin ids", async () => {
    const { ports } = createPorts();

    await expect(
      installPluginUseCase(
        {
          workspaceId: "ws_demo",
          pluginId: "Missing Plugin!",
          approvedCapabilities: ["routes:register"],
        },
        ports,
      ),
    ).rejects.toMatchObject({ code: "invalid_plugin_id" });

    await expect(
      installPluginUseCase(
        {
          workspaceId: "ws_demo",
          pluginId: "missing-plugin",
          approvedCapabilities: ["routes:register"],
        },
        ports,
      ),
    ).rejects.toMatchObject({ code: "plugin_not_found" });
  });

  it("rejects disabled plugin route invocations and missing routes", async () => {
    const { ports } = createPorts();
    await installPluginUseCase(
      {
        workspaceId: "ws_demo",
        pluginId: "sample-plugin",
        approvedCapabilities: ["routes:register"],
      },
      ports,
    );

    await expect(
      invokePluginRouteUseCase(
        {
          workspaceId: "ws_demo",
          pluginId: "sample-plugin",
          routeName: "missing",
          method: "POST",
          input: {},
        },
        ports,
      ),
    ).rejects.toMatchObject({ code: "plugin_route_not_found" });

    await setPluginEnabledUseCase("ws_demo", "sample-plugin", false, ports);

    await expect(
      invokePluginRouteUseCase(
        {
          workspaceId: "ws_demo",
          pluginId: "sample-plugin",
          routeName: "status",
          method: "POST",
          input: {},
        },
        ports,
      ),
    ).rejects.toMatchObject({ code: "plugin_not_enabled" });
  });

  it("dispatches hooks only to enabled plugins that registered the event", async () => {
    const { ports, hookEvents } = createPorts();
    await installPluginUseCase(
      {
        workspaceId: "ws_demo",
        pluginId: "sample-plugin",
        approvedCapabilities: ["routes:register"],
      },
      ports,
    );

    await dispatchPluginHookUseCase(
      {
        name: "task:created",
        workspaceId: "ws_demo",
        projectId: "project_1",
        taskId: "task_1",
        title: "Hooked task",
        source: "app",
      },
      ports,
    );

    await setPluginEnabledUseCase("ws_demo", "sample-plugin", false, ports);
    await dispatchPluginHookUseCase(
      {
        name: "task:created",
        workspaceId: "ws_demo",
        projectId: "project_1",
        taskId: "task_2",
        title: "Ignored task",
        source: "app",
      },
      ports,
    );

    expect(hookEvents).toEqual(["plugin:install", "plugin:activate", "task:created", "plugin:deactivate"]);
  });
});
