---
status: open
classe: serialization
barreira: QH.23
regressao: [tests/unit/server/snapshot-sender.test.ts]
---

# Snapshot Delta Player Resource Fanout

## Summary

The first authoritative snapshot-delta implementation marked every positioned
entity dirty when a player's resources changed, causing routine economy ticks
to resend the complete unit set instead of only changed entities.

## Symptom

An otherwise idle match emitted all units in a delta after one worker completed
a resource harvest batch.

## Root cause

The player change signature included resources, supply, defeat state, castle
tier, and research. Any player projection change therefore dirtied every
positioned entity, even though only completed research can change projected unit
combat statistics.

## What we missed

The initial snapshot sender tests covered idle ticks and movement changes but
did not combine a player resource change with idle entities. That left the
intended O(changed) economy path untested.

## Fix

`packages/simulation/src/engine/simulation.ts` now tracks completed-research
signatures only and marks only owned positioned units dirty when research
changes. Player resource and supply changes remain in the fixed player
projection sent with every delta.

## Regression

`tests/unit/server/snapshot-sender.test.ts` completes a worker harvest while the
sender is otherwise idle and asserts that the delta contains only that worker.

## Prevention

Snapshot sender coverage now includes player-resource mutation alongside idle
entities, preserving the O(changed) contract for economy ticks.

## Verification

- `pnpm exec vitest run tests/unit/server/snapshot-sender.test.ts`: 7 passed.
- `pnpm exec vitest run tests/simulation tests/integration/session-commands.test.ts`: 141 passed.
- `pnpm run typecheck`: passed.
- Economy scenario E2E: 20 passed across Chromium and Firefox.
