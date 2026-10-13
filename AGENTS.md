# Agent operating rules

This is `bughunt8/website-council`, not `bughunt8/skills` or `bughunt8/www-resume`. Read [README.md](README.md), the linked document spine, and [deployment instructions](docs/DEPLOYMENT.md) before changing it.

## Boundaries

- Make changes on `staging` or a feature branch. Do not push directly to `main`.
- Use the canonical checks, staging, promotion PR, and production pipeline.
- Cloudflare Pages is staging-only. Production is AWS S3/CloudFront at `council.profitriseco.com`, with Cloudflare DNS.
- Do not overwrite other Cloudflare projects, AWS buckets/distributions, or existing Ronald Ng and Profit Rise sites.
- The public website is a static replay viewer. Never silently enable live API calls.
- Never publish `sessions/` by glob, rsync the repository root, or expose `.claude/`, `.env`, API keys, local decisions, or filesystem paths.
- Only the three entries in `scripts/build.mjs` are approved public examples. Adding one requires an explicit provenance/privacy review.
- Keep upstream MIT copyright and third-party licenses. Do not imply advisor affiliation or endorsement.
- Preserve the local `npm start` and `/roast-room` workflow. Keep paid smoke tests outside public CI.
- User brief text stays in page memory. Do not add persistence, analytics, capture forms, or network transmission without explicit approval.
- Do not add Cloudflare credentials or AWS account credentials to the repository. Use the production environment's scoped GitHub OIDC role, not another repo's AWS keys.
- No em dashes, decorative emojis, generic AI marketing language, or invented evidence in original copy. Keep original quoted records clearly attributed.

## Validation

Run `npm run check` and `npm test`. Test desktop/mobile, both themes, real controls, downloads, network recovery, dialog keyboard focus, and production CSP. Changes are not deployed merely because local tests pass.

Check `release.json` against the exact commit after deployment. Staging Pages HTTP success, AWS distribution qualification, ACM issuance, authoritative DNS, and valid custom-domain HTTPS are separate facts. Do not collapse them into a claim that `council.profitriseco.com` is live.

## Handover

Update [docs/QA.md](docs/QA.md) with actual receipts and track unfinished infrastructure work as GitHub issues. Record the staging project and production resource identities, target branch, and authorized scope without secret values. Link new operating documents from README and this file.
