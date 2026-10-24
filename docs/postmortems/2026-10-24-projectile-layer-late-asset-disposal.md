---
status: open
classe: presentation
barreira: QH.19
regressao:
  - tests/unit/renderer/projectile-layer.test.ts
---

# Projectile Layer Late Asset Disposal

## Summary

The P3.10 review found that a projectile asset promise could resolve after renderer teardown and attach a sprite to an already destroyed scene.

## Symptom

Disposing the renderer while an arrow asset was loading left the fallback unmanaged and allowed the late sprite replacement to survive teardown.

## Root cause

`ProjectileLayer` had no disposal state or cleanup contract, and its asynchronous replacement callback only checked whether the visual map entry still matched.

## What we missed

Renderer tests covered successful fallback replacement and observation removal, but not teardown while replacement was pending.

## Fix

`ProjectileLayer.dispose()` marks the layer disposed, destroys active visuals, clears interpolation state, and rejects/destroys late replacements. Renderer teardown calls it before application destruction.

## Regression

`tests/unit/renderer/projectile-layer.test.ts` defers the sprite promise across disposal and asserts that both fallback and late replacement are destroyed.

## Prevention

Asynchronous renderer layers now require a teardown regression that resolves pending work after disposal.

## Verification

- `pnpm exec vitest run tests/unit/renderer/projectile-layer.test.ts`
- `pnpm run typecheck`
- `pnpm run lint`
