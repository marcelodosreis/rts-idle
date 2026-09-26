# QH.18 — Board + tracking guard + protocol (historical alias: QUAL-018)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-017

## Objective

Create resumable board, task packets, tracking guard, and update bug response protocol.

## Scope

- `docs/tasks/todo.md` — Quality Hardening section
- `docs/tasks/QUAL-*.md` — 19 task packets
- `tests/unit/quality-tracking.test.ts` — tracking guard
- `AGENTS.md` — Bug Response Protocol update
- `.opencode/rules/common/testing.md` — anti-duplication rule
- `docs/ai/CONTEXT_MAP.md` — quality route
- `CURRENT_STATE.md` — pointer

## Acceptance Criteria

- [x] All 19 QUAL tasks have packets
- [x] Guard validates board ↔ packets ↔ TASK_INDEX consistency
- [x] Anti-duplication rule enforced
- [x] CURRENT_STATE.md updated

## Validation

- `pnpm run test:unit`
