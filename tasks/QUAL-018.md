# QUAL-018 — Board + tracking guard + protocolo

**Status:** in-progress
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-017

## Objective

Create resumable board, task packets, tracking guard, and update bug response protocol.

## Scope

- `tasks/todo.md` — Quality Hardening section
- `tasks/QUAL-*.md` — 19 task packets
- `tests/unit/quality-tracking.test.ts` — tracking guard
- `AGENTS.md` — Bug Response Protocol update
- `.opencode/rules/common/testing.md` — anti-duplication rule
- `docs/ai/CONTEXT_MAP.md` — quality route
- `CURRENT_STATE.md` — pointer

## Acceptance Criteria

- [ ] All 19 QUAL tasks have packets
- [ ] Guard validates board ↔ packets ↔ TASK_INDEX consistency
- [ ] Anti-duplication rule enforced
- [ ] CURRENT_STATE.md updated

## Validation

- `pnpm run test:unit`
