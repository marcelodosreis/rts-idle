# QH.28.02 — Deterministic blocked production coverage

**Status:** done
**Phase:** Quality Hardening / production E2E
**Dependencies:** QH.28.01, P2.12

## Objective

Cover the full production queue and blocked-exit feedback through a deterministic real-server browser flow.

## Why

The previous cancellation test attempted a sixth production command after filling a queue whose first item could complete during the assertion window. That race caused the test to submit a valid command instead of observing the queue-full state.

## Scope

- `tests/e2e/economy/production-playable.spec.ts`
- `tests/e2e/support/settle.ts` or production-specific E2E support when required
- This task packet and the related postmortem

## Non-goals

- No new public demo scenario.
- No simulation rule or production-balance change.
- No forced clicks or wall-clock waits.
- No touch, mobile, WebKit, or HUD redesign work.

## Contract

- Start from the automated `regression` scenario.
- Train one player Pawn through the browser command path so it occupies the Castle's authoritative spawn exit.
- Observe the Pawn at the exit, select the Castle, and train five Pawns.
- Observe `Queue 5/5`, `aria-disabled="true"`, and `data-command-state="blocked"` on the Pawn command.
- Keep the queue blocked while the first item reaches completion; the exit blocker must prevent dequeue.
- Cancel queued items through the normal confirmation flow and observe authoritative queue reduction and Gold refunds.
- The test must pass in Chromium and Firefox without `force`, arbitrary sleeps, retries, or exact wall-clock assumptions.

## Design

- Derive the Castle exit from the shared `BUILDING_FOOTPRINTS` registry rather than duplicating geometry.
- Use existing `window.__rtsDebug` getters only for observation and coordinate calculation; all gameplay actions go through real pointer input and the server.
- Keep the cancellation assertion separate from the blocked production assertion so a queue lifecycle transition cannot invalidate either contract.

## Validation

```bash
pnpm run test:e2e:focused tests/e2e/economy/production-playable.spec.ts --list
pnpm run test:e2e:focused tests/e2e/economy/production-playable.spec.ts
pnpm run verify
```

## Player-facing completion

- [x] The player can fill a producer queue through the normal HUD.
- [x] The player sees the production command blocked when the queue is full.
- [x] The player can cancel queued production and receive the refund.
- [x] The real server path is covered in the configured desktop browsers.

## Acceptance Criteria

- [x] The focused production suite passes in Chromium and Firefox.
- [x] The full planned browser matrix passes.
- [x] The related postmortem is updated and closed only after the permanent regression passes.
- [x] No unrelated gameplay or scenario changes are included.

## Completion Report

The regression fixture trains one Pawn into the Castle spawn exit, fills the
five-item queue through the HUD, observes the blocked command and `Queue is
full` feedback, and separately verifies queued cancellation and Gold refunds.
The production suite passed in both configured browsers; functional E2E passed
243 tests with one expected skip, and performance E2E passed 6 tests.
