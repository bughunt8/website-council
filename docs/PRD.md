# Product requirements

## Purpose

Let public visitors understand a structured advisor debate, inspect its reasoning, and prepare a private local council. The website is a Ronald Ng open-source project adapted from Roast Room.

## Required behavior

- Display seven simulated advisor portraits and source-note links.
- Let users choose all three approved upstream examples.
- Replay the actual recorded arguments with pause/resume, speed, chapters, and skip.
- Show full contribution cards, option scores, conditions, minority objection, tests, and next steps.
- Export a recorded verdict to PDF or Markdown in the browser.
- Generate a local Claude Code brief command from a user's decision and context.
- Keep private brief text in page memory. No transmission or persistence.
- Work at 320, 375, 768, 1024, and 1440 CSS pixel widths, with light/dark modes and keyboard operation.

## Explicit exclusions

Public AI execution, public SSE, user accounts, multi-user session isolation, billing, CRM, analytics, user-session uploads, shared API keys, and production DNS changes outside `council.profitriseco.com` and its required ACM validation record.

Running live public councils would require a separately approved service design, including authentication, spend limits, abuse prevention, session isolation, retention, and provider secrets.
