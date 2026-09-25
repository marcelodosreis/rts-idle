# AI Execution Protocol

> Standard workflow for AI coding agents working on rts-idle.
> This document is Tier 1 — always load before starting work.

## Mandatory local preflight

This document is the operational source of truth for local project commands.
Before running any project command, check the active Node version first:

```bash
node --version
```

If it does not report `v24.x`, load NVM and select the version from `.nvmrc`:

```bash
source "$HOME/.nvm/nvm.sh"
nvm install
nvm use
node --version
```

After `node --version` reports `v24.x`, enable Corepack:

```bash
corepack enable
```

The required version is sourced only from `.nvmrc`; stop if NVM selects another
major version. Running tests or builds with Node 20 is not valid project
validation, even if those commands happen to pass locally.

## Local scratch directory

Never write project artifacts to the machine temp directory (`/tmp`,
`/var/folders`, `$TMPDIR`, `os.tmpdir()`, `mkdtemp`). Use the project-local
`tmp/` directory at the repository root (gitignored); create it if missing and
delete temporary files after the task.

## Context Loading Rules

### DO NOT

- Read the entire repository
- Read all docs/specs/ADRs upfront
- Read the full master-plan.md (2693 lines)
- Voluntarily read additional rule files beyond the rules already loaded automatically by the platform
- Read all reference files automatically
- Re-read files already summarized in CURRENT_STATE.md
- Load `AUDIT_REPORT.md`, historical reports, postmortems, generated asset
  tables, or the full master plan unless the task directly requires them

### DO

```text
CURRENT_STATE.md          ← Always start here (2 min read)
    ↓
TASK_PACKET               ← What specifically to do
    ↓
DIRECTLY REFERENCED FILES ← Only files the task touches
    ↓
RELEVANT TESTS            ← Tests for affected code
    ↓
ESCALATE IF BLOCKED       ← Only when current level insufficient
```

## Context Escalation Model

### Level 0 — Task + State (always)

Read `CURRENT_STATE.md` + the task packet. This is sufficient for most tasks.

### Level 1 — Implementation Files

Read the specific files listed in the task packet's "Read First" section.

### Level 2 — Tests

Read the test files that cover the code being modified.

### Level 3 — Specification/ADR

Read the relevant spec or ADR **only if** the task requires understanding a contract or decision that isn't clear from the code.

### Level 4 — Architecture Investigation

Read broader architecture docs. **Requires explicit justification** — e.g., "I need to understand how X integrates with Y because the task touches both."

## Execution Steps

### 1. Load Context

```text
Read CURRENT_STATE.md
Read the task packet
Identify files to modify
Read docs/engineering-standard.md before modifying code
```

### 2. Understand Current Behavior

```text
Read the target files
Read their tests
Understand the contract being modified
```

### 3. Implement

```text
Make the smallest change that satisfies acceptance criteria
Apply clean code + SOLID + typed domain strings (docs/engineering-standard.md)
Do NOT refactor unrelated code
Do NOT add speculative abstractions
Do NOT "prepare for the future"
```

### 4. Iterate and Validate

```text
After intermediate edits, run the smallest relevant validation for fast feedback:
  affected tests
  integration, simulation, or determinism tests when applicable
  typecheck and lint when appropriate

Examples:
  pnpm run test:unit
  pnpm run test:simulation  (if simulation touched)
  pnpm run typecheck
  pnpm run lint

For faster iteration, prefer `pnpm run verify:fast` or
`pnpm run verify:simulation` over repeating the complete gate. Vitest uses a
compact dot reporter across all suites; failed tests still include assertion
details and stack traces.
```

### 5. Completion Gate

Before declaring a feature complete or committing it as completed work, run:

```bash
pnpm run verify
```

`verify` includes `lint` and `test:architecture`, so the mandatory clean code,
SOLID, and typed-domain bar (`docs/engineering-standard.md`,
`tests/architecture/typed-domain.test.ts`) is enforced at the gate. The same
bar runs at pre-commit (`lint-staged`) and pre-push (`typecheck` + `lint` +
`test:architecture`); it applies to every package, app, tool, and test.

