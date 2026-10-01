---
status: open
classe: presentation
barreira: QH.25
regressao:
  - tests/unit/renderer/resource-layer.test.ts
  - tests/e2e/economy/economy-playable.spec.ts
---

# Natural resource particle buffer was not uploaded

## Summary

Natural resources were authoritative and selectable, but their PixiJS
`ParticleContainer` produced no visible pixels in the browser. The failure was
reproducible with and without sprite assets in the regression scenario.

## Symptom

Opening `/?scenario=regression&aggression=passive&sprites=off` and viewing the
tree coordinates showed only terrain. Clicking the exact tree coordinate still
selected `Tree`, proving that input and presentation state had diverged.

## Root cause

`ResourceLayer` constructed `ParticleContainer` instances with static particle
properties but did not call `ParticleContainer.update()`. PixiJS v8 therefore
kept the particle list and hit-test data while not uploading the static vertex
buffer used for rendering.

## What we missed

The original tests asserted resource selection and server gameplay but did not
assert rendered pixels or static particle-buffer upload. The fallback also used
`Texture.WHITE`, which made a missing upload indistinguishable from a missing
visual asset.

## Fix

`ResourceLayer` now calls `update()` after every static chunk build and rebuild.
It also uses generated tree and stump textures when art is disabled or missing,
keeps stumps visible after depletion, and materializes only visible chunks.

## Regression

`tests/unit/renderer/resource-layer.test.ts` spies on the particle upload and
verifies that a depleted resource remains materialized. The economy E2E opens
the real server with `sprites=off`, samples the canvas around the tree, and
continues through selection and gathering.

## Prevention

ParticleContainer-backed presentation must test both its GPU upload operation
and user-visible pixels. Resource fallback visuals are now independent of the
asset manifest, so missing art cannot hide a gameplay resource.

## Verification

Focused renderer tests pass. The Chromium and Firefox wood flow passes with
`sprites=off`. Full `verify`, functional E2E, performance E2E, and complete
browser gates remain required before closing this postmortem.
