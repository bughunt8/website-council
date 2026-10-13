import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { build, EXAMPLES } from "../scripts/build.mjs";
build();
test("publishes exactly the curated examples and seven seats", () => {
  const catalog = JSON.parse(fs.readFileSync("dist/data/catalog.json", "utf8"));
  assert.equal(catalog.seats.length, 7); assert.equal(catalog.sessions.length, 3);
  assert.deepEqual(fs.readdirSync("dist/data").sort(), ["catalog.json", ...EXAMPLES.map((e) => e.id + ".json")].sort());
  for (const e of EXAMPLES) {
    const j = JSON.parse(fs.readFileSync(`dist/data/${e.id}.json`, "utf8"));
    assert.ok(j.events.some((e) => e.type === "setup")); assert.ok(j.events.some((e) => e.type === "verdict"));
  }
});
test("does not publish an unrelated local session even if its folder contains example", () => {
  const p = "sessions/2026-10-13-example-private-injection";
  fs.mkdirSync(p, { recursive: true }); fs.writeFileSync(path.join(p, "verdict.md"), "PRIVATE_SENTINEL_NEVER_PUBLISH");
  try {
    build();
    assert.ok(!fs.existsSync("dist/data/2026-10-13-example-private-injection.json"));
    for (const file of fs.readdirSync("dist/data")) assert.ok(!fs.readFileSync(path.join("dist/data", file), "utf8").includes("PRIVATE_SENTINEL"));
  } finally { fs.rmSync(p, { recursive: true, force: true }); }
});
test("no backend, repo internals, credentials, or local user councils are in publish output", () => {
  for (const forbidden of [".git", ".github", ".claude", "sessions", "app", ".env", "node_modules", "scripts", "tests"]) assert.ok(!fs.existsSync(path.join("dist", forbidden)));
  assert.ok(fs.existsSync("dist/LICENSE.txt")); assert.ok(fs.existsSync("dist/THIRD_PARTY_NOTICES.txt"));
  const js = fs.readFileSync("dist/app.js", "utf8");
  assert.ok(!/fetch\(["']https?:\/\//.test(js));
  assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(js));
});
test("build is byte-identical at the same revision", () => {
  const first = fs.readFileSync("dist/data/2026-10-09-example-take-the-seed.json", "utf8");
  const release = fs.readFileSync("dist/release.json", "utf8");
  build();
  assert.equal(fs.readFileSync("dist/data/2026-10-09-example-take-the-seed.json", "utf8"), first);
  assert.equal(fs.readFileSync("dist/release.json", "utf8"), release);
});