For browser or protocol changes, run the appropriate E2E gate. Use
`pnpm run test:e2e:fast` for functional iteration, `pnpm run test:e2e:perf` for
renderer benchmark changes, and `pnpm run test:e2e:all` for release or complete
browser validation. CI runs the first two gates as parallel jobs; together they
cover the same tests as `test:e2e:all`.

Before any focused browser run, enumerate the target first:

```bash
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
```

Playwright also uses a compact dot reporter for focused and complete runs.
Normal stdout from the web and server processes is suppressed while stderr is
preserved, so startup noise is omitted without hiding process failures.

Never use `pnpm run test:e2e -- <file>` for focused iteration. The guarded
`test:e2e` script is reserved for explicitly scoped completion runs. Keep
command output bounded (roughly 4–8k tokens) and summarize large diffs rather
than printing them in full.

### 6. Commit

```text
Stage only changed files
Write conventional commit message
Do NOT amend without explicit request
```

### 7. Report

Use the standard output format (see below).

## What NOT to Do

| Anti-pattern | Why it wastes tokens |
|-------------|---------------------|
| Reading master-plan.md for a small task | 2693 lines for context that may be irrelevant |
| Reading all ADRs upfront | Most are historical, not needed per task |
| Reading all spec files | Only relevant specs matter per task |
| Running the completion gate after every intermediate edit | It repeats repository-wide checks before the task is ready; run it once before completion |
| Creating documentation for routine changes | Only ADRs for real decisions |
| Skipping the bug protocol for a trivial bug | Every bug requires the postmortem and regression test mandated by `AGENTS.md` |
| Refactoring adjacent code | Scope creep wastes tokens and risks regressions |
| Explaining architecture in completion reports | Already documented elsewhere |
| Re-reading CURRENT_STATE.md if already loaded | It doesn't change within a session |

## Stop Conditions

Stop immediately when:

- Acceptance criteria are satisfied
- Iteration validation passes
- The completion gate passes for a code-changing task
- No blocker remains

Do NOT continue with:

- Cleanup of unrelated code
- Additional abstractions
- Documentation expansion
- Speculative optimization
- "While I'm here" refactors

## Standard Output Format

```md
## Result

PASS / BLOCKED

## Implemented

- [what was done]

## Tests

- [which tests pass]

## Validation

- typecheck: PASS
- lint: PASS
- test:unit: PASS
- test:simulation: PASS (if applicable)
- verify: PASS (code-changing tasks)
- test:e2e: PASS (browser/protocol tasks or explicit completion gate)

## Files Changed

- path/to/file.ts — [what changed]

## Architectural Changes

None / [what changed and why]
```

Do NOT produce large essays. Keep reports under 30 lines.

## Milestone Validation Hierarchy

| Level | When | Commands |
|-------|------|----------|
| Iteration | After intermediate edits | affected tests + relevant checks |
| Per-feature | Feature complete | + integration + contracts + orders |
| Completion | Feature completion; browser/protocol changes add explicit E2E | `pnpm run verify` + `test:e2e:fast` or `test:e2e:perf` as affected; `test:e2e:all` for complete/release validation |
| Milestone / release | Phase complete or version bump | Completion gate, plus any task-specific/manual checks |

## Documentation Rules

| Action | When required |
|--------|--------------|
| Create ADR | Meaningful architectural decision with alternatives considered |
| Update spec | Behavior becomes a stable contract depended on by multiple systems |
| Write postmortem | Every bug or malfunction; follow the mandatory Bug Response Protocol in `AGENTS.md` |
| Update CURRENT_STATE.md | Milestone boundary or significant state change |
| Update docs/tasks/todo.md | Task completed or new task identified |

Do NOT create documentation for:

- Ordinary implementation details
- Routine task completion
- Small bug fixes (except their mandatory postmortem and regression test)
- Refactoring that doesn't change behavior
