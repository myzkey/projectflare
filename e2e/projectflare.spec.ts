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
  const commentBody = `E2E comment ${stamp}`;

  await page.getByPlaceholder("Task title").fill(taskTitle);
  await page.getByPlaceholder("Description", { exact: true }).fill("Created by Playwright");
  await page.getByRole("button", { name: "Add task" }).click();

  await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
  await page.getByText(taskTitle, { exact: true }).click();

  await page.getByPlaceholder("Write a comment").fill(commentBody);
  await page.locator(".inline-form button[type='submit']").click();

  await expect(page.getByText(commentBody)).toBeVisible();
});

test("creates a generic webhook endpoint from integrations", async ({ page }) => {
  const endpointName = `E2E intake ${Date.now()}`;

  await page.getByRole("button", { name: "Integrations" }).click();
  await page.getByPlaceholder("Endpoint name").fill(endpointName);
  await page.getByPlaceholder("source").fill("playwright");
  await page.getByRole("button", { name: "Create endpoint" }).click();

  await expect(page.getByText(endpointName)).toBeVisible();
  await expect(page.getByText(/New token:/)).toBeVisible();
});

test("shows plugins and invokes the sample plugin route", async ({ page }) => {
  await page.getByRole("button", { name: "Plugins" }).click();

  await expect(page.getByText("Plugin Catalog")).toBeVisible();
  await expect(page.getByText("ProjectFlare Demo Plugin").first()).toBeVisible();

  await page.getByRole("button", { name: "Run status" }).click();

  await expect(page.locator(".route-console")).toContainText("projectflare-demo-plugin");
  await expect(page.locator(".route-console")).toContainText("prj_launch");
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
