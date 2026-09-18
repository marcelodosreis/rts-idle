# AI Execution Protocol

> Standard workflow for AI coding agents working on rts-idle.
> This document is Tier 1 — always load before starting work.

## Context Loading Rules

### DO NOT

- Read the entire repository
- Read all docs/specs/ADRs upfront
- Read the full master-plan.md (2693 lines)
- Voluntarily read additional rule files beyond the rules already loaded automatically by the platform
- Read all reference files automatically
- Re-read files already summarized in CURRENT_STATE.md

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
Do NOT refactor unrelated code
Do NOT add speculative abstractions
Do NOT "prepare for the future"
```

### 4. Validate

```text
Run focused tests (per-task):
  pnpm run test:unit
  pnpm run test:simulation  (if simulation touched)

Run typecheck:
  pnpm run typecheck

Run lint:
  pnpm run lint
```

### 5. Commit

```text
Stage only changed files
Write conventional commit message
Do NOT amend without explicit request
```

### 6. Report

Use the standard output format (see below).

## What NOT to Do

| Anti-pattern | Why it wastes tokens |
|-------------|---------------------|
| Reading master-plan.md for a small task | 2693 lines for context that may be irrelevant |
| Reading all ADRs upfront | Most are historical, not needed per task |
| Reading all spec files | Only relevant specs matter per task |
| Running full `pnpm verify` per change | 11 test suites when 2-3 suffice |
| Creating documentation for routine changes | Only ADRs for real decisions |
| Writing postmortems for trivial bugs | Reserve for meaningful failures |
| Refactoring adjacent code | Scope creep wastes tokens and risks regressions |
| Explaining architecture in completion reports | Already documented elsewhere |
| Re-reading CURRENT_STATE.md if already loaded | It doesn't change within a session |

## Stop Conditions

Stop immediately when:

- Acceptance criteria are satisfied
- Tests pass
- Typecheck and lint pass
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

## Files Changed

- path/to/file.ts — [what changed]

## Architectural Changes

None / [what changed and why]
```

Do NOT produce large essays. Keep reports under 30 lines.

## Milestone Validation Hierarchy

| Level | When | Commands |
|-------|------|----------|
| Per-task | After each change | typecheck + lint + focused tests |
| Per-feature | Feature complete | + integration + contracts + orders |
| Milestone | Phase complete | `pnpm run verify` |
| Release | Version bump | + e2e + determinism cross-check |

## Documentation Rules

| Action | When required |
|--------|--------------|
| Create ADR | Meaningful architectural decision with alternatives considered |
| Update spec | Behavior becomes a stable contract depended on by multiple systems |
| Write postmortem | Meaningful failure, regression, or architectural/process lesson |
| Update CURRENT_STATE.md | Milestone boundary or significant state change |
| Update tasks/todo.md | Task completed or new task identified |

Do NOT create documentation for:

- Ordinary implementation details
- Routine task completion
- Small bug fixes
- Refactoring that doesn't change behavior
