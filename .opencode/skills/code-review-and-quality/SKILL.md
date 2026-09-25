---
name: code-review-and-quality
description: Reviews changes for correctness, architecture, security, clarity, and performance.
---

# Code Review and Quality

Use for review requests or before handing off a non-trivial change.

## Review order

1. Read the task, affected files, and relevant tests.
2. Inspect the diff before reading unrelated implementation details.
3. Verify behavior and regression coverage.
4. Check architecture boundaries, public APIs, determinism, and security.
5. Check clarity, scope, performance, and error handling.
6. Run or inspect the smallest relevant validation.
7. Enforce the mandatory bar (`docs/engineering-standard.md`): clean code and
   SOLID in every package/app/tool/test, and typed domain strings (registries,
   no `as string`/`as unknown`, no domain `Record<string, X>`, exhaustive
   `assertNever`). Confirm `pnpm run lint` and `pnpm run test:architecture` pass.

## Finding format

Report only actionable findings, ordered by severity. Each finding includes:

- severity and file/line;
- concrete failure or risk;
- why the current test suite would miss it;
- the smallest corrective action.

Do not report preferences as defects. Do not rewrite code while reviewing unless
the user explicitly requests implementation.

## Completion checklist

- No behavior regression or untested new behavior.
- No forbidden imports or public API break.
- No unsafe casts, secrets, swallowed errors, or nondeterminism.
- Mandatory clean code / SOLID / typed-domain bar satisfied and enforced by
  `pnpm run lint` + `pnpm run test:architecture` (no unjustified suppressions).
- Tests assert outcomes and include the relevant regression.
- Diff contains no unrelated formatting or generated churn.

Load `.opencode/references/skills/quality-checklists.md` when reviewing UI,
TypeScript, or test-specific details.
