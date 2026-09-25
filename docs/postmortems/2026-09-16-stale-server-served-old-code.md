---
status: open
classe: environment
barreira: null
regressao: []
---

# Postmortem: Stale dev server served pre-formation simulation code

Date: 2026-09-16

## Summary

A user reported units still stacking after the formation-spread fix shipped and
passed tests. The code was correct — a stale server process was running the old
simulation.

## Symptom

Multi-unit MOVE stacked all units at the exact click point, even though the
formation feature was implemented, unit/integration/E2E tests were green, and a
freshly started server applied the spread correctly.

## Root cause

`apps/server` ran `tsx src/main.ts`, which executes once and **never reloads**.
A background server process started before `formation.ts` existed (PID start
20:16 vs file mtime 20:19) kept serving the old engine. The browser connected
to whatever owned port 8080 — the stale process — so it saw pre-formation
behavior. Vite hot-reloads the client, which masked the difference.

## What we missed

- The demo server had no watch mode; nobody verified which process actually
  owned port 8080 before the user tested.
- There was no documented "if behavior looks stale, restart + refresh" step in
  the manual smoke flow.

## Fix

- Restarted the dev servers with current code (verified via a WebSocket probe:
  a MOVE for 4 units returned 4 distinct positions around the target).
- `apps/server/package.json` `dev` → `tsx watch src/main.ts`: the server now
  auto-restarts on any change to its module graph, eliminating stale servers.
- `docs/testing/manual-smoke.md`: added a "stale behavior → restart + hard
  refresh" note (browsers do not auto-reconnect yet; Phase 6).

## Regression

Not a code bug — behavior is guarded by the existing formation tests
(`tests/unit/simulation/formation-offsets.test.ts`,
`tests/integration/formation-destinations.test.ts`,
`tests/e2e/regression/regression-units-spread.spec.ts`). The operational guard is the
`tsx watch` dev script.

## Prevention

- Any dev server must run in watch mode so a code change can never leave a
  stale process serving old behavior.
- The manual smoke flow documents the restart/refresh step.
- When in doubt, probe the running server directly (WebSocket snapshot) instead
  of assuming the process matches the source tree.

## Verification

- WebSocket probe: MOVE units 1–4 → distinct positions `(10000,10000)`,
  `(10128,10000)`, `(10128,10128)`, `(10000,10128)`.
- All suites green; `tsx watch` dev script in place.