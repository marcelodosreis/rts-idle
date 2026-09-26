# QH.24 — Mandatory Enforcement (Git, CI, and Governance) (historical alias: QUAL-024)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-019

## Objective

Make the clean-code/SOLID/typed-domain bar blocking everywhere: pre-commit,
pre-push, CI, review, and the standing Definition of Done.

## Scope

- `package.json` — `lint-staged` configuration (Biome on staged files)
- `.husky/pre-push` — `typecheck` + `lint` + `test:architecture`
- `tests/architecture/typed-domain.test.ts` — whole-repository scope
- `AGENTS.md`, `docs/ai/EXECUTION_PROTOCOL.md`, `docs/ai/TASK_PACKET_TEMPLATE.md`,
  `docs/ai/CONTEXT_MAP.md`, `.opencode/references/definition-of-done.md`,
  `.opencode/rules/common/{coding-style,development-workflow,code-review}.md`,
  `.opencode/rules/typescript/coding-style.md`,
  `.opencode/skills/code-review-and-quality/SKILL.md`
- `.github/pull_request_template.md`

## Acceptance Criteria

- [x] Pre-commit runs Biome on staged files; pre-push blocks on typecheck/lint/architecture
- [x] Every rule, checklist, and skill states the bar is mandatory in everything
- [x] PR template requires lint, architecture, and verify evidence
- [x] Guards cover packages, apps, tools, and tests

## Validation

- `pnpm run lint`
- `pnpm run test:architecture`
- `pnpm run verify`

## Completion Report

PASS. Added `lint-staged`, hardened pre-push, extended the guard, and updated
AGENTS, the execution protocol, the Definition of Done, the rules, the review
skill, and the PR template to make the bar mandatory repository-wide.
