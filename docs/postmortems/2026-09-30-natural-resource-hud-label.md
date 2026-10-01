---
status: open
classe: presentation
barreira: QH.02
regressao:
  - tests/e2e/economy/economy-playable.spec.ts
---

# Natural Resource HUD Label

## Summary

Workers gathering a natural tree were presented with the mineral-specific
`Going to mineral` status because the web HUD projection discarded the
authoritative `resourceId` discriminator.

## Symptom

The player saw `Going to mineral` while a Worker travelled to a tree. A
depleted tree also could not be selected because renderer hit testing excluded
resources with zero remaining.

## Root cause

The protocol already carried `nodeId` and `resourceId`, but the HUD economy
type only retained the phase and counters. The label therefore had no target
kind available. Separately, selection and hit testing treated depletion as
removal instead of as a visible, selectable state.

## What we missed

The browser flow asserted gathering and depletion but did not assert the target
specific travel label or selecting the final stump. The web projection had no
unit regression for preserving the target discriminator.

## Fix

The HUD now preserves `nodeId`/`resourceId` and renders tree-specific `Going
to tree` and `Cutting` labels. Depleted resources remain hit-testable and
selectable with `0 remaining`. The competitive map now includes 40 trees in the
lower-left area, opposite the mineral node.

## Regression

`tests/e2e/economy/economy-playable.spec.ts` asserts `Going to tree`, selects a
depleted tree, and verifies `0 remaining`. The renderer unit test preserves
hit-testing for a depleted resource, and the same browser flow covers the dense
lower-left tree group.

## Prevention

Target-specific economy labels and the selectable-depleted-resource behavior
are now part of the real-server Chromium and Firefox economy flow.

## Verification

- `pnpm exec vitest run tests/unit/renderer/resource-layer.test.ts tests/unit/renderer/world-hit-tester.test.ts` — passed.
- Focused economy E2E in Chromium and Firefox — passed.
- `pnpm run verify` — passed.
