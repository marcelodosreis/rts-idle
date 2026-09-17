# Task List — Browser RTS

Master plan: `docs/master-plan.md`. Specs: `docs/specs/`.

## Phase 0 — Foundation and spikes

- [x] P0.01 Materialize specs and capability map (`docs/specs/CAPABILITIES.md`, `docs/specs/SPEC-*.md`)
- [x] P0.02 Register internal mutability exception (`AGENTS.md`)
- [x] P0.03 `package.json`, workspace, Node/pnpm versions
- [x] P0.04 TS base and portable/Node/browser profiles
- [x] P0.05 Manifest/tsconfig/index per package
- [x] P0.06 Vitest, Biome, and scripts
- [x] P0.07 Initial CI and hygiene
- [x] P0.08 `shared/fixed.ts`, `rng.ts`, IDs — `deterministic-primitives`
- [x] P0.09 State and minimal ECS — `ecs-lifecycle`
- [x] P0.10 `simulation/engine.ts` and tick — `fixed-tick`
- [x] P0.11 Serialization/hash/snapshot minimal — `snapshot-roundtrip`
- [x] P0.12 Minimal headless replay — `minimal-replay`
- [x] P0.13 Minimal validated MOVE command — `move-command`
- [x] P0.14 Server adapter and single technical session — `authoritative-move`
- [x] P0.15 Minimal PixiJS renderer — `renderer-lifecycle`
- [x] P0.16 Visual camera/selection and MOVE send — E2E `select-and-move`
- [x] P0.16.1 Formation spread: multi-unit MOVE arrives spread (never stacked) — postmortem `2026-09-16-units-stacked-at-target`
- [x] P0.17 Benchmark harness and browser determinism
- [x] P0.18 Run spikes and write ADRs

> Next (queued): Phase 1 (Simulation core, P1.01–P1.09).

### Phase 0 gate

- [x] No forbidden dependencies
- [x] Deterministic RNG and IDs
- [x] Snapshot/restore proven
- [x] Minimal replay proven
- [x] Browser controls an entity through the server
- [x] Independent visual loop
- [x] Camera and selection tested
- [x] Performance matrix executed
- [x] Tick rate decided (ADR-009)

## Phase 1 — Simulation core
- [ ] P1.01–P1.09 (see `docs/master-plan.md`)

## Phase 2 — Economy and production
- [ ] P2.01–P2.12 (see `docs/master-plan.md`)

## Phase 3 — Navigation, full combat, and fog
- [ ] P3.01–P3.12 (see `docs/master-plan.md`)

## Phase 4A — M1 content
- [ ] P4.01–P4.07 (see `docs/master-plan.md`)

## Phase 5 — Initial AI
- [ ] P5.01–P5.06 (see `docs/master-plan.md`)

## Phase 6 — Rooms and full multiplayer
- [ ] P6.01–P6.09 (see `docs/master-plan.md`)
- [ ] P6.10 Server error-code registry + CI guard (beatswag pattern) — deferred here

## Phase 7 — Replay and full tooling
- [ ] P7.01–P7.09 (see `docs/master-plan.md`)

## Phase 8 — Browser MVP and M1 completion
- [ ] P8.01–P8.12 (see `docs/master-plan.md`)

## Phase 4B — M2 content expansion
- [ ] P4B.01–P4B.10 (see `docs/master-plan.md`)

## Phase 9 — Polish and M2 release
- [ ] P9.01–P9.07 (see `docs/master-plan.md`)