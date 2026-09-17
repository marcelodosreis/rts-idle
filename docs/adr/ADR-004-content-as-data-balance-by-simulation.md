# ADR-004 — Content as declarative data; balance via data + headless simulation

Status: Accepted

## Context

Balance is unknowable before real play, and the numbers will change constantly. Hardcoding stats in systems makes every tuning pass a code change with regression risk.

## Decision

- All content — units, buildings, upgrades, abilities, maps — lives in `packages/game-data` as declarative, validated data (schemas, units, buildings, upgrades, maps, ruleset).
- Systems read the ruleset; no gameplay number is hardcoded in simulation systems.
- Tuning is a data change followed by headless validation (`simulate`, `balance`, `fuzz`, replay corpus).
- The MVP accepts imbalance (a strong faction, a broken unit, an unviable expansion) as long as the system can measure and adjust cheaply.

## Alternatives

- **Hardcoded constants in systems**: rejected — every tweak is a code+test change; slow iteration.
- **Designer-only tuning tools without simulation**: rejected — no objective evidence, no regressions.

## Consequences

- **Positive**: cheap iteration; reproducible balance experiments; new content without touching systems; a future automated balance loop (agent → data hypothesis → 100k matches → analysis) fits the same path.
- **Negative**: requires schema validation, reference checks, and a data → tick compiler; authorial numbers must be representable in fixed point.

## Evidence

- `docs/master-plan.md` §4.1 (game-data responsibility), §11–14 (baseline numbers), §19.5 (balance tooling).
- `packages/game-data` package (content catalog; implementation lands with Phase 4A).