---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/world-hit-tester.test.ts
  - tests/e2e/economy-playable.spec.ts
---

# Pawn Selection Lost Over Mineral Nodes

## Summary

A pawn standing on a Mineral Node could not be selected because the renderer
resolved the overlapping node as the click target first.

## Symptom

Clicking a pawn while it was mining selected the Mineral Node instead of the
pawn.

## Root cause

`createWorldHitTester` applied mineral-first precedence for both primary and
secondary interactions. Since a mining pawn and its node occupy the same world
position, the node always won the hit test.

## What we missed

The existing unit test asserted the old mineral-first policy, and the browser
coverage only clicked a Mineral Node without an overlapping pawn.

## Fix

The shared hit-test precedence is now pawn/unit, mineral, building, then
ground. This keeps the pawn as the direct target whenever it overlaps a node.

## Regression

The renderer unit test asserts unit-first precedence, and the economy E2E test
selects a pawn after it reaches the Mineral Node.

## Prevention

The precedence policy remains centralized in `world-hit-tester.ts`, documented
by ADR-017, and covered at both the pure hit-test and browser interaction
boundaries.

## Verification

Focused unit and economy E2E tests will be run, followed by the project
completion gate.
