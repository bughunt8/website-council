# Council architecture decisions

This document replaces the earlier static-viewer architecture. The current candidate is the executing Node service in [PR 5](https://github.com/bughunt8/website-council/pull/5); implementation is paused and production acceptance remains open.

## Vision and business architecture

An approved user submits a company decision, receives a profile-based discussion grounded in authorized company evidence and gets a chair conclusion. Public entry and source visibility must not expose private evidence or provide anonymous unbounded paid model use.

The earlier recorded-viewer delivery did not satisfy the execution requirement. Optional examples are demonstrations, not a substitute for a new discussion. No affiliation or endorsement by simulated advisors is implied.

## Application and information architecture

The browser calls Council's Node service. Before cost, the service validates identity, approved user, origin, brief, usage limits and disclosure approval. It retrieves a read-scoped company evidence pack from private Brain, hashes it and supplies the same evidence to all advisors and the chair.

The service streams rounds/votes/conclusion and persists sessions privately by owner. It does not automatically write its conclusions into company knowledge. Private source documents, vectors, credentials and sessions do not enter public repositories or example catalogs.

Brain is the official pinned GBrain executable plus a private provenance-linked wiki and dedicated Postgres/pgvector. Actual semantic retrieval and scoped OAuth are production qualification steps, not proven by keyword-only tests.

## Technology architecture

Private Backend owns one EC2 with separate prebuilt containers for CMO, Admin, Council and Brain, separate databases and external state volumes. Cloudflare Tunnel/Access handles reviewed subdomain ingress. Council's final hostname is `council.profitriseco.com`.

EC2 runs Node orchestration; the current adapter requests inference from Anthropic. Profiles contain instructions/data, not model weights. S3 is an optional private versioned recovery store and cannot run the service. Cloudflare Pages is optional frontend preview only.

Images contain executable code and production dependencies. Runtime mounts supply approved identity/model configuration, advisor profiles, company knowledge, secrets and persistent state. Private Backend automates CloudFormation, scripts and fresh-host cloud-init recovery. That recovery is not yet rehearsed end to end.

## Migration and implementation governance

Use feature PRs into staging, then reviewed promotion. [PR 1](https://github.com/bughunt8/website-council/pull/1) references the older staging design and must not precede the live-service candidate. Candidate image publication is not authorization to change a host or route.

Origin startup, database restoration and ingress cutover are separate gates. Preserve old data and fence incompatible connectors before switching traffic. Current operational state belongs in private Backend, not public documentation.

## Change management and acceptance

Preserve pinned upstream provenance, licenses, identity checks, source boundaries and per-run evidence consistency on refreshes. New providers, local inference, horizontal scaling, public anonymous execution and automatic knowledge writeback need separate design/review.

Read [HANDOVER](../HANDOVER.md) for current evidence and gaps. Production requires actual source/vector/model/access/restore acceptance and separate disclosure, spending and cutover approval. Static-hosting templates retained in this repo are historical, not current production authority.
