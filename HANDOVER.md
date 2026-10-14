# Council execution-service handover

Implementation is paused at the owner's request on 2026-10-14. This public handover records the executable contract and remaining qualification without exposing company knowledge, host inventory, runtime credentials or private release manifests.

The full operational handover is in private [Backend/HANDOVER.md](https://github.com/Profit-Rise-Consulting/Backend/blob/main/HANDOVER.md). Authorized operators should also read its decision/dependency/gap records and resume checklist. Private [Brain](https://github.com/Profit-Rise-Consulting/Brain) owns company memory. Neither private repository is mirrored into this public source tree.

## Baseline and required behavior

Implementation baseline is `9d4e882b22c2678e73a13be71986e1d8239bc09f` on `feat/live-service-containers`, before the documentation-only handover commit. [PR 5](https://github.com/bughunt8/website-council/pull/5) targets staging and was open at inventory. [PR 1](https://github.com/bughunt8/website-council/pull/1) promotes the older staging design; do not promote it before the executing service has passed review.

The final hostname is `council.profitriseco.com`. The product must accept a discussion brief, retrieve authorized Profit Rise information, run profile-based advisor rounds and produce a chair conclusion. Static recorded replay alone is not the requested product.

The earlier replay-only and S3/CloudFront-only production direction is superseded. Cloudflare provides ingress/access and AWS hosts the running Node service. S3 can hold private recovery backups, not execute models. Optional frontend preview and recorded examples remain explicitly separate from a newly executed discussion.

## Read before changing code

Read [AGENTS](AGENTS.md), [PRD](docs/PRD.md), [TRD](docs/TRD.md), [TOGAF ADM](docs/TOGAF-ADM.md), [TDD](docs/TDD.md), [wireframe](docs/WIREFRAME.md), [design](docs/DESIGN.md), [deployment](docs/DEPLOYMENT.md), [QA](docs/QA.md), [upstream provenance](docs/UPSTREAM.md) and [third-party notices](THIRD_PARTY_NOTICES.md). Preserve upstream attribution and do not imply that simulated advisors or their real-world names endorse this service.

## Implemented candidate

`service/server.mjs` is the cloud Node server on port 4730. It exposes health/status, runtime catalog, login and owner-scoped council creation/history/event routes. The retained `app/server.mjs` local Claude Code workflow is separate.

Execution validates a Cloudflare-signed identity and explicit approved email, checks input/origin/usage, retrieves source-scoped private Brain evidence, hashes the evidence and runs the retained discussion engine. The same company evidence is injected into every advisor/chair system prompt. SSE streams progress and a private filesystem journal records sessions under hashed owners.

Default bounds are one concurrent run, five attempts per user per day, 25 provider calls, 16,000 context characters, 8,000 prompt characters, approximately 14,000 request-body characters and a 20-minute deadline. SSE uses a 15-second heartbeat. Incomplete sessions are marked interrupted after restart; they do not automatically trigger another paid run.

The current inference adapter calls Anthropic's API. The EC2 container runs orchestration, not local model weights. Advisor profiles are instructions/data. Default advisor/chair and per-seat model IDs are runtime inputs and have not been live-qualified. Other providers and local inference are not implemented.

## Immutable image and runtime inputs

The Node 22 image contains executable code, built UI and production jose `6.2.1`. It does not bake private company knowledge, live configuration, keys, OAuth state, profile/demo data or sessions. Public advisor data is packaged separately with `node scripts/profile-bundle.mjs`.

Inject:

```text
COUNCIL_CONFIG_FILE       reviewed JSON, identity/model/source/limit settings
COUNCIL_SESSIONS_DIR      private persistent session directory
COUNCIL_PROFILES_DIR      versioned advisor profile directory
COUNCIL_AGENTS_DIR        versioned agent instruction directory
COUNCIL_SEATS_FILE        versioned seat metadata
COUNCIL_DEMO_DATA_DIR     optional reviewed example bundle
ANTHROPIC_API_KEY_FILE    provider secret, server-side only
BRAIN_MCP_TOKEN_FILE     separate read-scoped memory token
```

Configuration requires execution/disclosure approval, valid provider model mapping, approved Access issuer/audience and an explicit `access.allowedEmails` list. Missing or unauthorized memory must fail before provider calls. Do not permit callers to override model IDs, source IDs, budgets or owner identity.

The Brain MCP client negotiates protocol `2025-03-26`, calls `search` for the configured source and rejects crossed-source, stale, unconfirmed or withheld evidence. Production requires semantic readiness. A finite cosine value is only a heuristic; actual pinned-Brain vector readiness still needs acceptance.

Node runs nonroot and needs correct injected-file ownership. Private sessions must survive an image replacement without being exposed by static routes, public artifacts or global session listing. The current filesystem journal is single-process and not safe for multi-replica job/quota coordination.

## Frontend design and states

The live-first decision room uses the advisor table, limestone/olive semantic colors, serif introduction and light/dark themes. The primary action submits an authenticated discussion. It must never silently substitute an example when the service, company memory or model provider is unavailable.

Show distinct disconnected, authorization-required, execution-disabled, submitting, retrieving, running, interrupted, failed and completed states. Optional examples carry an explicit recorded/demo label. A conclusion is a model judgment grounded in the retrieved evidence, not a verified company fact or a calibrated probability.

The documentation-only handover replaces obsolete static-only architecture, test and wireframe sections. It does not claim every requested failure state has been exercised against production.

## Evidence and limitations

[Candidate checks](https://github.com/bughunt8/website-council/actions/runs/38450492060) passed 21 Node tests and seven browser tests. The engine test exercised 21 advisor and four chair requests with the same synthetic evidence using mock transport, not paid inference.

[Image CI](https://github.com/bughunt8/website-council/actions/runs/38450486614) built/published the Node executable and booted it with runtime-injected config/profiles and execution disabled. It checked health/catalog and the absence of baked advisor/demo data. That is not evidence of a live hostname, actual Brain vector recall or approved company-model execution.

No paid Profit Rise council, actual provider model-ID test or accepted production Brain endpoint was executed by this workstream. Private Backend's image lock and recovery remain incomplete. Concurrent operational work elsewhere means current hosting must be refreshed from authorized inventories rather than inferred from this public branch.

## Remaining implementation and acceptance

- Review PR 5 and preserve feature-to-staging-to-main promotion.
- Qualify real Brain MCP behavior, source grants, vector readiness, bounded responses and evidence integrity.
- Test malformed/null JSON, multibyte body limits, upstream error redaction and cancellation.
- Review shallow evidence freezing and ensure nested evidence cannot change during a run.
- Establish real financial spend caps and retention. Local attempt/call limits do not provide an account-wide currency ceiling.
- Add a transactional shared job/lock store before multiple service replicas.
- Qualify real vendor model IDs and one separately approved low-budget company discussion.
- Prove signed identity, wrong-user/audience denial, owner-private history, SSE and restart on actual origins.
- Complete Backend's runtime ownership, immutable release, fresh-host data/config restore and fenced ingress acceptance.

## Safe source checks

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
npm test
```

Use Node 22 for production-aligned checks. Playwright, axe and Wrangler are development/preview tools, not runtime dependencies. `npm run deploy:production` hands off to Backend; the retained static AWS files do not define current production.

The handover does not authorize paid tests, source disclosure, live deployment, new infrastructure, a DNS change or PR merges. Resume only on renewed owner direction and preserve the private/public boundary in all future docs and artifacts.
