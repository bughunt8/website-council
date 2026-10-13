import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SEATS } from "../app/lib/seats.mjs";
import { getLive } from "../app/lib/watch.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, "dist");
// Explicit allowlist. Never discover public data by globbing local sessions.
export const EXAMPLES = [
  { id: "2026-10-10-example-raise-coaching-price", publicTitle: "Should I raise my prices?", summary: "A coaching founder wants to move from $2,000 to $3,500 per client. Should the increase apply to everyone, only new clients, or nobody?", facts: [["$30k", "monthly revenue"], ["15", "active clients"], ["50%", "close rate"]] },
  { id: "2026-10-10-example-first-sales-hire", publicTitle: "Is it time for my first sales hire?", summary: "A solo SaaS founder is spending 20 hours a week selling. A full-time hire, a part-time closer, or another six months of founder-led sales?", facts: [["$25k", "monthly revenue"], ["20h", "weekly selling"], ["$150k", "cash in bank"]] },
  { id: "2026-10-09-example-take-the-seed", publicTitle: "Should we take the seed investment?", summary: "A profitable SaaS company weighs a $4 million seed against bootstrapping or a smaller angel round. Growth, control, and founder capacity pull in different directions.", facts: [["$40k", "monthly revenue"], ["$4m", "seed offer"], ["$180k", "cash in bank"]] },
];
export function build() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(path.join(ROOT, "site"), out, { recursive: true });
  fs.mkdirSync(path.join(out, "data"), { recursive: true });
  for (const entry of EXAMPLES) {
    const saved = path.join(ROOT, "sessions", entry.id, "events.json");
    const j = fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, "utf8")) : getLive(entry.id);
    if (!j || j.status !== "done") throw new Error(`Example ${entry.id} is not complete`);
    const events = j.events.filter((e) => ["setup", "seat_done", "cruxes", "draft", "verdict"].includes(e.type));
    if (!events.some((e) => e.type === "setup") || !events.some((e) => e.type === "verdict")) throw new Error(`Example ${entry.id} has no setup or verdict`);
    for (const event of events) {
      delete event.t;
      delete event.at;
      if (event.type === "seat_done" && !SEATS.some((s) => s.key === event.seat)) throw new Error("Unknown advisor");
    }
    fs.writeFileSync(path.join(out, "data", `${entry.id}.json`), JSON.stringify({ id: entry.id, status: "done", events }));
  }
  fs.writeFileSync(path.join(out, "data", "catalog.json"), JSON.stringify({ seats: SEATS, sessions: EXAMPLES }));
  // Only these upstream web assets are publishable.
  for (const folder of ["portraits", "vendor", "brand/fonts"]) {
    fs.cpSync(path.join(ROOT, "app/public", folder), path.join(out, folder), { recursive: true });
  }
  fs.copyFileSync(path.join(ROOT, "LICENSE"), path.join(out, "LICENSE.txt"));
  fs.copyFileSync(path.join(ROOT, "THIRD_PARTY_NOTICES.md"), path.join(out, "THIRD_PARTY_NOTICES.txt"));
  let revision = "local";
  try { revision = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  const environment = process.env.COUNCIL_STAGING === "1" ? "staging" : "production";
  fs.writeFileSync(path.join(out, "release.json"), JSON.stringify({ name: "website-council", revision, publicExamples: EXAMPLES.length, mode: "public-static-viewer", canonicalHost: "council.profitriseco.com", environment }));
  if (process.env.COUNCIL_STAGING === "1") {
    fs.writeFileSync(path.join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
    fs.appendFileSync(path.join(out, "_headers"), "\n/*\n  X-Robots-Tag: noindex, nofollow\n");
    const index = path.join(out, "index.html");
    fs.writeFileSync(index, fs.readFileSync(index, "utf8").replace('id="staging-banner" hidden', 'id="staging-banner"'));
  }
  console.log(`Built ${EXAMPLES.length} allowlisted examples into dist. No private sessions or AI credentials included.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
