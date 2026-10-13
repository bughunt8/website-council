# Architecture decisions

## Vision

Make the upstream decision method publicly inspectable without operating a paid, unauthenticated AI service.

## Business architecture

Visitors explore public recorded examples and prepare their own local command. Ronald Ng's repository and portfolio are linked. There is no lead collection or transaction flow.

## Application and data architecture

Separate the static public viewer from the private Node/Claude Code execution path. Publish only reviewed upstream examples. Preserve the upstream brains and council protocol in git, but not in website output.

## Technology architecture

Use Cloudflare Pages direct uploads driven by GitHub Actions. Keep Route53 authoritative DNS. Use independent staging and production Pages projects so staging cannot overwrite the production project. Cloudflare documents external-DNS subdomain support at https://developers.cloudflare.com/pages/configuration/custom-domains/.

## Migration and governance

Fork upstream with full attribution. Build and test on staging. Promote by PR, deploy the exact main revision, then validate release metadata and custom-domain HTTPS separately. No existing website is migrated.

## Change management

Upstream refreshes arrive through feature PRs with pinned provenance, privacy checks, and replay tests. A future public live runner needs new architecture approval; it is not a configuration toggle on this website.
