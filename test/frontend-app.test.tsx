// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../apps/web/src/App";

const responses: Record<string, unknown> = {
  "/api/me": { id: "usr_1", name: "Local User", email: "local@example.com", group: null },
  "/api/workspaces": [{ id: "ws_demo", name: "Demo Workspace", slug: "demo" }],
  "/api/workspaces/ws_demo/projects": [
    {
      id: "prj_1",
      workspace_id: "ws_demo",
      name: "Cloudflare Native MVP",
      description: "A real project dashboard",
      status: "active",
      starts_on: "2026-06-01",
      due_on: "2026-07-15",
      github_repository_url: null,
    },
  ],
  "/api/plugins/catalog": [
    {
      id: "projectflare-demo-plugin",
      name: "ProjectFlare Demo Plugin",
      version: "0.1.0",
      description: "A first-party sample plugin",
      entrypoint: "builtin:projectflare-demo-plugin",
      capabilities: ["routes:register", "hooks.lifecycle:register", "storage:kv"],
      hooks: ["plugin:install"],
      routes: [{ name: "status", method: "POST", description: "Status route" }],
      storage: [{ name: "kv", indexes: ["key"] }],
    },
  ],
  "/api/workspaces/ws_demo/plugins": [
    {
      workspace_id: "ws_demo",
      plugin_id: "projectflare-demo-plugin",
      version: "0.1.0",
      enabled: 1,
      capabilities_json: '["routes:register","hooks.lifecycle:register","storage:kv"]',
      settings_json: null,
      installed_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
      descriptor: {
        id: "projectflare-demo-plugin",
        name: "ProjectFlare Demo Plugin",
        version: "0.1.0",
        description: "A first-party sample plugin",
        entrypoint: "builtin:projectflare-demo-plugin",
        capabilities: ["routes:register", "hooks.lifecycle:register", "storage:kv"],
      },
    },
  ],
  "/api/workspaces/ws_demo/plugins/projectflare-demo-plugin/routes/status": {
    plugin: { id: "projectflare-demo-plugin", enabled: true },
    workspaceId: "ws_demo",
    input: { projectId: "prj_1" },
  },
  "/api/projects/prj_1/tasks": [
    {
      id: "tsk_1",
      project_id: "prj_1",
      title: "Design React shell",
      description: "Replace inline HTML with Vite assets",
      status: "in_progress",
      priority: "high",
      assignee_user_id: "usr_1",
      assignee_name: "Local User",
      parent_task_id: null,
      category_id: "cat_product",
      category_name: "Product",
      category_color: "#16a34a",
      milestone_id: "ms_mvp",
      milestone_name: "MVP",
      milestone_due_on: "2026-07-15",
      tags: ["react", "ui"],
      starts_on: "2026-06-10",
      due_on: "2026-06-18",
      progress: 60,
      source: "app",
    },
    {
      id: "tsk_2",
      project_id: "prj_1",
      title: "Wire child tasks",
      description: "Nest related work under a parent",
      status: "todo",
      priority: "medium",
      assignee_user_id: null,
      assignee_name: null,
      parent_task_id: "tsk_1",
      category_id: "cat_product",
      category_name: "Product",
      category_color: "#16a34a",
      milestone_id: "ms_mvp",
      milestone_name: "MVP",
      milestone_due_on: "2026-07-15",
      tags: ["nesting"],
      starts_on: null,
      due_on: null,
      progress: 10,
      source: "app",
    },
  ],
  "/api/projects/prj_1/dependencies": [],
  "/api/projects/prj_1/wiki": [
    {
      id: "wiki_1",
      project_id: "prj_1",
      title: "Architecture",
      slug: "architecture",
      body_markdown: "# Architecture",
      updated_at: "2026-06-11T00:00:00.000Z",
    },
  ],
  "/api/workspaces/ws_demo/github/repositories": [],
  "/api/projects/prj_1/github/events": [],
  "/api/projects/prj_1/webhook-endpoints": [],
  "/api/projects/prj_1/notification-channels": [],
  "/api/projects/prj_1/notifications": [],
  "/api/tasks/tsk_1/comments": [],
  "/api/wiki/wiki_1/revisions": [],
};

describe("React app", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("projectflare.locale", "en");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
        const url = path.startsWith("http") ? new URL(path).pathname : path;
        const body = responses[url];
        if (!body) {
          return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
        }
        return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders the project dashboard from API data", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Cloudflare Native MVP" })).toBeTruthy();
    expect((await screen.findAllByText("Design React shell")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("combobox", { name: "Parent task" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Assignee")).toBeTruthy();
    expect(screen.getAllByText("Local User").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("#react")).toBeTruthy();
    expect(screen.getByPlaceholderText("Category")).toBeTruthy();
    expect(screen.getByText("Demo Workspace")).toBeTruthy();
    expect(screen.getByText("Overview")).toBeTruthy();
  });

  it("switches the UI language to Japanese", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Cloudflare Native MVP" })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "ja" } });

    expect(screen.getByText("概要")).toBeTruthy();
    expect(screen.getByText("タスク")).toBeTruthy();
    expect(document.documentElement.lang).toBe("ja");
  });

  it("supports RTL locales", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Cloudflare Native MVP" })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "ar" } });

    expect(screen.getByText("نظرة عامة")).toBeTruthy();
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("shows installed plugins and invokes a plugin route", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Cloudflare Native MVP" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Plugins/ }));

    expect(screen.getByText("Plugin Catalog")).toBeTruthy();
    expect(screen.getAllByText("ProjectFlare Demo Plugin").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Run status/ }));

    expect(await screen.findByText(/projectflare-demo-plugin/)).toBeTruthy();
  });
});
