import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("example replay reaches a real verdict and downloads a PDF and report", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".advisor")).toHaveCount(7);
  await page.getByRole("button", { name: /Watch this council/ }).click();
  await expect(page.locator(".contribution")).toHaveCount(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Skip to verdict", exact: true }).click();
  await page.getByRole("button", { name: /Read the verdict/ }).click();
  await expect(page.locator("#verdict-dialog")).toBeVisible();
  await expect(page.locator("#verdict-body")).toContainText("Option");
  const pdfPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download verdict PDF" }).click();
  const pdf = await pdfPromise; expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const reportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report", exact: true }).click();
  expect((await reportPromise).suggestedFilename()).toMatch(/\.md$/);
  expect(errors).toEqual([]);
});
test("every example has a verdict, advisor cards, and functioning chapter navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#watch-button")).toBeEnabled();
  const values = await page.locator("#session-select option").evaluateAll((options) => options.map((o) => o.value));
  for (const id of values) {
    await page.locator("#session-select").selectOption(id);
    await expect(page.locator("#watch-button")).toBeEnabled();
    await page.locator("#watch-button").click();
    await page.locator('[data-chapter="2"]').click();
    await expect(page.locator("#speaker-label")).toContainText("Debate");
    await page.locator(".advisor").first().click();
    await expect(page.locator("#advisor-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator('[data-chapter="verdict"]').click();
    await expect(page.locator("#result-actions")).toBeVisible();
    await page.locator("#verdict-button").click();
    await expect(page.locator("#verdict-body")).toContainText("Conditions");
    await page.keyboard.press("Escape");
  }
});
test("brief builder does not send private input to a server", async ({ page }) => {
  const posts = []; page.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
  await page.goto("/");
  await page.locator("#prepare-button").click();
  await page.getByLabel("The decision *", { exact: true }).fill("PRIVATE_QUESTION: Should we build another product?");
  await page.getByLabel("The options *", { exact: true }).fill("Build it\nStay focused");
  await page.getByLabel(/Quick council/).check();
  await page.getByRole("button", { name: /Create my local command/ }).click();
  await expect(page.locator("#brief-command")).toHaveValue(/\/roast-room --quick PRIVATE_QUESTION|\/roast-room --quick Decision: PRIVATE_QUESTION/);
  const download = page.waitForEvent("download"); await page.locator("#download-command").click();
  expect((await download).suggestedFilename()).toBe("council-private-brief.txt");
  expect(posts).toEqual([]);
});
test("themes, keyboard dialog escape, and accessibility", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".advisor")).toHaveCount(7);
  for (const theme of ["light", "dark"]) {
    if (await page.locator("html").getAttribute("data-theme") !== theme) await page.locator("#theme-toggle").click();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  }
  await page.locator("#nav-guide").focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#guide-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#nav-guide")).toBeFocused();
});
test("fits all supported viewport widths", async ({ page }) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/"); await expect(page.locator(".advisor")).toHaveCount(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => {
      const cardTop = document.querySelector(".speaker-card").getBoundingClientRect().top;
      return [...document.querySelectorAll(".nameplate")].every((e) => e.getBoundingClientRect().bottom < cardTop);
    })).toBe(true);
    await expect(page.locator("#watch-button")).toBeVisible();
  }
});
test("network errors have an explicit recovery action", async ({ page }) => {
  await page.route("**/data/catalog.json", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#load-error")).toBeVisible();
  await expect(page.locator("#retry-button")).toBeVisible();
  await page.unroute("**/data/catalog.json"); await page.locator("#retry-button").click();
  await expect(page.locator("#watch-button")).toBeEnabled();
});
