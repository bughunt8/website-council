# Architecture decisions

## Vision

Make the upstream decision method publicly inspectable without operating a paid, unauthenticated AI service.

## Business architecture

Visitors explore public recorded examples and prepare their own local command. Ronald Ng's repository and portfolio are linked. There is no lead collection or transaction flow.

## Application and data architecture

Separate the static public viewer from the private Node/Claude Code execution path. Publish only reviewed upstream examples. Preserve the upstream brains and council protocol in git, but not in website output.

## Technology architecture

Use Cloudflare Pages direct uploads for staging and a dedicated AWS S3/CloudFront stack for production. Preserve the existing Cloudflare-authoritative `profitriseco.com` zone. The confirmed hostname is `council.profitriseco.com`. The staging/production hosting split follows `bughunt8/www-resume`, but none of its infrastructure resources or secrets are reused.

AWS recommends OAC for private S3 origins at https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html. The production CloudFront certificate must be in ACM `us-east-1`, as documented at https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html. The bucket defaults operationally to the reference region `ap-east-1`; the template uses its selected stack region.

## Migration and governance

Fork upstream with full attribution. Build and test on staging. Promote by PR, deploy the exact main revision, then validate release metadata and custom-domain HTTPS separately. No existing website is migrated.

## Change management

Upstream refreshes arrive through feature PRs with pinned provenance, privacy checks, and replay tests. A future public live runner needs new architecture approval; it is not a configuration toggle on this website.
