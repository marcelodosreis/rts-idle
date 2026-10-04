# QH.03 — Display list invariants (historical alias: QUAL-003)

**Status:** done
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-001

## Objective

Enforce display list invariants via automated barrier.

## Scope

- `tests/e2e/laboratory/renderer-lifecycle.spec.ts` — lifecycle assertions
- `tests/e2e/match/visual-feedback-base.spec.ts` — display-list observation
- `tests/e2e/laboratory/sprite-fallback.spec.ts` — fallback scale invariant

## Approved reduced scope

The full structural harness remains deferred with QH.01. This packet covers the
renderer invariants already exposed by the existing debug bridge and lifecycle
suite, without adding a new harness or public renderer API.

## Acceptance Criteria

- [x] Scale fallback == 1 invariant enforced
- [x] inTree == true invariant enforced
- [x] Tests fail if invariants violated

## Validation

- `pnpm run test:e2e`

## Completion Report

The existing renderer lifecycle and fallback suites now enforce the reduced
invariant scope without adding a new harness. The lifecycle assertion polls the
current unit set until every sprite body is in the display tree and visible;
fallback coverage retains the scale invariant. The Chromium/Firefox lifecycle
suite and the complete functional and performance E2E gates passed.
