---
status: closed
classe: isolation
barreira: E2E suite (--workers=6) validates per-session isolation
regressao: []
---

# Postmortem: Demo server shared one session across all clients

Date: 2026-09-16

## Summary

The demo server ran a single `GameSession` and broadcast every client's
snapshot to everyone. Multiple browser tabs (or parallel E2E workers) mutated
the same world, so one client's MOVE changed what another client saw. This made
E2E runs flaky under parallelism and did not reflect how a real match behaves.

## Symptom

With the E2E suite running in parallel, some tests failed intermittently: a test
read a unit's position, another test moved that same unit in the shared world,
and the first test clicked at a stale position. Runs were order- and
timing-dependent.

## Root cause

`apps/server/src/main.ts` created one `GameSession` at startup, one global
broadcast interval, and sent every connection's commands into that single
session. There was no per-client isolation.

## What we missed

The demo server was treated as throwaway scaffolding, so we never applied the
project's own test-isolation rule to it. The E2E suite has no isolation for the
server-side world — a direct violation of "no shared mutable state between
tests" that the TDD skill calls an anti-pattern. The real architecture (rooms,
one session per match) is Phase 6; the demo bypassed it.

## Fix

`apps/server/src/main.ts` now creates an isolated `GameSession` **per WebSocket
connection** (with its own tick interval, cleaned up on close). Each browser tab
plays its own match, which also mirrors the future rooms architecture.

## Regression

There is no single unit test for this; the guard is the E2E suite itself running
at maximum parallelism (`--workers=6`) with all 7 tests green, and the
`select-and-move` / fractional-coordinate regressions proving a client only
affects its own session. A multi-client isolation test belongs to Phase 6
(rooms); this postmortem records that requirement.

## Prevention

- Any demo/transport scaffolding must isolate sessions per client from the
  start — never share mutable match state across connections.
- E2E suites must be run and expected to pass at maximum parallelism; flakiness
  here is a bug, not a CI quirk.

## Verification

- `pnpm exec playwright test --workers=6` — 7/7 pass.
- Full suite, typecheck, lint, build — green.