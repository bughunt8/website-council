import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("browser submits a new authenticated job and streams a conclusion instead of replaying a sample", async ({ page }) => {
  const sample = JSON.parse(fs.readFileSync("sessions/2026-10-10-example-raise-coaching-price/events.json"));
  const id = "2026-10-14-11111111-1111-1111-1111-111111111111";
  const submitted = [];
  await page.route("**/api/status", (r) => r.fulfill({ json: { kind: "live-node-service", executionEnabled: true } }));
  await page.route("**/api/councils", async (r) => { submitted.push(r.request().postDataJSON()); await r.fulfill({ status: 202, json: { id, evidenceSha256: "synthetic-company-evidence" } }); });
  await page.route(`**/api/councils/${id}`, (r) => r.fulfill({ json: { id, status: "running", events: [], evidence: { sha256: "synthetic-company-evidence" } } }));
  await page.route(`**/api/councils/${id}/events`, (r) => r.fulfill({
    contentType: "text/event-stream",
    body: sample.events.filter((e) => ["setup", "seat_done", "cruxes", "draft", "verdict"].includes(e.type)).map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + 'data: {"type":"end"}\n\n',
  }));
  await page.goto("/");
  await expect(page.locator("#live-state")).toContainText("Node service connected");
  await page.locator("#prepare-button").click();
  await page.getByLabel("The decision *", { exact: true }).fill("Synthetic company decision for a live API wiring test.");
  await page.getByLabel("The options *", { exact: true }).fill("Proceed\nDo not proceed");
  await page.locator("#run-live-button").click();
  await expect(page.locator("#live-state")).toContainText("concluded");
  expect(submitted).toHaveLength(1); expect(submitted[0].prompt).toContain("Synthetic company decision");
  await page.locator("#verdict-button").click();
  await expect(page.locator("#verdict-mode-label")).toContainText("Live company council");
  await expect(page.locator("#verdict-body")).toContainText("synthetic-company-evidence");
});
