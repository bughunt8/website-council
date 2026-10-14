import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { BrainClient } from "./brain.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (res, status, value) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(value)); };
const secret = (name) => process.env[`${name}_FILE`] ? fs.readFileSync(process.env[`${name}_FILE`], "utf8").trim() : process.env[name] || "";
const atomic = (file, value) => { fs.writeFileSync(`${file}.tmp`, JSON.stringify(value), { mode: 0o600 }); fs.renameSync(`${file}.tmp`, file); };
export function authenticate(config, injectedJwks) {
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.access?.teamDomain || "") || !config.access?.audience) return async () => { throw new Error("Identity configuration unavailable"); };
  const issuer = `https://${config.access.teamDomain}`;
  const jwks = injectedJwks || createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  return async (req) => {
    const assertion = req.headers["cf-access-jwt-assertion"];
    if (!assertion) throw new Error("Sign in required");
    const { payload } = await jwtVerify(assertion, jwks, { issuer, audience: config.access.audience, algorithms: ["RS256"] });
    if (!payload.sub || !payload.email || !config.access.allowedEmails?.includes(String(payload.email).toLowerCase())) throw new Error("User is not approved for company council execution");
    return crypto.createHash("sha256").update(`${issuer}:${payload.sub}`).digest("hex");
  };
}
async function body(req) {
  if (!String(req.headers["content-type"]).startsWith("application/json")) throw Object.assign(new Error("JSON request required"), { status: 415 });
  let value = ""; for await (const part of req) { value += part; if (value.length > 14000) throw Object.assign(new Error("Decision brief is too large"), { status: 413 }); }
  try { return JSON.parse(value); } catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}
