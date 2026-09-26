# QH.19 — Clean Code, SOLID, and Strong Typing Baseline (historical alias: QUAL-019)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** —

## Objective

Establish one canonical clean-code/SOLID/typed-strings standard, make it
enforceable, and apply it across the core packages.

## Scope

- `docs/engineering-standard.md` — canonical "Clean Code & SOLID" and "Typed domain strings"
- `.opencode/rules/common/coding-style.md` — SOLID + typed strings mirror
- `docs/ai/{EXECUTION_PROTOCOL,TASK_PACKET_TEMPLATE,CONTEXT_MAP}.md` — references
- `tsconfig.base.json` — hardened compiler options
- `biome.jsonc` — line/param/complexity enforcement
- `packages/shared` — `assertNever`, parse helpers, single-source registries
- `packages/{game-data,protocol,simulation,renderer}` — typed boundaries, codecs
- `apps/server` — projection/transport decomposition
- `tests/architecture/typed-domain.test.ts` — AST guard
- `docs/tasks/todo.md`, `docs/ai/TASK_INDEX.md`, `CURRENT_STATE.md` — tracking

## Acceptance Criteria

- [x] Standard documented and mirrored; enforcement wired (Biome + AST guard)
- [x] Core packages strongly typed: no `as string`/`as unknown`, no domain
      `Record<string, X>`, exhaustive `assertNever` dispatch
- [x] Canonical tag codecs centralized; golden hash unchanged
- [x] `pnpm run verify` green
- [ ] `apps/web` function-length decomposition — tracked as QUAL-020 (Biome warns)

## Validation

- `pnpm run verify`
- `pnpm run test:architecture`

## Completion Report

PASS (core scope). Added the standard, hardened tsconfig, `assertNever`/parse
helpers, single-source registries, deduplicated codecs, exhaustive dispatch, and
the typed-domain AST guard; split long simulation/renderer/server functions.
`pnpm run verify` green; simulation golden hash unchanged. React app
decomposition remains open (QUAL-020).
