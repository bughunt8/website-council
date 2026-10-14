# Execution qualification

The scope is corrected from replay-only to authenticated Node execution with private Brain evidence and shared-EC2 immutable images. Existing recorded examples remain optional.

Local service tests cover signed issuer/audience/user validation, no-cost auth refusal, disabled execution, frozen evidence, execution/persistence, owner isolation, quota/concurrency, missing context, unsupported overrides, origin checks, and memory source/semantic guards. Provider transport is mocked; no paid company-model request has run.

Image CI builds the real executable with public profile data excluded from the final image. Actual registry digest, runtime mount/configuration, identity, vector recall, paid provider behavior, host resources and live-domain routing are independent receipts.

No existing EC2 service, database, live tunnel or DNS has been changed. Refactor PRs remain proposed until app review and private Backend cutover acceptance.
