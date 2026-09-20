---
status: open
classe: process-branch
barreira: null
regressao: []
---

# Postmortem: BUILD-002 branch conflicted with the merged feature history

Date: 2026-09-19

## Summary

BUILD-002 was opened from `feat/phase1-simulation-core`, even though that
feature branch had already been merged into `main`. The resulting pull request
reported conflicts because the branch contained a different history after the
earlier merge/squash. The incident delayed review and deployment of BUILD-002,
but did not affect the game at runtime.

## Symptom

The BUILD-002 pull request showed merge conflicts even though the pull request
for `feat/phase1-simulation-core` had already been merged into `main`. The
conflicting branch could not be merged cleanly until it was synchronized with
the current remote `main`.

## Root cause

BUILD-002 was branched from another feature branch instead of from the current
integration branch. The earlier feature pull request changed the history that
was present on `main` (including the merge/squash result), so the BUILD-002
branch did not have the current `main` ancestry required for a clean pull
request.

## What we missed

The branching procedure did not require checking the current remote base before
creating a task branch or opening its pull request. In particular, there was no
mandatory `git fetch origin`, fast-forward update of the base branch, or
`git merge-base` check confirming that the task branch contained the current
`main`/`staging` history. Review therefore discovered the divergence late,
instead of the branch creator resolving it before review.

## Fix

`origin/main` was merged into `feat/build-002-base-construction`, producing
merge commit `0ecc9cb`. The branch was then verified with the project checks and
pushed so the pull request could be reviewed against the current base.

The safe branching and promotion procedure is now documented in
`docs/rfc/RFC-002-deployment-and-environments.md`, including the required
`merge-base` check and the `feature → staging → main` deployment flow.

## Regression

No code regression test applies to this repository-history failure. The
permanent procedural regression is the operational checklist in RFC-002: it
updates the base branch before branching, fetches `origin`, and requires a
`git merge-base` validation before review. The existing CI quality gate remains
the verification barrier for the resulting branch contents.

## Prevention

- New task branches must start from an updated `main` or `staging`, never from
  an already-completed feature branch.
- Before opening a pull request, contributors must fetch `origin`, verify the
  branch contains the current target base with `git merge-base`, and resolve
  conflicts locally.
- Promotion follows `feature → staging → main`; deployment happens only after
  CI is green.
- After deployment, `/health` is smoke-checked and Render's previous deploy is
  used for rollback when necessary.

## Verification

- `git show 0ecc9cb` — confirmed the merge of `origin/main` into the BUILD-002
  branch.
- Project verification checks were run after the merge and before pushing the
  branch, as recorded in the incident workflow.
- `git diff --check` — passed for this documentation change.
- RFC-002 and this postmortem were reviewed to ensure the documented flow is
  consistent and only documentation files are changed.
