---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/sprite-fallback.spec.ts
---

# Postmortem: Fallback unit circles shrink after first attack

Date: 2026-09-18

## Summary

When sprites are disabled (`?sprites=off`), units render as fallback circles
("bolinhas") drawn at radius `UNIT_RADIUS = 28`. They appeared at full size on
spawn, then shrank to half size the first time they engaged in combat. The
defect was presentation-only and did not affect simulation state.

## Symptom

Opening the demo with sprites disabled showed correctly sized circles. As soon
as the hostile squads attacked each other, the attacking unit's circle shrank to
half its size and stayed small for the rest of the match. Units that never
attacked kept the full size.

## Root cause

`UnitSprite.faceToward()` in `packages/renderer/src/unit-sprite.ts` applied the
sprite scale unconditionally:

```ts
this.body.scale.set(SPRITE_SCALE * this.facing, SPRITE_SCALE) // SPRITE_SCALE = 0.5
```

For units with animation frames, `this.body` is an `AnimatedSprite` that needs
`SPRITE_SCALE` (192px cell → ~96px on screen). For the no-sprite fallback,
`this.body` is the `Graphics` circle itself, which is already drawn at its final
world-space radius. Scaling it by `0.5` halved the radius (28 → 14).

The sibling method `setState()` already guarded against this with
`if (this.frames === null) return` (`unit-sprite.ts:184`), but `faceToward()`
lacked the equivalent guard. `faceToward()` is called on every `attackFired`
event (`renderer.ts:170` → `unit-layer.ts:235`), which is why the shrink was
tied to interaction/combat.

## What we missed

The existing fallback E2E (`tests/e2e/sprite-fallback.spec.ts`) only asserted
that a fallback unit reports `anim === 'fallback'` and that toggling sprites
works. It never asserted the fallback body's **scale/size**, and it never
exercised combat. The debug hook (`getSpriteState`) exposed visibility, frame,
anim, and facing — but not scale — so a size regression was structurally
invisible to tests. The guard pattern was applied to `setState()` but not
audited across the other body-mutating methods (`faceToward`, `beginAttack`).

## Fix

`packages/renderer/src/unit-sprite.ts` — `faceToward()` now returns early for
fallback units, matching `setState()`:

```ts
faceToward(targetRenderX: number): void {
  // The fallback circle has no facing, and its body must keep its drawn
  // scale. Applying SPRITE_SCALE here shrank the placeholder on first attack.
  if (this.frames === null) {
    return
  }
  this.facing = this.container.position.x < targetRenderX ? 1 : -1
  this.body.scale.set(SPRITE_SCALE * this.facing, SPRITE_SCALE)
}
```

Debug plumbing was extended so size is observable:

- `unit-sprite.ts`: new `bodyScale()` getter.
- `unit-layer.ts` / `renderer.ts` / `types.ts` / `useMatchSession.ts`:
  `getSpriteState` now returns `scale`.

## Regression

`tests/e2e/sprite-fallback.spec.ts` — new test
`fallback circles keep their size after units engage in combat`. It loads
`/?sprites=off`, waits until combat damages a unit (proving `attackFired`
fired), then asserts every fallback body has `scale === 1`. Before the fix it
failed with `Expected: 1, Received: -0.5`; after the fix it passes.

## Prevention

- The permanent regression test now guards fallback body size through a real
  combat cycle.
- The debug hook exposes `scale`, so future body-size regressions are
  observable to E2E.
- Lesson recorded: any method that mutates `this.body.scale` must honor the
  fallback guard. `beginAttack` only touches `frames.attack`, which is already
  `null`-safe.

## Verification

- `pnpm run test:e2e:focused tests/e2e/sprite-fallback.spec.ts --project=chromium`
  — regression fails before the fix (`Expected: 1, Received: -0.5`), both tests
  pass after.
- `pnpm run test:unit` — 143 passed; `pnpm run test:architecture` — 64 passed.
- Note: `pnpm run typecheck` / `lint` / `build` are currently red on the working
  tree due to an unrelated, in-progress terrain/level-editor feature
  (`terrain-conversion.ts`, `terrain-dressing.ts`, `terrain-scene.ts`, missing
  `@rts/game-data` exports). None of the errors reference the files touched by
  this fix; the changed files add no new lint findings.
