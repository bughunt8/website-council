import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createService, authenticate } from "../service/server.mjs";
import { BrainClient } from "../service/brain.mjs";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";
const config = () => ({ executionEnabled: true, providerDisclosureApproved: true, publicOrigin: "https://council.profitriseco.com", access: {}, limits: { maxConcurrent: 1, runsPerUserPerDay: 2, maxProviderCalls: 25 } });
const evidence = { sourceId: "profit-rise-company", sha256: "fixed-evidence-hash", passages: [{ reference: "profit-rise-company/company-profile", text: "Synthetic company evidence." }] };
async function harness(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "council-service-"));
  let memoryCalls = 0, modelCalls = 0, finish;
  const engine = {
    createCouncil(prompt, mode, onEvent) { return { id: crypto.randomUUID(), prompt, mode, events: [], status: "running", onEvent }; },
    executeCouncil(session, context) {
      modelCalls++;
      assert.equal(context.evidence.sha256, evidence.sha256);
      return new Promise((resolve) => { finish = () => { session.status = "done"; session.events = [{ type: "verdict", verdict: { call: "Synthetic tested conclusion." } }]; session.onEvent(session); resolve(); }; });
    },
    subscribe(session, res) { for (const event of session.events) res.write(`data: ${JSON.stringify(event)}\n\n`); },
  };
  const runtime = createService({ config: options.config || config(), dataDir: dir, engine, memory: options.memory || { async recall() { memoryCalls++; return evidence; } }, identity: options.identity || (async (req) => req.headers["test-owner"] || "owner-a") });
  await new Promise((r) => runtime.server.listen(0, "127.0.0.1", r));
  return {
    ...runtime, url: `http://127.0.0.1:${runtime.server.address().port}`, dir,
    counters: () => ({ memoryCalls, modelCalls }), finish: async () => { finish(); await new Promise((r) => setImmediate(r)); },
    close: async () => { runtime.server.closeAllConnections(); await new Promise((r) => runtime.server.close(r)); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
const post = (h, data = { prompt: "Should our company build this service?", mode: "quick" }, headers = {}) => fetch(`${h.url}/api/councils`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data) });
test("authentication refusal precedes memory retrieval and model costs", async () => {
  const h = await harness({ identity: async () => { throw new Error("not authenticated"); } });
  try { assert.equal((await post(h)).status, 401); assert.deepEqual(h.counters(), { memoryCalls: 0, modelCalls: 0 }); } finally { await h.close(); }
});
test("disabled execution does not silently run an example or contact providers", async () => {
  const c = config(); c.executionEnabled = false; const h = await harness({ config: c });
  try { assert.equal((await post(h)).status, 503); assert.deepEqual(h.counters(), { memoryCalls: 0, modelCalls: 0 }); } finally { await h.close(); }
});
test("real create route freezes evidence, starts execution, persists conclusion and isolates owners", async () => {
  const h = await harness();
  try {
    const r = await post(h); assert.equal(r.status, 202); const job = await r.json();
    assert.equal(job.evidenceSha256, evidence.sha256); assert.equal(h.counters().modelCalls, 1);
    assert.equal((await fetch(`${h.url}/api/councils/${job.id}`, { headers: { "test-owner": "owner-b" } })).status, 404);
    await h.finish();
    const result = await (await fetch(`${h.url}/api/councils/${job.id}`)).json();
    assert.equal(result.status, "done"); assert.equal(result.events[0].type, "verdict");
    assert.equal(JSON.parse(fs.readFileSync(path.join(h.dir, "jobs", `${job.id}.json`))).owner, "owner-a");
  } finally { await h.close(); }
});
test("parallel launch guard and daily attempt quota refuse before extra model calls", async () => {
  const h = await harness();
  try {
    assert.equal((await post(h)).status, 202); assert.equal((await post(h)).status, 429);
    assert.equal(h.counters().modelCalls, 1); await h.finish();
    assert.equal((await post(h)).status, 202); await h.finish();
    assert.equal((await post(h)).status, 429); assert.equal(h.counters().modelCalls, 2);
  } finally { await h.close(); }
});
test("missing company context blocks execution instead of fabricating company facts", async () => {
  const h = await harness({ memory: { async recall() { throw new Error("No company evidence"); } } });
  try { assert.equal((await post(h)).status, 422); assert.equal(h.counters().modelCalls, 0); } finally { await h.close(); }
});
test("caller cannot override models, source grants, or execution configuration", async () => {
  const h = await harness();
  try { assert.equal((await post(h, { prompt: "Run this decision safely", mode: "quick", executionEnabled: true, model: "other" })).status, 400); assert.equal(h.counters().modelCalls, 0); } finally { await h.close(); }
});
test("cross-origin request is refused before costs", async () => {
  const h = await harness();
  try { assert.equal((await post(h, undefined, { origin: "https://attacker.example" })).status, 403); assert.equal(h.counters().modelCalls, 0); } finally { await h.close(); }
});
test("Access verifies signature, issuer, audience and explicit approved user", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey); jwk.kid = "test";
  const c = { access: { teamDomain: "company.cloudflareaccess.com", audience: "council-aud", allowedEmails: ["owner@example.test"] } };
  const auth = authenticate(c, createLocalJWKSet({ keys: [jwk] }));
  const token = await new SignJWT({ email: "owner@example.test" }).setProtectedHeader({ alg: "RS256", kid: "test" }).setSubject("owner").setIssuer("https://company.cloudflareaccess.com").setAudience("council-aud").setExpirationTime("5m").sign(privateKey);
  assert.match(await auth({ headers: { "cf-access-jwt-assertion": token } }), /^[a-f0-9]{64}$/);
  await assert.rejects(auth({ headers: { "cf-access-authenticated-user-email": "owner@example.test" } }));
  const wrong = authenticate({ access: { ...c.access, audience: "admin-aud" } }, createLocalJWKSet({ keys: [jwk] }));
  await assert.rejects(wrong({ headers: { "cf-access-jwt-assertion": token } }));
});
function mcp(rows) {
  return async (_url, options) => {
    const input = JSON.parse(options.body);
    if (input.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (input.method === "initialize") return Response.json({ jsonrpc: "2.0", id: input.id, result: { protocolVersion: "2025-03-26", capabilities: {} } });
    assert.equal(input.params.arguments.source_id, "profit-rise-company");
    return Response.json({ jsonrpc: "2.0", id: input.id, result: { content: [{ type: "text", text: JSON.stringify(rows) }] } });
  };
}
test("Brain source and semantic guards reject foreign or keyword-only results", async () => {
  const opts = { url: "http://brain:3131/mcp", token: "test-only", sourceId: "profit-rise-company", requireSemanticReady: true };
  const wrong = new BrainClient({ ...opts, fetcher: mcp([{ source_id: "client-other", cosine: 0.8, chunk_text: "Foreign information" }]) });
  await assert.rejects(wrong.recall("Decision"), /source boundary/);
  const keyword = new BrainClient({ ...opts, fetcher: mcp([{ source_id: "profit-rise-company", chunk_text: "Keyword result" }]) });
  await assert.rejects(keyword.recall("Decision"), /Semantic memory/);
  const semantic = new BrainClient({ ...opts, fetcher: mcp([{ source_id: "profit-rise-company", slug: "company", cosine: 0.8, chunk_text: "Synthetic company context" }]) });
  const pack = await semantic.recall("Decision"); assert.equal(pack.passages[0].reference, "profit-rise-company/company"); assert.match(pack.sha256, /^[a-f0-9]{64}$/);
});
test("actual profile engine executes discussion rounds and chair with one frozen company pack, using mock provider transport", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "council-engine-"));
  process.env.COUNCIL_SESSIONS_DIR = root;
  const engine = await import("../app/lib/council.mjs");
  const source = JSON.parse(fs.readFileSync("sessions/2026-10-10-example-raise-coaching-price/events.json"));
  const setup = source.events.find((e) => e.type === "setup");
  const crux = source.events.find((e) => e.type === "cruxes");
  const draft = source.events.find((e) => e.type === "draft");
  const verdict = source.events.find((e) => e.type === "verdict");
  const cards = source.events.filter((e) => e.type === "seat_done");
  let streams = 0, structured = 0;
  const seen = [];
  const transport = {
    async stream(request) {
      seen.push(Array.isArray(request.system) ? request.system.map((b) => b.text).join("\n") : request.system); const card = cards[streams++]; request.onText(card.text); return card.text;
    },
    async json(request) {
      seen.push(Array.isArray(request.system) ? request.system.map((b) => b.text).join("\n") : request.system); structured++;
      if (request.schema.properties.options) return {
        ...setup, weights: Object.entries(setup.weights).map(([seat, value]) => ({ seat, ...value })),
        quick_seats: ["hormozi", "buffett", "bezos", "graham"], decision: setup.title,
      };
      if (request.schema.properties.cruxes) return { ...crux, pressure: Object.entries(crux.pressure).map(([seat, c]) => ({ seat, crux: c })), note: "Synthetic test cruxes", unanimous: false };
      if (request.schema.properties.recommendation) return draft.draft;
      return verdict.verdict;
    },
  };
  try {
    const run = engine.createCouncil("Synthetic company decision, not a live model request.", "full");
    await engine.executeCouncil(run, { evidence, maxCalls: 25, transport, safeErrors: true });
    assert.equal(run.status, "done"); assert.equal(streams, 21); assert.equal(structured, 4);
    assert.equal(run.events.filter((e) => e.type === "seat_done").length, 21);
    assert.ok(run.events.some((e) => e.type === "verdict"));
    assert.ok(seen.every((s) => s.includes(evidence.sha256) && s.includes("Synthetic company evidence")));
    assert.ok(seen.every((s) => !s.includes("[object Object]")));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
