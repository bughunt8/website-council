# Decision room layout and states

The primary user path is a new authenticated council discussion. Recorded examples remain optional and explicitly labeled. This replaces the earlier replay-only wireframe.

## Desktop

The header contains Council identity, room navigation, guide, source and theme control. The introduction explains advisor simulations and company-evidence boundaries without claiming model or advisor endorsement.

The main room keeps the broad advisor-table stage and an active argument card. The decision panel supplies a brief, mode and primary start action. Show backend/authorization/execution state before the user submits private content.

The growing transcript shows discussion progress, votes and chair conclusion. Session details identify the evidence hash and usage without exposing keys or another user's work. Optional recorded examples occupy a distinct path with a visible demo label and their own replay controls.

## Mobile

Use a single column with the advisor stage above the decision panel. Wrap nameplates and controls; do not force horizontal scrolling to submit or read a verdict. Dialog forms and transcript become one column.

Preserve visible labels, focus indicators, readable contrast and native dialog keyboard behavior. Reduce nonessential motion when requested.

## Live execution state contract

| State | User-facing requirement |
|---|---|
| Disconnected preview | State that no live backend is connected. Do not send a private brief to a static preview or silently replay a sample. |
| Authorization required | Explain company execution requires an approved identity and provide the supported login path. |
| Execution disabled | Explain configuration/approval is incomplete. Do not represent a disabled service as a live paid run. |
| Ready | Show reviewed service readiness and a start action with the brief/mode. |
| Submitting | Prevent duplicate requests and show progress. |
| Retrieving evidence | Distinguish company-memory retrieval from model discussion. Failure blocks provider calls. |
| Running | Stream actual advisor/chair events with current progress and transcript. |
| Interrupted or failed | Describe the failure without leaking private upstream text. Do not automatically incur another paid run. |
| Complete | Show votes/conclusion, evidence identity and private session/report actions. Mark model judgment as judgment. |

These are implementation/acceptance requirements, not a claim that every state is production-qualified. The current candidate and remaining tests are recorded in [HANDOVER](../HANDOVER.md) and [TDD](TDD.md).

## Optional recorded states

Example selection, replay, pause/resume, speed/seek, advisor round tabs and recorded verdict/report remain available only under clear recorded/demo labels. Switching to this path must be explicit; it cannot be the fallback result of a failed live request.

## Private and public boundaries

The public entry experience must not list company sessions or embed company evidence in static assets. A logged-in user sees only their sessions, and source/provenance detail follows the authorized evidence contract.

Operational inventory, private company documents, tokens, model keys and deployment manifests remain in private Backend/Brain. Current live routing and Access-path behavior still require acceptance before launch.
