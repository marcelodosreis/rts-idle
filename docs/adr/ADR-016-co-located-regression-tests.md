# ADR-016 — Co-located regression tests (no dedicated regression suite)

Status: Accepted

Date: 2026-09-20

## Context

The master plan and `AGENTS.md` reserved a dedicated `tests/regression/`
directory for permanent regression tests, with a `test:regression` script wired
into CI. In practice the directory held only a `.gitkeep`: across the 16
postmortems, no regression was ever placed there. Every fixed bug landed its
permanent regression in the suite that owns the affected behavior — `tests/e2e/`
for browser behavior, `tests/unit/` for pure logic, and `tests/simulation/` for
simulation behavior.

Because `vitest.config.ts` sets `passWithNoTests: true`, the empty suite passed
CI silently, creating a quality gate that validated nothing. The audit report
already flagged the directory as "empty but described as regression-test
infrastructure". The documented convention and the working convention had
diverged.

## Decision

- **Remove the dedicated regression suite.** Delete `tests/regression/`, the
  `test:regression` script, and its CI step.
- **Co-locate regressions by owning behavior.** A regression test lives in the
  suite that owns the behavior it guards: `tests/unit/` (pure logic),
  `tests/integration/` (package flow), `tests/simulation/` (simulation across
  ticks), and `tests/e2e/` (user-visible browser behavior). This matches the
  test-selection guidance in the TDD skill.
- **Keep the Bug Response Protocol.** Every bug still requires a postmortem and
  a permanent regression test; only the location changes.
- Update the normative docs (`AGENTS.md`, TDD skill, README, master plan, specs,
  RFC-002) to describe co-location instead of the removed suite.

## Alternatives

- **Populate `tests/regression/`.** Rejected: it duplicates the subsystem
  suites, forces simulation regressions to run outside `test:simulation`, and
  loses the co-location that already worked in practice.
- **Keep the folder empty with a guard that fails when empty.** Rejected: it
  preserves a directory whose only value is a promise the project does not
  intend to keep.
- **Remove the directory but leave docs unchanged.** Rejected: it would keep a
  documented convention that contradicts the repository.

## Consequences

- Regression coverage now runs as part of the suite that owns it; a simulation
  regression runs under `test:simulation`, a browser regression under
  `test:e2e`.
- CI no longer contains a step that passes without executing any test.
- `AGENTS.md` §5, the TDD skill, README, `SPEC-replay-tooling`, RFC-002, and the
  master plan now describe the real convention.
- Adding a regression to the wrong suite is now the only failure mode; the
  suite choice is determined by the behavior, not by a separate bucket.

## Evidence

- `git grep "tests/regression"` / `git grep "test:regression"` — zero live
  references after this change.
- Postmortem front-matter `regressao` paths resolve to `tests/e2e/`,
  `tests/unit/`, and `tests/simulation/` only.
- `tests/architecture/postmortem-status.test.ts` validates that declared
  regression files exist on disk; it is unaffected by the removal.
- Full validation: `pnpm run lint`, `pnpm run typecheck`, `pnpm run verify`.
