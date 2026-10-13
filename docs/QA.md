# QA and delivery status

## Initial qualification, 2026-10-13

The first implementation has a static browser viewer, three public upstream replays, complete verdicts, in-browser PDF/report export, a local-only brief builder, both themes, and retained private Claude Code execution.

The upstream Node runner remains unmodified. No live Claude Code council or paid API smoke test was run during public-site qualification.

## Test evidence

The initial local build gates passed four tests. Browser tests verify replay controls, all examples, private briefs, keyboard focus, accessibility, five responsive widths, and network recovery. The final qualifying run and remote CI receipts will be recorded before promotion.

The first screenshot review found advisor nameplate overlap on mobile due to explicit image height. Portrait height now follows width. The viewport test includes nameplate-to-card overlap detection. Replay excerpts are shorter on mobile while full arguments remain in the transcript.

The first accessibility scan ran mid-theme-transition. The final test honors reduced motion so its contrast scan checks settled semantic colors, and visual review separately inspects both normal themes.

Wrangler was initially resolved to an older vulnerable tool version. It is now pinned to `4.150.0`; the refreshed lockfile's complete `npm audit` reports zero vulnerabilities. CI uses Node.js 22 to meet its engine requirement. There are no production Node dependencies.

## Infrastructure status

The public GitHub fork exists. GitHub Actions is enabled. Staging and production GitHub environments exist, with project names set to `website-council-staging` and `website-council`.

Cloudflare and AWS connectors were disconnected at the initial check. The saved Cloudflare credential did not list accessible accounts, so it was not used to create or deploy Pages projects. No provider scope was broadened and no secrets from other repositories were read.

No Cloudflare Pages deployment, custom-domain association, Route53 CNAME, or valid `council.ronald.ng` HTTPS endpoint has yet been verified. The public hostname initially failed DNS resolution. The build and preview do not claim to satisfy domain activation.

## Required infrastructure completion

1. Obtain authorized Cloudflare Pages access for the target account.
2. Create both isolated Pages projects.
3. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the new repository's respective environments.
4. Run and qualify staging deployment.
5. Qualify the production Pages host.
6. Associate `council.ronald.ng`, then add only its Route53 CNAME.
7. Verify exact release SHA and HTTPS at the custom hostname.

The runbook describes those steps. GitHub issues track blocked infrastructure work.
