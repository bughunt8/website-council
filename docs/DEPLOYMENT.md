# Deployment runbook

## Confirmed targets

| Environment | Branch | Hosting | Host |
|---|---|---|---|
| Staging | `staging` | Cloudflare Pages project `website-council-staging` | `website-council-staging.pages.dev` |
| Production | `main` | Dedicated private S3 bucket and CloudFront distribution | Verified distribution hostname, then `council.profitriseco.com` |

This split follows https://github.com/bughunt8/www-resume. The canonical domain was explicitly confirmed on 2026-10-14 Asia/Hong_Kong. The earlier domain and Cloudflare-only production proposal are superseded. No existing website is being migrated.

`profitriseco.com` is already authoritative on Cloudflare. Keep its nameservers and other records unchanged. No Route53 zone or nameserver migration is needed.

## Cloudflare staging

Create only the `website-council-staging` Pages direct-upload project with production branch `main`. The staging workflow uploads the staging checkout to that separate project's main branch so its canonical pages.dev hostname tracks staging.

GitHub environment `staging` requires:

- Secret `CLOUDFLARE_API_TOKEN`, with Account / Cloudflare Pages / Edit for the authorized account.
- Variable `CLOUDFLARE_ACCOUNT_ID`, now populated from the authorized `profitriseco.com` zone metadata.
- Variable `PAGES_PROJECT=website-council-staging`.

The saved DNS/tunnel credential can read the domain's DNS but was denied Pages access. Do not repurpose it as a Pages token or broaden its scope without authorization. The staging workflow fails closed until a suitable token is securely provisioned.

```sh
npm ci
COUNCIL_STAGING=1 npm run build
npm run deploy:staging
```

Use secure Wrangler credentials. Never paste token values into source, issues, logs, or commands.

## AWS production bootstrap

An authorized operator provisions new Council resources in the intended AWS account. The reference uses `ap-east-1` for the S3 origin. Do not reuse the reference website's bucket, distribution, role, or stored access keys.

1. Confirm the account, region, and absence of conflicting Council resource names.
2. Confirm the account has the GitHub OIDC provider `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`. Create it only if absent; do not replace a shared provider.
3. Review `infrastructure/aws-production.json` and create the initial stack without a custom domain:

   ```sh
   aws cloudformation deploy \
     --template-file infrastructure/aws-production.json \
     --stack-name website-council-production \
     --region ap-east-1 \
     --capabilities CAPABILITY_NAMED_IAM \
     --no-execute-changeset
   ```

4. Review the actual change set and approve execution. The template creates only a dedicated bucket, CloudFront/OAC/cache/header policies, bucket policy, and a Council deployment role. It does not manage DNS.
5. Wait for CloudFront `Deployed`. Record stack outputs in GitHub environment `production`:

   - `AWS_REGION`: actual stack region.
   - `AWS_ROLE_ARN`: output `AWSRoleArn`.
   - `S3_BUCKET`: output `S3Bucket`.
   - `CLOUDFRONT_DISTRIBUTION_ID`: output `CloudFrontDistributionId`.
   - `AWS_SITE_URL`: output `AWSSiteURL`.
   - `CUSTOM_DOMAIN_ACTIVE=false` until real-domain qualification.

The OIDC role trusts only `repo:bughunt8/website-council:environment:production`. It can read/write this bucket and invalidate/read this distribution. It cannot delete objects, change infrastructure, change DNS, manage certificates, or write another site's bucket. GitHub's production environment allows only `main`.

The bucket blocks public access, enforces TLS and bucket ownership, encrypts with SSE-S3, and keeps versions. OAC permits CloudFront read access only for this distribution. AWS's OAC documentation is https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html.

## Promotion and deployment

Validate and qualify the actual Cloudflare staging host before opening or merging a staging-to-main promotion PR. Do not bypass the open PR just because local tests pass.

```sh
gh pr create --repo bughunt8/website-council --base main --head staging \
  --title "Promote Council staging" --body "Tested staging revision. Review QA and hosting receipts."
```

Merging triggers B2, which reruns validation and calls the AWS-only production workflow. It assumes the scoped OIDC role, validates branch/resource ownership, uploads only `dist/`, excludes Cloudflare metadata, waits for invalidation, and verifies the distribution's exact `release.json` SHA. No S3 `--delete` is used.

The B1 workflow can open a promotion PR if `PROMOTION_TOKEN` is securely configured. Otherwise use the human `gh` workflow; do not rely on `GITHUB_TOKEN` to trigger PR checks.

## Production certificate and DNS

1. Request an ACM public certificate for `council.profitriseco.com` in `us-east-1`. CloudFront requires that region: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html.
2. Add only the AWS-provided certificate-validation CNAME in the existing Cloudflare zone, DNS-only. Wait for ACM `ISSUED`.
3. Update the reviewed production stack with `CertificateArn=<issued ARN>` and `EnableCustomDomain=true`, preserving other parameters. This attaches the certificate and exact alternate domain.
4. Wait for the distribution update to finish, then add only:

   `council.profitriseco.com. 300 IN CNAME <verified-distribution>.cloudfront.net.`

5. Keep this record DNS-only, unproxied, so CloudFront remains the production CDN as in the reference. A later Cloudflare proxy layer would be a separate architecture change, not an implicit part of this deployment.
6. Check for conflicting hostname records and preserve existing CAA policy. Do not change apex, mail, or other Profit Rise records.
7. Verify public/authoritative DNS, valid HTTPS certificate, site title, assets, security headers, and exact release SHA at `https://council.profitriseco.com/`.
8. Set `CUSTOM_DOMAIN_ACTIVE=true` only after successful qualification so future deployments verify both the CloudFront hostname and the real domain.

DNS access is available through the approved domain credential. ACM and CloudFront still require authorized AWS access. Do not create a CNAME pointing at an invented or unqualified distribution.

## Headers and rollback

Cloudflare staging uses `_headers`. AWS does not interpret that file; production protections live in the template's CloudFront response-headers policy. Cache minimum TTL is zero so release metadata can be uncached.

Rollback by reverting on staging, validating, promoting a reviewed revert, and redeploying. Bucket versions provide recovery material but do not make rollback automatic. Do not destroy the stack or delete unrelated infrastructure to reverse a website release. Record the restored SHA and verify it at both production hosts.
