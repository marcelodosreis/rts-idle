# QUAL-023 — Session Projections and Tools Coverage

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-019

## Objective

Give `GameSession` a single lifecycle responsibility and bring `tools/*` under
the same quality bar as the packages.

## Scope

- `apps/server/src/sessions/session.ts` — delegates to pure projectors
- `apps/server/src/sessions/session-projections.ts` — new projector module
- `tools/**` — line/function rules now enforced (only curated data is exempt)
- `tests/architecture/typed-domain.test.ts` — scans `tools/**` and `tests/**`

## Acceptance Criteria

- [x] Session projections are pure functions; the session keeps lifecycle and command admission
- [x] `tools/**` is enforced by Biome; only `curated.ts` is exempt
- [x] Typed-domain guard covers tools and tests with a documented allowlist
- [x] `pnpm run verify` green

## Validation

- `pnpm run test:integration`
- `pnpm run lint`
- `pnpm run test:architecture`
- `pnpm run verify`

## Completion Report

PASS. Extracted `session-projections.ts`, enforced the size rules for tools, and
extended the typed-domain guard to `tools/**` and `tests/**`.
