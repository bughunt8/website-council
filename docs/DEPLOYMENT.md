# Deployment runbook

## Targets

| Environment | Branch | Cloudflare Pages project | Canonical host |
|---|---|---|---|
| Staging | `staging` | `website-council-staging` | `website-council-staging.pages.dev` |
| Production | `main` | `website-council` | `website-council.pages.dev`, then `council.ronald.ng` |

These are intended names, not a claim the remote projects exist. The initial handover status is in [QA.md](QA.md).

## Provision once

Create the two Pages direct-upload projects with production branch `main`. The staging workflow intentionally deploys the staging checkout to that separate project's main branch, so the staging canonical pages.dev host points to the current staging build.

Create GitHub environments `staging` and `production`. For each, configure:

- Secret `CLOUDFLARE_API_TOKEN`, scoped to Account / Cloudflare Pages / Edit for the intended account.
- Variable `CLOUDFLARE_ACCOUNT_ID`.
- Variable `PAGES_PROJECT`, exactly the project name in the table.

The reusable workflow fails closed on missing settings and refuses an environment-to-project mismatch. Values from the old repository's Hostinger environments are not applicable. GitHub secrets cannot be read back or copied from another repo; provision the new environments through the provider's secure controls.

For a manual operator deployment:

```sh
npm ci
npm run build
npm run deploy:staging
```

Do not paste API tokens into commands or source files. Configure Wrangler through secure environment handling or use an approved credential proxy.

## Promotion

Push changes to `staging`. The staging pipeline validates the exact commit before deploying. Check CI and the staging website. Open a PR from staging to main with a human or approved automation identity:

```sh
gh pr create --repo bughunt8/website-council --base main --head staging \
  --title "Promote Council staging" --body "Tested staging revision. Review deployment and QA evidence."
```

The B1 workflow also opens this PR if `PROMOTION_TOKEN` is configured as a fine-grained token with contents/read and pull-requests/write. It fails without that token, rather than relying on PR events suppressed by `GITHUB_TOKEN`.

Merging the PR triggers B2 production. Both deployment pipelines rerun reusable validation, build the checked-out SHA, deploy through their matching GitHub environment, and fetch `release.json` to prove the Pages host serves that SHA.

## Custom domain

Cloudflare's documentation allows a subdomain using external authoritative DNS. No nameserver migration is required. See https://developers.cloudflare.com/pages/configuration/custom-domains/.

1. Associate `council.ronald.ng` with the production `website-council` Pages project through its custom-domain setup.
2. At authoritative Route53, create only this new record:

   `council.ronald.ng. 300 IN CNAME website-council.pages.dev.`

3. Do not change apex, mail, `skills`, `resume`, `aigc`, or other records.
4. Wait for Pages domain activation and certificate issuance.
5. Verify authoritative DNS, HTTPS, the site title, assets, and exact `release.json` revision at `https://council.ronald.ng/`.

Adding only the DNS CNAME without the Pages association can produce a 522 error. Restrictive CAA records can also block certificate issuance. Inspect rather than overwrite existing CAA policy.

## Security and rollback

Only deploy `dist/`. Do not enable the local API runner in Cloudflare. Staging builds block indexing and display a staging banner. Production and staging are separate projects and environment variable sets.

Rollback by reverting the promotion on staging, rerunning tests, and promoting a reviewed revert to main. The Pages dashboard can also restore a prior production deployment; record its SHA and verify `release.json`. Never delete other Pages projects or modify unrelated domains to fix this site.
