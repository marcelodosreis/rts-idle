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

## Phase 1 — Simulation core (execution plan: `tasks/plan.md`, master plan §23.2)

### Sprint 0 — Docs and coordination
- [ ] C0 master-plan + todo synced (visual parallel track §23.2)
- [ ] C1 ledger + ADR-015 + ADR-005 superseded
- [ ] C2 `docs/proposals/visual-feedback-layer.md`
- [ ] C3 dependency matrix renderer/web → game-data

### Sprint A — Asset organization and capabilities
- [ ] A0.1 organize all assets (`public/assets/**`, `build-manifest`, `copy`, `.gitignore`)
- [ ] A0.2 `docs/assets/capabilities.md`

### Sprint C — Visual base (playable animated demo)
- [ ] V1 interpolation + 1 tile = 64 px scale
- [ ] V3 asset pipeline (manifest, loader, `createStripAnimation`)
- [ ] V4 terrain layer (tileset + water foam + decorations)
- [ ] V5 animated units (idle/run, flip, shadow, fallback)
- [ ] V10a base HUD (selection panel + chrome)
- [ ] V12a visual base e2e
- [ ] Gate: MOVE animated over real tileset, no teleport, playable

### Sprint D — Phase 1 core (P1.01–P1.03)
- [ ] A1 P1.00 systems pipeline in frozen order + event hook
- [ ] A2 P1.01 complete command contracts (`command-schema`)
- [ ] A3 P1.02 atomic validate→apply pipeline (`command-atomicity`)
- [ ] A4 movement system (speed, integer remainder, arrival)
- [ ] A5 MOVE real per tick + migrate move-command/e2e
- [ ] A6 P1.03 order queue + STOP/HOLD/PATROL (`order-lifecycle`)

### Sprint E — HUD data + events
- [x] A7 P1.04 players/wallet + canonical extension + golden regen + version 0.2.0 (`player-state`)
- [x] A8 P1.04b SURRENDER + defeat
- [ ] V8 snapshot/protocol hp/maxHp/kind/orderState/players/events
- [x] V6 event contract (attackFired/damageDealt/unitDied)
- [ ] V10b resources/supply HUD

### Sprint F — Combat + readable feedback
- [x] A9 P1.05 combat components + stats + ATTACK + instant damage (`basic-combat`)
- [x] A10 P1.05b target selection + ATTACK_MOVE + HOLD auto-attack
- [ ] A11 P1.06 simultaneous damage and death (`simultaneous-death`)
- [ ] V7 emit real events
- [ ] V9 combat feedback (HP bars, streak/Arrow, damage popup, explosion)
- [ ] V11 hostile demo scenario
- [ ] V12b visual combat e2e

### Sprint G — Closing
- [ ] A12 P1.07 victory/draw/tick limit (`victory`)
- [ ] A13 P1.08 central invariants (`core-invariants`)
- [ ] A14 P1.09 expanded determinism (`core-replay`)
- [ ] V13 `docs/simulation.md` + `docs/commands.md` + public-api
- [ ] A0.2b capabilities.md updated
- [ ] G1 Phase 1 gate + report + README + todo + ledger

> **PAUSED for animation/sprite agent** (see `docs/handoff-animations.md`).
> Branch `feat/visual-core`; green: 191 vitest + 11 e2e.

> Phase 1 dependency (master plan): Phase 0 approved. Full command contracts,
> order queue, and complete combat rules. Visual track runs in parallel (ADR-015).

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