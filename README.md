# Council execution service

Profile-based company discussion at `council.profitriseco.com`. This public fork retains [Roast Room's](https://github.com/nateherkai/roast-room) advisor engine, then adds an authenticated Node.js web execution service, source-bounded company memory, streaming, private session persistence, limits, and runtime-injected configuration.

The earlier replay-only delivery did not meet the requested live service. Examples now remain optional demonstrations. S3/CloudFront-only production is retired; S3 cannot execute the council.

## Execution

Your decision -> approved company identity and usage guard -> private Brain MCP recall -> frozen company evidence -> model-backed advisor profiles -> debate and vote -> chair's conclusion -> streamed browser results and a private stored session.

Model inference runs at the configured API provider, not in S3 or inside the advisor profile files. AWS runs the Node orchestration container. The original engine currently supports Anthropic API execution and per-seat/chair model selection.

## Immutable runtime

`Dockerfile` prebuilds UI and production dependencies. Runtime contains executable code only. It does not contain private Profit Rise information, live configuration, keys, database state, OAuth grants, or user sessions. Original public advisor data is packaged separately by `node scripts/profile-bundle.mjs`.

The private [Backend repository](https://github.com/Profit-Rise-Consulting/Backend) owns single-EC2 containers, volumes, identity, subdomain routing, upgrade and cutover. The private [Brain repository](https://github.com/Profit-Rise-Consulting/Brain) owns company knowledge/GBrain memory. Neither is mirrored into this public repository.

Required runtime inputs include:

- `COUNCIL_CONFIG_FILE`: reviewed identity, model mapping, disclosure approval and limits.
- `COUNCIL_PROFILES_DIR`, `COUNCIL_AGENTS_DIR`: mounted versioned advisor data.
- `COUNCIL_SESSIONS_DIR`: persistent private session volume.
- `ANTHROPIC_API_KEY_FILE`, `BRAIN_MCP_TOKEN_FILE`: separate runtime credentials.

Start the prebuilt image without installing packages or cloning source. Missing memory, identity, provider or approval inputs block paid execution. No silent sample replay substitutes for a new run.

## Development and tests

```sh
npm ci
npm run check
npx playwright install chromium
npm test
```

Tests use synthetic/mocked model transport, not paid company-model calls. The retained local `npm start` and `/roast-room` Claude Code workflow remain available; they are separate from the cloud service.

## Handover

Implementation is paused. Start with [HANDOVER](HANDOVER.md), then [AGENTS](AGENTS.md), [PRD](docs/PRD.md), [TRD](docs/TRD.md), [TOGAF ADM](docs/TOGAF-ADM.md), [TDD](docs/TDD.md), [wireframe](docs/WIREFRAME.md), [design](docs/DESIGN.md), [deployment](docs/DEPLOYMENT.md), [QA](docs/QA.md), [upstream provenance](docs/UPSTREAM.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

Cloudflare Pages is only an optional frontend preview. Production execution belongs to the private Backend's EC2/Tunnel platform. Container build, registry publication, runtime configuration, actual memory recall, paid model qualification and live-domain activation are separate receipts.

Live deployment, model keys, approved company corpus/vector readiness and cutover remain operator qualification steps. No paid Profit Rise council has yet been executed or claimed as qualified.
