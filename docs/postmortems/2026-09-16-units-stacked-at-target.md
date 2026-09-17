# Postmortem: Multi-unit moves stacked every unit at the same point

Date: 2026-09-16

## Summary

Selecting several units and issuing a single MOVE placed every unit at the
exact same coordinates. On screen, an army looked like a single unit, and there
was no way to tell how many units were there.

## Symptom

Right-click with N units selected → all N teleported to the identical target
point and stacked on top of each other.

## Root cause

`applyMove` in `packages/simulation/src/engine.ts` set `positions.set(unitId, {
x: payload.x, y: payload.y })` for every unit in the command. There was no
formation/arrival spacing: all units got the same destination. Group movement
and formation destinations were only planned for Phase 3 (`P3.04` group-goals);
the demo surfaced the gap immediately.

## What we missed

P0.13 validated MOVE for a single target but never assigned distinct
destinations for multi-unit commands. Group formation was on the roadmap
(§15.3) but no acceptance criterion required it for the playable slice — so a
core RTS interaction (army movement) shipped in a degenerate form without any
test asserting distinct destinations.

## Fix

`packages/simulation/src/formation.ts` — a deterministic square spiral of
offsets (`FORMATION_SPACING = 128`, up to 256 distinct offsets). `applyMove`
sorts the unit ids and assigns `target + offset(index)` to each unit, with the
first unit exactly on the click. It is server-authoritative, part of the
hashed/serialized state, and forward-compatible with Phase 3 movement (units
will path to these distinct destinations).

## Regression

- `tests/unit/formation-offsets.test.ts` — offsets distinct up to 256,
  deterministic, symmetric, scaled by spacing, first is `(0,0)`.
- `tests/integration/formation-destinations.test.ts` — MOVE with 4 units →
  distinct positions around the target; first unit exactly on the click; single
  unit → exact target; deterministic hash.
- `tests/e2e/regression-units-spread.spec.ts` — box-select the visible army and
  move it to one point; asserts every selected unit ends at a distinct
  position.

## Prevention

Any multi-unit command must assign distinct, deterministic destinations; the
destinations belong to the simulation (hashed), never a visual offset in the
renderer (which would desync from the authoritative state). Group formation is
now a tested behavior, not a Phase 3 afterthought.

## Verification

- `pnpm run test:unit`, `test:integration`, `test:simulation`, `test:determinism`
  — green (unit 27, integration 14).
- `pnpm run test:e2e --workers=6` — 8/8 pass.
- `typecheck`, `lint`, `build` — green.