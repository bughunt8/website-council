# QA and delivery status

## Current direction, 2026-10-14

The user confirmed `council.profitriseco.com`. Keep the reference Cloudflare-staging/AWS-production split. The earlier Ronald Ng hostname, AWS-only direction, and Cloudflare-only production plan are superseded.

Cloudflare remains authoritative DNS for `profitriseco.com`. There is no Route53 change. The approved DNS credential can read this zone and found no existing `council.profitriseco.com` record. Its Pages access request failed with an authentication error, so it was not used to create or deploy Pages.

## Website qualification

The viewer includes three public recorded replays, complete advisor cards and verdicts, browser PDF/report export, local-only brief preparation, both themes, and retained private Claude Code execution. The upstream local runner is unmodified. No paid AI smoke test or new live Claude Code council was run.

The previous qualifying run passed four build/privacy tests and six browser tests at `cd5eef70ca19d88af7806f84fd5ed52740b5ddca`. Remote [PR validation](https://github.com/bughunt8/website-council/actions/runs/38415940379) and [staging source validation](https://github.com/bughunt8/website-council/actions/runs/38415931850) passed. The [previous staging deployment](https://github.com/bughunt8/website-council/actions/runs/38415931752) failed its missing-provider-setting preflight; this was not a successful deployment.

The domain/hybrid update adds seven deployment tests for isolated targets, branch/role guards, valid and rejected caller/origin fixtures, dist-only non-destructive uploads, private OAC/scoped OIDC infrastructure, and exact canonical metadata. Its final local and remote qualification receipts are recorded in the implementation PR.

The 2026-10-14 local run passed all 11 build/privacy/deployment tests and all six browser tests. The complete dependency audit reports zero vulnerabilities. A separate staging build confirms the canonical hostname, staging release marker, robots exclusion, and retained staging banner.

Local `cfn-lint 1.57.2` reports no template errors. It emits W1030 for the certificate parameter's empty initial default; the CloudFormation rule and condition prevent that default from being attached when the custom domain is enabled. CI treats schema errors as failures and keeps the warning visible. Actual AWS change-set validation and execution remain unqualified until authorized provisioning.

## Infrastructure evidence

- The public fork and protected `main` exist. The implementation remains on `staging` in [PR 1](https://github.com/bughunt8/website-council/pull/1).
- GitHub staging and production environments exist and restrict deployments to their corresponding branches.
- Staging project name and Cloudflare account ID are configured. A Pages-capable token is still needed.
- Production now uses an AWS-only workflow and a dedicated CloudFormation template. AWS target outputs and OIDC role are not yet provisioned.
- Cloudflare DNS access was verified for the confirmed parent domain. No DNS mutation was made.
- No Cloudflare staging release, AWS production distribution, issued ACM certificate, or valid production-domain HTTPS endpoint has yet been qualified.

## Blocking acceptance work

1. Provision and qualify `website-council-staging` with an authorized Pages token.
2. Connect authorized AWS access and review/provision the dedicated Council stack and OIDC role.
3. Populate production variables from actual stack outputs, not guesses.
4. Qualify staging, promote the reviewed PR, and qualify the AWS distribution.
5. Issue/validate the ACM certificate in `us-east-1`.
6. Attach the exact custom domain and add its verified Cloudflare CNAME.
7. Verify production HTTPS, assets, headers, and release SHA.

Issues [2](https://github.com/bughunt8/website-council/issues/2), [3](https://github.com/bughunt8/website-council/issues/3), and [4](https://github.com/bughunt8/website-council/issues/4) track staging authorization, exact-domain activation, and AWS provisioning. There is no claim that local tests, an app preview, or an infrastructure template constitute a live production deployment.
