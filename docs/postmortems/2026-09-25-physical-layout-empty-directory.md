---
status: open
classe: environment
barreira: null
regressao:
  - tests/architecture/physical-layout.test.ts
---

# Physical Layout Empty Directory

## Summary

The architecture CI job failed after the repository reorganization because the physical-layout guard expected an empty `tests/unit/server` directory that exists only in the local worktree and cannot be represented in Git.

## Symptom

The local architecture suite passed, while CI reported that the direct entries in `tests/unit` differed from the approved list.

## Root cause

The approved layout included `server`, but the directory contained no tracked files. It was present locally as an empty directory, while GitHub Actions checked out only tracked paths and therefore omitted it.

## What we missed

The layout test was validated in a worktree containing an untracked empty directory. The acceptance criteria did not require the asserted layout to be reproducible from a clean Git checkout.

## Fix

Removed the empty `server` directory from the approved direct layout in `tests/architecture/physical-layout.test.ts`.

## Regression

`tests/architecture/physical-layout.test.ts` continues to assert the direct entries that are actually represented by tracked files and directories, preventing future unapproved physical additions without depending on empty local directories.

## Prevention

Physical-layout expectations must describe versioned repository structure only. CI remains the authoritative clean-checkout validation for this architecture barrier.

## Verification

Run `pnpm run test:architecture`, `pnpm run lint`, and the CI workflow after pushing the fix.
