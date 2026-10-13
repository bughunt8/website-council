# Council

A public decision room for `council.ronald.ng`, with a private local council runner. This is a public fork of [Roast Room by AI Automation Society](https://github.com/nateherkai/roast-room), pinned initially to `f5e7b631a172ecc8ef5488760654ad37f24204b0`.

The web viewer replays three recorded upstream examples. It does not run AI on the public website, accept payments, collect accounts, save user briefs, or expose a paid API key. Its brief builder creates a command for a user's local Claude Code session. Those drafts remain in page memory until downloaded or copied.

## Public website

- Seven illustrated simulated advisors, with their original source notes.
- Recorded example replay, pause/resume, speed control, chapter navigation, and verdict skip.
- Complete advisor contribution cards, option scores, dissent, conditions, and next steps.
- Downloadable verdict PDF and Markdown report, generated in the browser.
- A private brief builder for full or quick local councils.
- Light/dark themes, keyboard navigation, responsive layouts, and self-hosted assets.

The intended production domain is `council.ronald.ng`. Cloudflare hosting and custom-domain activation require separate infrastructure provisioning. A working local build or preview is not evidence that the production domain is live.

```sh
npm ci
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. Public-site development and Cloudflare deployment use Node.js 22 or newer, matching CI. The retained local runner can run on Node.js 20 without installing the development dependencies.

## Run a private council

Requirements: Node.js 20 or newer and Claude Code.

```sh
git clone https://github.com/bughunt8/website-council.git
cd website-council
npm start
```

Open `http://localhost:4730`. In another terminal, from the same repository:

```sh
claude
```

Then use:

```text
/roast-room Should I raise my prices? My options are...
/roast-room --quick Should I...
/roast-room --seats hormozi,buffett Should I...
```

The original local runner and `.claude/` skill are preserved. Claude Code subscription usage limits apply. Optional API mode uses a local `.env` and bills the user's Anthropic account. It is not connected to the static public website.

## Architecture and operations

The checks/staging/promotion structure follows [bughunt8/skills](https://github.com/bughunt8/skills). Its current Hostinger deployment is deliberately not copied. This project targets independent Cloudflare Pages projects.

- `staging` deploys to `website-council-staging`.
- A reviewed promotion PR moves a tested revision into `main`.
- `main` deploys to `website-council` through the `production` environment.
- The intended Route53 record is `council.ronald.ng CNAME website-council.pages.dev`, after Cloudflare Pages has associated the custom domain.
- No existing site or DNS record is changed by the build.

The build publishes only `dist/`, assembled from `site/`, specific upstream assets, and three explicitly allowlisted examples. It never copies the repository root, `.env`, `.claude`, or local session directories into the public output.

## Document spine

- [PRD.md](docs/PRD.md): product behavior and exclusions.
- [TRD.md](docs/TRD.md): build, privacy, replay, and runtime design.
- [TOGAF-ADM.md](docs/TOGAF-ADM.md): architecture decisions and migration boundaries.
- [TDD.md](docs/TDD.md): test inventory and acceptance gates.
- [WIREFRAME.md](docs/WIREFRAME.md): responsive layout and state map.
- [DESIGN.md](docs/DESIGN.md): visual identity, tokens, and accessibility.
- [DEPLOYMENT.md](docs/DEPLOYMENT.md): Cloudflare provisioning, secrets, promotion, DNS, and rollback.
- [UPSTREAM.md](docs/UPSTREAM.md): provenance, synchronization, and retained behavior.
- [QA.md](docs/QA.md): verification evidence and outstanding infrastructure work.
- [AGENTS.md](AGENTS.md): rules for future agents.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): attribution and licenses.

## Tests

```sh
npm run check
npx playwright install chromium
npm test
```

Tests use recorded data, not a paid AI API. `npm run smoke` is the original paid local API smoke test and is not part of CI.

## Attribution

Copyright 2026 AI Automation Society for the upstream code, MIT licensed. The Council website is an adaptation by Ronald Ng. The original copyright, font licenses, jsPDF license, and advisor source notes are retained. The simulated advisors do not represent or speak for the named people and are not endorsed by them.
