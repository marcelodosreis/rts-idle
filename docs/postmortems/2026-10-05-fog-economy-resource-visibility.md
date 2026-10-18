---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/economy/economy-playable.spec.ts
---

# Fog Economy Resource Visibility

## Summary

The existing economy browser flow attempted to inspect and select tree resource
1 before revealing its map region, so the first functional E2E failed after
resource visibility became player-specific.

## Symptom

The Chromium economy test could not find the `Tree` resource panel after
focusing the camera on the tree. The resource was correctly absent from the
filtered renderer observation because it was outside player vision.

## Root cause

The old test assumed that camera movement made all map resources available. Fog
rightly separates camera position from authoritative visibility; only a unit or
building source can reveal the resource.

## What we missed

The economy test covered camera focus but not the natural reveal interaction
introduced by P3.07.01. Its resource assertion therefore encoded the previous
global-visibility behavior.

## Fix

`economy-playable.spec.ts` now selects a worker and moves it to a traversable
tile near the tree before inspecting or gathering the resource. The same reveal
step is used by the depleted-tree flow.

## Regression

The wood gathering and depleted-tree browser flows continue through the real
server and assert the resource panel, gathering, depletion, and stump behavior
after the worker reveals the area.

## Prevention

Resource E2E flows must reveal map-authored resources through a player-owned
vision source rather than relying on camera focus or debug catalog data.

## Verification

- `pnpm run test:e2e:focused tests/e2e/economy/economy-playable.spec.ts --grep "a worker selects, cuts, carries, and deposits wood from a tree" --project=chromium --project=firefox`
- `pnpm run test:e2e:fast`
