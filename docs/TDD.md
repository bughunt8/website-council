# Test-driven delivery

## Automated gates

- Export exactly seven seats and three approved samples.
- Plant an unrelated private example and prove it cannot be published.
- Reject publishing repo internals and persistent browser storage.
- Rebuild the same revision and compare replay bytes.
- Exercise replay to verdict with pause/resume, chapters, PDF and report download.
- Exercise every sample, advisor cards, and quick/full brief command.
- Assert no POST request contains a private brief.
- Run axe WCAG A/AA scans for both light and dark themes.
- Check viewport fit at 320, 375, 768, 1024, and 1440 pixels.
- Fail catalog loading and prove the recovery button works.

## QA inventory

The initial room must show seven advisors, the example label, the recorded-decision context, and the starting action. Inspect both themes at desktop and mobile widths.

Check every meaningful control: main navigation, theme, advisor cards, sample selection, watch, pause/resume, replay speed, all available chapters, skip, verdict, PDF/report download, details expansion, dialog close/Escape, brief form, quick checkbox, command copy/fallback, and brief download.

Exploratory cases include rapid example switching while data loads, changing examples mid-replay, network failure/recovery, a missing illustration, and clipboard permission denial. No example may be described as a new live AI response.

## Infrastructure acceptance

Seven deployment tests cover provider separation, isolated targets, a valid target fixture, unscoped callers/incorrect origins, dist-only non-destructive uploads, private OAC/scoped OIDC infrastructure, and exact canonical metadata. CI also pins `cfn-lint` for template schema checking.

Workflow completion is not domain acceptance. Confirm staging Pages release metadata, production CloudFront release metadata, issued ACM certificate, Cloudflare DNS CNAME resolution, a valid HTTPS certificate, main HTML, and asset loading on `council.profitriseco.com`.
