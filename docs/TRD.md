# Technical requirements

## Architecture

Cloudflare Pages serves staging. Production serves the same static build from a dedicated private AWS S3 bucket through CloudFront with origin access control. Cloudflare remains authoritative DNS for `profitriseco.com`. The browser uses relative same-origin assets and three recorded JSON files. The upstream zero-dependency Node application remains a separate local program.

`scripts/build.mjs` assembles `dist/` from `site/`, allowed portrait/PDF/font directories, license text, and three exact example folder IDs. Two examples load their original events. The third uses the original viewer parser to transform its council files into equivalent events.

Timestamps are removed from the exported replay records so repeated builds at the same commit have the same bytes. `release.json` records the exact git commit and build mode.

## State

Page state holds the selected example, cards seen, replay position, speed, pause state, and theme. A request-generation counter prevents stale asynchronous session responses from overwriting a newer selection. Replay uses a single timer; changing examples or seeking cancels it.

The brief form generates a text command, optionally including `--quick`. User-entered data is never included in fetch requests, storage APIs, cookies, or catalog data.

## Security

No paid provider calls or public write endpoints. HTML insertion escapes original record content. The build has a negative test that plants a private session and proves it is not exported. No repository root deployment.

Cloudflare staging uses `_headers`. AWS production implements equivalent protections through the CloudFront response-headers policy in `infrastructure/aws-production.json`; S3 does not interpret `_headers`. These include same-origin scripts/fonts/connect, MIME sniffing prevention, a restrictive referrer policy, and disabled device permissions. Inline styles remain allowed for compatibility with the retained PDF export library. No inline scripts are allowed.

The AWS uploader requires `main`, the correct release SHA/hostname/environment, the dedicated bucket name and ownership tags, and a CloudFront origin that points to that bucket. It excludes `_headers`, uploads HTML/replay metadata with short cache lifetimes, waits for invalidation, then verifies exact release metadata. It does not delete objects. The OIDC role is restricted to the production GitHub environment and those resources.

## Operational distinction

The public cloud build requires no Node runtime or paid AI provider key. `npm start` runs the original local viewer on loopback. Optional local API mode requires the user's own `.env` and is not enabled in either cloud environment.
