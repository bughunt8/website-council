# Validate an offer

This feature runs in the authenticated Node service. `/offers.html` lists only the signed-in user's assigned offers; static preview has no private catalogue. No records, real pitches, payment details or keys belong in this repository or in its Docker image.

## Two decisions, kept separate

- **Pilot gate.** An operator approves a fee floor in integer minor currency units for a particular offer and pitch. One pilot must have a verified corporate signatory, a referenced signed agreement and independently reviewed evidence of settled net payment. Both the agreement fee and settled net payment must individually meet or exceed that floor in the same currency. Never pool smaller deals, convert currencies, or accept intent, an unsigned quote, an invoice alone, a free trial or simulated enthusiasm. The outcome is either `blocked` or `eligible-for-review`. No spending, campaign or launch is triggered.
- **Objection review.** An owner may separately run three simulated business buyers or three simulated consumers. The provider sees only the approved pitch and each role, never the owner, fee floor, contracts, payment evidence or Brain. Each role selects a potential concern and identifies a verbatim phrase from the pitch. The service returns that phrase and an interview question from a fixed set. It intentionally has no field for conversion, willingness to pay, propensity, testimonials, purchase votes or a demand forecast. Repetition is not evidence of prevalence.

## Operator setup

Use the existing private `COUNCIL_CONFIG_FILE`. An absent `offerValidation` section leaves the feature empty and makes no provider calls. Example below uses fictitious values and starts with a blocked gate and model execution off.

```json
{
  "offerValidation": {
    "simulationApproved": false,
    "offers": [{
      "id": "diagnostic",
      "owner": "<authenticated owner hash>",
      "title": "Example diagnostic",
      "panel": "business",
      "pitch": "A fixed-scope pilot with a written report.",
      "floor": {
        "currency": "HKD",
        "minor": 10000,
        "approvalRef": "floor-review-example-1",
        "pitchSha256": "ba65761b177c33633161c43066bd367bedd160e4d6f7c27a3bc1490f7c4e2e22"
      },
      "pilots": []
    }]
  }
}
```

The owner is the existing Access identity digest, not an email or header supplied by the browser. Use `consumer` instead of `business` for a consumer-facing offer. `10000` minor units is HKD 100.00 in this example, not a recommended commercial floor. Hash the exact UTF-8 pitch with SHA-256; whitespace counts. Issue a new `approvalRef` on every floor revision. Restart with the new reviewed config; a cached browser result is not authorization to invest.

A private operator, not a model, verifies the underlying records. To record a qualifying pilot, append one entry with `offerId`, `pitchSha256`, `floorApprovalRef`, `currency`, `companySigned: true`, `companyRef`, `signedAgreementRef`, `settledPaymentRef`, `reviewRef`, `contractedMinor`, `settledNetMinor` and `status: "verified"`. Use opaque references to the private originals; do not put documents in the web root. Update net settlement and revoke verification after a refund, chargeback or rescission. The service checks the operator's attestation; it does not verify signatures cryptographically, query the bank or monitor refunds. An external spending system would need its own approval control.

For simulation only: review the exact redacted pitch and set `simulationPitchSha256` on its offer to that digest. `simulationApproved`, existing `executionEnabled` and `providerDisclosureApproved` must all be true. A server-configured seat model, provider key and at least three available configured calls are required. Each request consumes one daily attempt, shares Council's concurrency limit, and reserves at most three provider attempts total, including retries. Changing the pitch invalidates the approval. The pilot gate itself requires no provider call, even when investment is blocked.

## API and storage

| Request | Result |
| --- | --- |
| `GET /api/offers` | Owner-scoped pitches, current gate result and per-pitch simulation availability. Supporting document references are not returned. |
| `POST /api/offers/:id/objections` | Accepts exactly `{"pitchSha256":"…"}`. Returns `201` only if the entire panel completes. Requires signed identity, approved version, concurrency, quota and disclosure checks. |
| `GET /api/offers/:id/objections` | Latest completed review for this owner, offer, pitch hash and panel type, or `latest: null`. |

Results contain the run ID, timestamp, method, model, pitch hash and roles. Store the latest complete run atomically in the private Council data directory. An unsuccessful rerun does not overwrite a previous result. A changed pitch gets a different storage key. There is no cross-owner listing, model writeback to Brain, public artifact, automatic paid resumption, or client endpoint for changing evidence. This version does not maintain a longitudinal research archive.

## Council ballot integrity

An eligible seat contributes at most one ballot in a formal vote. Accept `Endorse`, `Endorse with amendment`, `Dissent`, or `Abstain` on a single `VOTE:` line. Distinguish a missing line from an invalid, ambiguous or duplicate one. Quorum is a strict majority of all seated advisors casting a substantive vote. Abstentions, invalid and missing votes do not count towards quorum or numerical support; conditional endorsements are separate from endorsements.

Below quorum, the engine and file watcher use a deterministic `NO QUORUM` result instead of a chair-written consensus. A score ranks an option; it does not adopt a resolution. A quick discussion without a formal ballot is labelled separately. These changes apply to newly computed verdicts; previously saved verdicts are historical records, not silently re-certified decisions.

## Acceptance

Run `npm test` with Node 22 and Playwright Chromium installed. The regression fixtures cover dissent plus missing, duplicate or unparseable ballots, abstention and quorum; signed/unsigned, equal/below-floor, currency, refunded or stale evidence; stale-pitch and owner denial; scoped model inputs, call budgets and the browser workflow. All fixtures are synthetic. No paid test or live hosting change is needed for review.
