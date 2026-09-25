---
status: open
classe: presentation
barreira: null
regressao:
  - tests/simulation/economy/economy-v0.test.ts
  - tests/contracts/economy-command.test.ts
---

# Partial Mining Was Shown As Carried Cargo

## Summary

A Worker interrupted during an incomplete mining action was shown with the
gold-carrying sprite even though the intended gameplay contract only grants a
complete 10-mineral batch. The authoritative simulation assigned Cargo after
each 20-tick sub-cycle, so the renderer correctly displayed an incorrect
intermediate gameplay state.

## Symptom

After a Worker mined for one or more sub-cycles and was moved or stopped before
the full action finished, its visual state changed to `holding item`.

## Root cause

`economySystem` incremented `Cargo.amount` and decremented the MineralNode after
every `GATHER_TICKS_PER_MINERAL` interval. The server derives `carrying` from
`Cargo.amount > 0`, so partial progress became visible as real cargo. The
renderer had no separate visual flag to correct that authoritative state.

## What we missed

The economy tests covered individual mineral transfers and completed return
loops, but did not assert the atomicity of a mining action when `MOVE` or `STOP`
interrupted partial progress. The acceptance contract also did not define a
complete batch as the only point at which Cargo and the node may change.

## Fix

Mining now tracks the full 200-tick, 10-mineral batch in the existing order
progress. Cargo and the MineralNode are updated together only at completion.
Interrupted progress is discarded, and `GATHER` rejects nodes without a
complete 10-mineral batch.

## Regression

`tests/simulation/economy/economy-v0.test.ts` verifies that both `STOP` and `MOVE` after
partial progress leave Cargo empty and the node unchanged. The contract test
verifies that incomplete node batches are rejected.

## Prevention

The simulation regression tests now treat Cargo and MineralNode updates as an
atomic completion boundary. Renderer carrying remains derived from Cargo, so a
partial mining action cannot independently activate the carry pose.

## Verification

Focused simulation, integration, protocol, renderer, and contract tests pass.
The full project verification and browser economy scenario remain part of the
completion gate for this fix.
