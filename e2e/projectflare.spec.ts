import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("projectflare.locale", "en");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Cloudflare Native MVP" }).click();
  await expect(page.getByRole("heading", { name: "Cloudflare Native MVP" })).toBeVisible();
});

test("creates a task and adds a comment", async ({ page }) => {
  const stamp = Date.now();
  const taskTitle = `E2E task ${stamp}`;
  const childTitle = `E2E child ${stamp}`;
  const commentBody = `E2E comment ${stamp}`;

  await page.getByPlaceholder("Task title").fill(taskTitle);
  await page.getByLabel("Description", { exact: true }).fill("Created by Playwright");
  await page.getByPlaceholder("Assignee").fill("E2E Owner");
  await page.getByPlaceholder("Category").fill("QA");
  await page.getByPlaceholder("Tags").fill("playwright, smoke");
  await page.getByPlaceholder("Milestone").fill("E2E Milestone");
  await page.getByRole("button", { name: "Add task" }).click();

  const taskRow = page.locator(".task-row").filter({ hasText: taskTitle });
  await expect(taskRow).toBeVisible();
  await expect(taskRow).toContainText("E2E Owner");
  await expect(taskRow).toContainText("#playwright");
  await expect(taskRow).toContainText("E2E Milestone");

  await page.getByPlaceholder("Task title").fill(childTitle);
  await page.getByLabel("Parent task").selectOption({ label: taskTitle });
  await page.getByRole("button", { name: "Add task" }).click();

  await expect(page.locator(".task-row").filter({ hasText: childTitle })).toBeVisible();
  await taskRow.getByRole("button", { name: taskTitle }).click();

  await page.getByLabel("Write a comment").fill(commentBody);
  await page.locator(".comment-panel .inline-form button[type='submit']").click();

  await expect(page.getByText(commentBody)).toBeVisible();

  await page.getByLabel("Image or video file").setInputFiles({
    name: "task-image.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  await page.getByRole("button", { name: "Upload media" }).click();
  await expect(page.locator(".attachment-card").filter({ hasText: "task-image.png" }).first()).toBeVisible();
});

test("updates task status and saves wiki content", async ({ page }) => {
  const stamp = Date.now();
  const taskTitle = `E2E status ${stamp}`;
  const wikiTitle = `E2E Wiki ${stamp}`;
  const wikiSlug = `e2e-wiki-${stamp}`;

  await page.getByPlaceholder("Task title").fill(taskTitle);
  await page.getByRole("button", { name: "Add task" }).click();
  const taskRow = page.locator(".task-row").filter({ hasText: taskTitle });
  await taskRow.getByRole("combobox").first().selectOption("review");
  await expect(taskRow.getByRole("combobox").first()).toHaveValue("review");

  await page.getByRole("button", { name: "Wiki", exact: true }).click();
  await page.getByPlaceholder("Page title").fill(wikiTitle);
  await page.getByPlaceholder("slug").fill(wikiSlug);
  await page.getByLabel("Markdown body").fill("# E2E Wiki\n\nSaved by Playwright.");
  await page.getByRole("button", { name: "Save page" }).click();

  await expect(page.getByRole("button", { name: new RegExp(wikiTitle) })).toBeVisible();

  await page.getByLabel("Image or video file").setInputFiles({
    name: "wiki-image.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  await page.getByRole("button", { name: "Upload media" }).click();
  await expect(page.locator(".attachment-card").filter({ hasText: "wiki-image.png" }).first()).toBeVisible();
});

test("creates a generic webhook endpoint from integrations", async ({ page }) => {
  const endpointName = `E2E intake ${Date.now()}`;
  const channelName = `E2E Slack ${Date.now()}`;

  await page.getByRole("button", { name: "Integrations", exact: true }).click();
  await page.getByPlaceholder("Endpoint name").fill(endpointName);
  await page.getByPlaceholder("source").fill("playwright");
  await page.getByRole("button", { name: "Create endpoint" }).click();

  await expect(page.getByText(endpointName)).toBeVisible();
  await expect(page.getByText(/New token:/)).toBeVisible();

  await page.getByPlaceholder("Channel name").fill(channelName);
  await page.getByPlaceholder("Slack Incoming Webhook URL").fill("https://hooks.slack.com/services/T000/B000/XXXX");
  await page.getByRole("button", { name: "Add channel" }).click();

  await expect(page.getByText(channelName)).toBeVisible();
  await expect(page.locator(".event-list article").filter({ hasText: channelName })).toContainText("slack");
});

test("shows plugins and invokes the sample plugin route", async ({ page }) => {
  await page.getByRole("button", { name: "Plugins" }).click();

  await expect(page.getByText("Plugin Catalog")).toBeVisible();
  await expect(page.getByText("ProjectFlare Demo Plugin").first()).toBeVisible();

  await page.getByRole("button", { name: "Run status" }).click();

  await expect(page.locator(".route-console")).toContainText("projectflare-demo-plugin");
  await expect(page.locator(".route-console")).toContainText("prj_launch");

  await page.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByRole("button", { name: "Enable" })).toBeVisible();
  await page.getByRole("button", { name: "Enable" }).click();
  await expect(page.getByRole("button", { name: "Disable" })).toBeVisible();
});

test("switches locale to Japanese and Arabic RTL", async ({ page }) => {
  await page.getByLabel("Language").selectOption("ja");

  await expect(page.getByRole("button", { name: "概要" })).toBeVisible();
  await expect(page.getByRole("button", { name: "プラグイン" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");

  await page.getByLabel("言語").selectOption("ar");

  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
