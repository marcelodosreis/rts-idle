---
status: open
classe: environment
barreira: QH.19
regressao:
  - tests/e2e/match/visual-combat.spec.ts
---

# Firefox E2E Host Libraries

## Summary

Playwright had the Firefox binary installed, but the host image lacked GTK,
Pango, Wayland, Xinerama, JPEG, and related runtime libraries. Firefox E2E
could not launch even though Chromium worked.

## Symptom

Playwright reported `libgtk-3.so.0` and additional missing shared libraries.

## Root cause

The environment allows Playwright browser downloads but does not grant the
agent passwordless sudo for `playwright install --with-deps`.

## What we missed

The browser preflight verified browser binaries but not dynamic-library
availability for both configured projects.

## Fix

The missing Debian packages were downloaded and extracted into the project
local scratch runtime, and Firefox was rerun with that runtime on
`LD_LIBRARY_PATH`.

## Regression

The visual combat E2E passes in Firefox after the runtime-library preflight.

## Prevention

The browser gate must verify both configured projects before reporting a
complete local E2E result; CI remains responsible for provisioning system
packages globally.

## Verification

- `pnpm exec playwright install --list`
- Firefox visual-combat E2E: PASS with the project-local runtime library path
