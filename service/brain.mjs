import crypto from "node:crypto";
export class BrainClient {
  constructor({ url, token, sourceId, maxChars = 16000, requireSemanticReady = true, fetcher = fetch }) {
    Object.assign(this, { url, token, sourceId, maxChars, requireSemanticReady, fetcher });
    this.next = 1; this.sessionId = null;
  }
  async rpc(method, params) {
    const response = await this.fetcher(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: this.next++, method, params }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error("Company memory is unavailable or access was refused");
    this.sessionId = response.headers.get("mcp-session-id") || this.sessionId;
    const text = await response.text();
    const payload = response.headers.get("content-type")?.includes("text/event-stream")
      ? text.split("\n").filter((line) => line.startsWith("data:")).map((line) => { try { return JSON.parse(line.slice(5)); } catch { return null; } }).filter(Boolean).at(-1)
      : JSON.parse(text);
    if (!payload || payload.error || payload.result?.isError) throw new Error("Company memory request failed");
    return payload.result;
  }
  async recall(question) {
    await this.rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "profit-rise-council", version: "1.0.0" } });
    const initialized = await this.fetcher(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!initialized.ok) throw new Error("Company memory initialization failed");
    const result = await this.rpc("tools/call", { name: "search", arguments: { query: question, source_id: this.sourceId, limit: 6, fields: "full" } });
    let rows = result.structuredContent?.results || result.structuredContent;
    if (!Array.isArray(rows)) {
      const value = result.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n");
      const parsed = JSON.parse(value || "[]");
      rows = Array.isArray(parsed) ? parsed : parsed.results;
    }
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("No authorized company evidence found. Populate and qualify Brain before model execution.");
    if (rows.some((r) => r.source_id !== this.sourceId)) throw new Error("Company evidence crossed its approved source boundary");
    if (rows.some((r) => r.unconfirmed || r.stale || r.evidence_omitted)) throw new Error("Company memory returned unconfirmed, stale, or withheld evidence");
    if (this.requireSemanticReady && !rows.some((r) => Number.isFinite(r.cosine))) throw new Error("Semantic memory is not qualified for this result. Keyword recall is not advertised as vector memory.");
    const passages = []; let used = 0;
    for (const row of rows) {
      const text = String(row.chunk_text || row.snippet || row.excerpt || row.compiled_truth || row.content || "").slice(0, Math.max(0, this.maxChars - used));
      if (!text) continue;
      used += text.length;
      passages.push({ reference: `${this.sourceId}/${row.slug || row.id || row.page_id}`, title: String(row.title || row.slug || "Company evidence"), text });
      if (used >= this.maxChars) break;
    }
    if (!passages.length) throw new Error("Company memory returned no usable evidence");
    const pack = { sourceId: this.sourceId, retrieval: this.requireSemanticReady ? "semantic-evidence" : "explicit-keyword-allowed", passages };
    return Object.freeze({ ...pack, sha256: crypto.createHash("sha256").update(JSON.stringify(pack)).digest("hex") });
  }
}