export function createService({ config, dataDir, engine, memory, identity = authenticate(config), staticDir = path.join(ROOT, "dist"), seats = [], demoDir = process.env.COUNCIL_DEMO_DATA_DIR }) {
  fs.mkdirSync(path.join(dataDir, "jobs"), { recursive: true, mode: 0o700 });
  const jobs = new Map(); let active = 0;
  const fileFor = (id) => path.join(dataDir, "jobs", `${id}.json`);
  for (const name of fs.readdirSync(path.join(dataDir, "jobs")).filter((f) => /^[a-z0-9-]+\.json$/.test(f))) {
    const job = JSON.parse(fs.readFileSync(path.join(dataDir, "jobs", name)));
    if (job.status === "running" || job.status === "retrieving") { job.status = "interrupted"; atomic(fileFor(job.id), job); }
    jobs.set(job.id, job);
  }
  const persist = (job) => atomic(fileFor(job.id), { id: job.id, owner: job.owner, status: job.status, prompt: job.prompt, mode: job.mode, evidence: job.evidence, events: job.events, started: job.started });
  const reserve = (owner) => {
    const file = path.join(dataDir, "quota.json");
    const day = new Date().toISOString().slice(0, 10);
    const ledger = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
    const key = `${day}:${owner}`; const count = ledger[key] || 0;
    if (count >= config.limits.runsPerUserPerDay) throw Object.assign(new Error("Daily council-attempt limit reached"), { status: 429 });
    ledger[key] = count + 1;
    atomic(file, ledger);
  };
  const publicJob = (job) => ({ id: job.id, status: job.status, mode: job.mode, prompt: job.prompt, evidence: job.evidence, events: job.events });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/health") return json(res, 200, { status: "ok", active, revision: process.env.GIT_COMMIT || "development" });
      if (url.pathname === "/api/status") return json(res, 200, { kind: "live-node-service", executionEnabled: config.executionEnabled && config.providerDisclosureApproved, active, memoryRequired: true, reason: !config.executionEnabled ? "Live execution awaits provider, memory, identity and cost approval." : null });
      if (url.pathname === "/data/catalog.json" && req.method === "GET") {
        const catalog = demoDir && fs.existsSync(path.join(demoDir, "catalog.json")) ? JSON.parse(fs.readFileSync(path.join(demoDir, "catalog.json"))) : { sessions: [] };
        return json(res, 200, { seats, sessions: catalog.sessions });
      }
      if (url.pathname.startsWith("/data/") && demoDir && req.method === "GET") {
        const name = url.pathname.slice(6);
        if (!/^[a-z0-9-]+\.json$/.test(name)) return json(res, 404, { error: "Demo not found" });
        const file = path.join(demoDir, name);
        if (!fs.existsSync(file)) return json(res, 404, { error: "Demo not found" });
        return json(res, 200, JSON.parse(fs.readFileSync(file)));
      }
      if (url.pathname.startsWith("/api/")) {
        let owner;
        try { owner = await identity(req); } catch { return json(res, 401, { error: "Sign in with an approved company identity." }); }
        if (url.pathname === "/api/login") { res.writeHead(302, { location: "/" }); res.end(); return; }
        if (url.pathname === "/api/councils" && req.method === "POST") {
          if (req.headers.origin && req.headers.origin !== (config.publicOrigin || "https://council.profitriseco.com")) return json(res, 403, { error: "Request origin refused." });
          const input = await body(req);
          if (Object.keys(input).some((key) => !["prompt", "mode"].includes(key))) return json(res, 400, { error: "Unsupported council parameter." });
          if (typeof input.prompt !== "string" || input.prompt.trim().length < 10 || input.prompt.length > 8000 || !["quick", "full"].includes(input.mode)) return json(res, 400, { error: "Provide a decision brief and a valid council mode." });
          if (!config.executionEnabled || !config.providerDisclosureApproved) return json(res, 503, { error: "Live model execution has not been approved and configured." });
          if (active >= config.limits.maxConcurrent) return json(res, 429, { error: "Another council is running. Try again after it concludes." });
          reserve(owner); active++;
          try {
            const evidence = await memory.recall(input.prompt);
            let job;
            const session = engine.createCouncil(input.prompt, input.mode, (s) => {
              job.status = s.status; job.events = [...s.events]; persist(job);
            });
            job = { id: session.id, owner, status: "running", prompt: input.prompt, mode: input.mode, evidence, events: [], started: Date.now(), session };
            jobs.set(job.id, job); persist(job);
            const timeout = AbortSignal.timeout(20 * 60 * 1000);
            engine.executeCouncil(session, { evidence, maxCalls: config.limits.maxProviderCalls, signal: timeout, safeErrors: true }).then(() => {
              job.status = session.status; job.events = [...session.events]; persist(job);
            }).catch(() => {
              job.status = "error"; job.events = [...session.events]; persist(job);
            }).finally(() => { active--; });
            return json(res, 202, { id: job.id, evidenceSha256: evidence.sha256 });
          } catch (error) { active--; return json(res, 422, { error: error.message }); }
        }
        const match = url.pathname.match(/^\/api\/councils\/([a-z0-9-]+)(\/events)?$/);
        if (match && req.method === "GET") {
          const job = jobs.get(match[1]);
          if (!job || job.owner !== owner) return json(res, 404, { error: "Council not found." });
          if (!match[2]) return json(res, 200, publicJob(job));
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
          if (job.session) engine.subscribe(job.session, res);
          else { for (const event of job.events) res.write(`data: ${JSON.stringify(event)}\n\n`); res.write('data: {"type":"end"}\n\n'); }
          if (job.status !== "running") { res.end(); return; }
          const heartbeat = setInterval(() => res.write(": keepalive\n\n"), 15000);
          res.on("close", () => clearInterval(heartbeat));
          return;
        }
        return json(res, 404, { error: "Unknown API route." });
      }
      if (!["GET", "HEAD"].includes(req.method)) return json(res, 405, { error: "Method not allowed." });
      const root = path.resolve(staticDir);
      const file = path.resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: "Not found." });
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".txt": "text/plain" };
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'" });
      if (req.method === "HEAD") res.end(); else fs.createReadStream(file).pipe(res);
    } catch (error) { if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : "Service request failed." }); else res.end(); }
  });
  return { server, jobs, active: () => active };
}
async function main() {
  if (!process.env.COUNCIL_CONFIG_FILE || !process.env.COUNCIL_SESSIONS_DIR) throw new Error("Council requires injected runtime config and persistent session storage");
  const config = JSON.parse(fs.readFileSync(process.env.COUNCIL_CONFIG_FILE, "utf8"));
  if (!config.limits || !Number.isInteger(config.limits.maxConcurrent) || config.limits.maxConcurrent !== 1 || !Number.isInteger(config.limits.runsPerUserPerDay) || config.limits.runsPerUserPerDay < 1 || !Number.isInteger(config.limits.maxProviderCalls) || config.limits.maxProviderCalls < 1 || config.limits.maxProviderCalls > 25) throw new Error("Invalid council execution limits");
  if (config.models?.seat) process.env.SEAT_MODEL = config.models.seat;
  if (config.models?.chair) process.env.CHAIR_MODEL = config.models.chair;
  for (const [seat, model] of Object.entries(config.models?.seats || {})) process.env[`COUNCIL_MODEL_${seat.toUpperCase()}`] = model;
  if (config.executionEnabled && (!config.providerDisclosureApproved || !config.models?.seat || !config.models?.chair || !secret("ANTHROPIC_API_KEY") || !secret("BRAIN_MCP_TOKEN"))) throw new Error("Execution cannot enable without approved models, disclosure, and injected provider/memory secrets");
  if (!process.env.COUNCIL_SEATS_FILE) throw new Error("Advisor metadata must be injected, not baked into the executable");
  const { SEATS } = await import("../app/lib/seats.mjs");
  for (const seat of SEATS) {
    if (!fs.existsSync(path.join(process.env.COUNCIL_AGENTS_DIR || "", `council-${seat.key}.md`)) || !fs.existsSync(path.join(process.env.COUNCIL_PROFILES_DIR || "", seat.slug, "_hot.md"))) throw new Error("Advisor prompts and profile data are missing");
  }
  const engine = await import("../app/lib/council.mjs");
  const memory = new BrainClient({ url: config.brain.url, token: secret("BRAIN_MCP_TOKEN"), sourceId: config.brain.sourceId, maxChars: config.limits.maxContextChars, requireSemanticReady: config.brain.requireSemanticReady });
  const runtime = createService({ config, dataDir: process.env.COUNCIL_SESSIONS_DIR, engine, memory, seats: SEATS });
  runtime.server.listen(Number(process.env.PORT || 4730), "0.0.0.0", () => console.log("Council Node execution service listening"));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(() => { console.error("Council runtime configuration is invalid or incomplete"); process.exitCode = 1; });
