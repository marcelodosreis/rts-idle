---
status: open
classe: input-geometry
barreira: null
regressao:
  - tests/e2e/regression-move-fractional-coords.spec.ts
---

# Postmortem: MOVE silently rejected for fractional world coordinates

Date: 2026-09-16

## Summary

A player could select units (selection rings, `selected: N` worked) but a
right-click move never moved them. The command ping appeared, yet the units
stayed in place. The bug hit **every** right-click in a real browser.

## Symptom

In the browser demo: select a unit → right-click on the map → white ping shows →
unit does not move. No error anywhere, because the transport swallowed the
rejection.

## Root cause

The renderer converted a right-click to world coordinates with
`viewport.toWorld(event.global)`, which returns **fractional** values (e.g.
`4200.5, 3800.25`). The web client forwarded those floats unchanged over the
wire. The simulation's MOVE contract requires **integer fixed-point units**
(`packages/simulation/src/engine.ts`: `if (!Number.isInteger(payload.x) || !Number.isInteger(payload.y)) throw INVALID_PAYLOAD`). Every real-browser click lands on a fractional
pixel, so every MOVE was rejected. The demo transport collected the
`CommandRejectedError` on the server but never told the client, so the failure
was invisible.

## What we missed

The E2E `select-and-move` passed **by luck**, not by proof: Playwright's
`page.mouse.click` rounds to integer pixels, and the demo camera (zoom 1,
integer center, integer canvas) made `toWorld` return integers. Nothing in the
test forced the fractional geometry a real browser produces (sub-pixel pointer
coordinates, camera at fractional offsets after pan/zoom). We also had no test
that a command is actually *accepted end-to-end* with realistic input geometry,
and the client had no way to surface server rejections.

## Fix

`apps/web/src/screens/MatchScreen.tsx` — the command boundary now quantizes the
target to fixed units before sending:

```ts
onGroundCommand: (x, y) => {
  if (selection.size > 0) {
    connection?.sendMove([...selection], Math.round(x), Math.round(y))
  }
}
```

The server stays strict (fail-fast on non-integers), which is correct for
hashing determinism. Rejection surfacing to clients is a Phase 6 protocol item.

## Regression

- `tests/e2e/regression-move-fractional-coords.spec.ts`: offsets the camera to a
  **fractional** position (`2048.5`), then issues a real right-click at integer
  pixels so the world target is fractional — exactly what a real browser
  produces. Asserts the ping fires **and** the unit's position changes. Fails
  without the fix (RED was confirmed), passes with it.
- `tests/integration/move-command.test.ts`: new case asserting fractional
  `x/y` is rejected `INVALID_PAYLOAD` with no state mutation — documents the
  integer fixed-unit contract at the simulation boundary.

## Prevention

- Command boundaries must quantize continuous presentation coordinates before
  they cross the wire; the simulation contract stays strict.
- **Test environments must mirror real input geometry.** Any E2E that drives
  presentation must exercise fractional coordinates / camera offsets, not just
  integer-rounded synthetic clicks. This is now a standing requirement for
  renderer E2E work (recorded in `docs/testing/manual-smoke.md` and the Bug
  Response Protocol).
- Server rejections must eventually reach the client (Phase 6 protocol) so
  failures are never silent.

## Verification

- `pnpm run test:e2e` — 7/7 pass, including the new regression.
- `pnpm run test:integration` — 10/10, including the fractional-payload case.
- `pnpm run typecheck`, `pnpm run lint`, `pnpm run build` — green.
- Manual: right-click in the browser now teleports the unit to the target.