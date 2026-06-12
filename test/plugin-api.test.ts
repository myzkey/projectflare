import { describe, expect, it } from "vitest";
import { validatePluginDescriptor } from "../packages/core/src/domain/plugin";
import { projectFlareMcpTools } from "../packages/core/src/mcp-api";
import { definePlugin } from "../packages/plugin-api/src";
import { demoPlugin, taskAuditPlugin } from "../packages/plugins/src";

describe("plugin API", () => {
  it("validates first-party plugin descriptors", () => {
    expect(() => validatePluginDescriptor(demoPlugin)).not.toThrow();
    expect(() => validatePluginDescriptor(taskAuditPlugin)).not.toThrow();
  });

  it("rejects route plugins without route capability", () => {
    const plugin = definePlugin({
      id: "missing-route-capability",
      name: "Missing Route Capability",
      version: "0.1.0",
      description: "Invalid route plugin",
      entrypoint: "builtin:invalid",
      capabilities: [],
      routes: [{ name: "status", method: "POST", description: "Status route" }],
    });

    expect(() => validatePluginDescriptor(plugin)).toThrow("plugin_route_capability_required");
  });

  it("exposes MCP tools with explicit capabilities", () => {
    expect(projectFlareMcpTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "projectflare.tasks.create",
          requiredCapabilities: ["tasks:write"],
        }),
        expect.objectContaining({
          name: "projectflare.notifications.send",
          requiredCapabilities: ["notifications:write"],
        }),
      ]),
    );
  });
});
