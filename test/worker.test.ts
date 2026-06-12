import { describe, expect, it } from "vitest";
import worker from "../packages/cloudflare/src";
import { notificationPayloadFor } from "../packages/cloudflare/src/infrastructure/cloudflare/notifications/delivery";

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

  it("exposes plugin catalog and installed plugins without D1", async () => {
    const catalog = (await worker
      .fetch(new Request("http://localhost/api/plugins/catalog"), env)
      .then((response) => response.json())) as Array<Record<string, unknown>>;
    const installed = (await worker
      .fetch(new Request("http://localhost/api/workspaces/ws_demo/plugins"), env)
      .then((response) => response.json())) as Array<Record<string, unknown>>;

    expect(catalog).toContainEqual(expect.objectContaining({ id: "projectflare-demo-plugin" }));
    expect(installed).toContainEqual(
      expect.objectContaining({
        pluginId: "projectflare-demo-plugin",
        descriptor: expect.objectContaining({ name: "ProjectFlare Demo Plugin" }),
      }),
    );
  });

  it("invokes installed plugin routes without D1", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/workspaces/ws_demo/plugins/projectflare-demo-plugin/routes/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ping: true }),
      }),
      env,
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      plugin: {
        id: "projectflare-demo-plugin",
        enabled: true,
      },
      workspaceId: "ws_demo",
      input: { ping: true },
    });
  });

  it("returns plugin route errors for missing routes without D1", async () => {
    const response = await worker.fetch(
      new Request("http://localhost/api/workspaces/ws_demo/plugins/projectflare-demo-plugin/routes/missing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ping: true }),
      }),
      env,
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({ error: "plugin_route_not_found" });
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
        projectId: "prj_launch",
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

  it("accepts GitHub webhooks with a valid signature", async () => {
    const secret = "secret";
    const body = JSON.stringify({
      action: "opened",
      repository: {
        full_name: "example/projectflare",
        owner: { login: "example" },
        name: "projectflare",
      },
      issue: {
        number: 124,
        title: "Signed webhook issue",
        html_url: "https://github.com/example/projectflare/issues/124",
        state: "open",
      },
    });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const signature = `sha256=${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;

    const response = await worker.fetch(
      new Request("http://localhost/api/github/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issues",
          "x-hub-signature-256": signature,
        },
        body,
      }),
      { GITHUB_WEBHOOK_SECRET: secret },
    );

    expect(response.status).toBe(202);
    await expect(readJson(response)).resolves.toMatchObject({
      accepted: true,
      signatureVerified: true,
    });
  });

  it("formats Slack notification channel payloads", () => {
    const payload = notificationPayloadFor(
      { channel_type: "slack" },
      {
        title: "Task created",
        body: "Ship <Phase 1> & notify everyone.",
        source: "app",
      },
    );

    expect(payload).toMatchObject({
      text: "Task created: Ship <Phase 1> & notify everyone.",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Task created*\nShip &lt;Phase 1&gt; &amp; notify everyone.",
          },
        },
        {
          type: "context",
        },
      ],
    });
  });

  it("keeps generic notification channel payloads backward compatible", () => {
    const payload = notificationPayloadFor(
      { channel_type: "webhook" },
      {
        title: "Task created",
        body: "Ship Phase 1.",
        source: "app",
      },
    );

    expect(payload).toEqual({
      text: "Task created: Ship Phase 1.",
      title: "Task created",
      body: "Ship Phase 1.",
      source: "app",
      projectflare: true,
    });
  });
});
