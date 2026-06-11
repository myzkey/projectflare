// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
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
  "/api/projects/prj_1/tasks": [
    {
      id: "tsk_1",
      project_id: "prj_1",
      title: "Design React shell",
      description: "Replace inline HTML with Vite assets",
      status: "in_progress",
      priority: "high",
      starts_on: "2026-06-10",
      due_on: "2026-06-18",
      progress: 60,
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
    vi.unstubAllGlobals();
  });

  it("renders the project dashboard from API data", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Cloudflare Native MVP" })).toBeTruthy();
    expect(await screen.findAllByText("Design React shell")).toHaveLength(2);
    expect(screen.getByText("Demo Workspace")).toBeTruthy();
    expect(screen.getByText("Overview")).toBeTruthy();
  });
});
