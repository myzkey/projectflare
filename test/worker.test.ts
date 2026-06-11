import { describe, expect, it } from "vitest";
import worker from "../src/index";

const env = {};

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("ProjectFlare worker", () => {
  it("returns health status", async () => {
    const response = await worker.fetch(new Request("http://localhost/api/health"), env);

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toMatchObject({
      ok: true,
      service: "projectflare",
    });
  });

  it("serves the application shell", async () => {
    const response = await worker.fetch(new Request("http://localhost/"), env);
    const html = await response.text();

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("ProjectFlare");
    expect(html).toContain("GitHub Sync");
    expect(html).toContain("Webhook Intake");
  });

  it("returns demo workspace and project data without D1", async () => {
    const workspaces = await readJson(await worker.fetch(new Request("http://localhost/api/workspaces"), env));
    const projects = (await worker
      .fetch(new Request("http://localhost/api/projects"), env)
      .then((response) => response.json())) as Array<Record<string, unknown>>;

    expect(workspaces).toMatchObject([{ id: "ws_demo", name: "ProjectFlare Demo" }]);
    expect(projects).toContainEqual(expect.objectContaining({ id: "prj_launch" }));
  });

  it("creates a generic webhook task without D1", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/webhooks/generic/prj_launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Webhook smoke task",
          source: "vitest",
          priority: "urgent",
        }),
      }),
      env,
    );
    const body = await readJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      accepted: true,
      task: {
        project_id: "prj_launch",
        title: "Webhook smoke task",
        source: "vitest",
        priority: "urgent",
      },
    });
  });

  it("accepts a GitHub webhook payload without a configured secret", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/github/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issues",
          "x-github-delivery": "vitest-delivery",
        },
        body: JSON.stringify({
          action: "opened",
          repository: {
            full_name: "example/projectflare",
            owner: { login: "example" },
            name: "projectflare",
          },
          issue: {
            number: 123,
            title: "Webhook issue",
            html_url: "https://github.com/example/projectflare/issues/123",
            state: "open",
          },
        }),
      }),
      env,
    );
    const body = await readJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      accepted: true,
      queued: false,
      repositoryFullName: "example/projectflare",
      signatureVerified: false,
    });
  });

  it("rejects GitHub webhooks with an invalid signature when a secret is configured", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/github/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issues",
          "x-hub-signature-256": "sha256=bad",
        },
        body: JSON.stringify({ action: "opened" }),
      }),
      { GITHUB_WEBHOOK_SECRET: "secret" },
    );

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toMatchObject({
      error: "invalid_github_signature",
    });
  });
});
