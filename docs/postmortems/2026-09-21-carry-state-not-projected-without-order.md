---
status: closed
classe: presentation
barreira: null
regressao:
  - tests/integration/session-commands.test.ts
  - tests/unit/unit-economy.test.ts
---

# Carrying State Not Projected Without a Gather Order

## Summary

A Worker that finished mining and was interrupted by a manual `MOVE`/`STOP`
kept its carried minerals but lost its `GATHER` order. The snapshot only
projected the economy state while a `GATHER` order was the front order, so the
renderer showed the Worker as empty (`run`/`idle`) even though it was still
carrying cargo.

## Symptom

After moving a Worker that was returning to Base, the Worker walked with its
normal run animation and stood idle with its normal idle animation. The player
could not tell that the Worker still held minerals, and the only way to deposit
was to re-issue `GATHER` on the Mine; right-clicking the Base did nothing.

## Root cause

`Cargo` is a persistent component, but `deriveEconomy` in
`apps/server/src/sessions/session.ts` returned `undefined` unless the front
order was `GATHER`. The renderer's economy animation mapping therefore only saw
a phase during the order-driven loop; once the order was cleared, the carried
minerals became invisible on the wire even though they remained in the
simulation.

## What we missed

The VS-01B projection covered only the gather loop's own phases. Neither the
projection tests nor the renderer mapping tests exercised a Worker that holds
`Cargo` without a `GATHER` order, so the "carrying" concept was assumed to be
implied by the order rather than an independent fact.

## Fix

The snapshot now projects `SnapshotUnit.carrying` whenever `Cargo.amount > 0`,
independent of the front order (`apps/server/src/sessions/session.ts`), and the
renderer selects the carry pose for a carrying Worker without an economy phase
(`packages/renderer/src/economy-animation.ts`, `unit-sprite.ts`). A new
`DEPOSIT` command lets the player send carrying Workers to an owned completed
Base, which deposits the cargo and leaves the Worker idle.

## Regression

`tests/integration/session-commands.test.ts` asserts that a Worker with cargo
and no order projects `carrying: true` while an empty Worker omits it.
`tests/unit/unit-economy.test.ts` asserts the carry animation is selected when
`carrying` is true and there is no economy phase.

## Prevention

Cargo visibility is now a projection-level contract tested independently of the
order state, so a future change that couples carrying to the gather order will
fail the suite. The task packet records the manual deposit surface and the
right-click Base interaction as acceptance criteria.

## Verification

Run `pnpm run verify`, plus the focused `economy-deposit`, session, and
renderer economy tests.
