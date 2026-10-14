# Execution design

`service/server.mjs` serves UI and authenticated APIs. `app/lib/council.mjs` executes the retained advisor rounds and chair synthesis. `service/brain.mjs` negotiates HTTP MCP and reads only the approved source. Async execution context adds the same immutable evidence pack to every provider system request and meters attempts.

Cloudflare JWT validation uses signed issuer/audience and an explicit user allowlist. Spoofed email headers do not authenticate. User-owned jobs and quota ledger persist on a private injected volume. API caller cannot select company source, provider URL, model configuration, or authorization flags.

Admission guards precede memory and model calls. Execution defaults off. Active concurrency is one, quotas include attempts, and provider attempts are bounded. Deploy only one process against this filesystem state; multi-replica scheduling requires a separate durable queue/locking design.

Memory results must match the approved source and reject stale/unconfirmed/withheld evidence. Semantic-required mode refuses keyword-only records. Real upstream vector recall still needs qualification; mocked vector fields are not proof of live semantics.

Runtime image excludes company corpus and advisor prompt data. Profiles are a separate versioned mount. Secrets are read from runtime files. Startup does not migrate/import/index or install anything.

Restart marks incomplete persisted jobs interrupted rather than automatically rerunning paid operations. Upgrades must drain in-flight sessions. Company conclusions enter reviewed wiki proposals, never automatic company fact.
