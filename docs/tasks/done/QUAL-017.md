# QUAL-017 — Front-matter + guard + resumo

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** none

## Objective

Enable binary postmortem tracking (open/closed) with front-matter, guard, and generated summary.

## Scope

- `docs/postmortems/TEMPLATE.md` — updated with front-matter
- `docs/postmortems/*.md` — 15 postmortems with front-matter
- `tools/quality/postmortem-status.ts` — status generator
- `docs/quality/postmortem-status.md` — generated summary
- `tests/architecture/postmortem-status.test.ts` — guard

## Acceptance Criteria

- [x] All 15 postmortems have valid front-matter
- [x] Guard validates status, classe, barreira, regressao
- [x] Summary generated: 2 open, 13 closed
- [x] Guard passes: `pnpm run test:architecture`

## Validation

- `pnpm run test:architecture`
