---
status: open
classe: convention
barreira: null
regressao:
  - tests/architecture/postmortem-status.test.ts
---

# Postmortem metadata violated the quality contract

## Summary

The building reassignment postmortem used unsupported front-matter values,
causing the Determinism & Architecture CI job to fail.

## Symptom

The postmortem-status architecture test rejected the `simulation` class and
the `test:simulation` barrier value.

## Root cause

The postmortem was written against the general bug-response protocol without
checking the constrained class and barrier vocabularies enforced by
`postmortem-status.test.ts`.

## What we missed

The postmortem was committed without running the focused architecture test that
validates every postmortem front matter block.

## Fix

Updated the building reassignment postmortem to use the supported `coverage`
class and a `null` barrier because this branch does not define a matching QUAL
item in the task index.

## Regression

`tests/architecture/postmortem-status.test.ts` validates every postmortem class
and barrier against the supported values and task index.

## Prevention

Run the focused postmortem-status architecture test whenever a postmortem is
added or its front matter changes.

## Verification

`pnpm run test:architecture` passes with both postmortems included.
