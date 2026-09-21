# AUTH-016 — Metrics locality decision

**Status:** done

## Task

- Objective: record metrics as intentionally local with an objective re-evaluation trigger.
- Scope: authority audit and board.
- Non-goals: creating a metrics package.

## Read first

`docs/quality/concept-authority-audit.md`, `CURRENT_STATE.md`, `tasks/todo.md`, `docs/ai/TASK_INDEX.md`.

## Contract

Metrics remain local until three independent consumers require the same statistical contract; the audit records this explicit trigger.

## Tests and validation

Documentation review; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Audit names locality and re-evaluation condition.

## Completion report

Report PASS/BLOCKED, reviewed records, and changed files.
