# Task List — Browser RTS

Master plan: `docs/master-plan.md`. Specs: `docs/specs/`.
Task packet convention: completed packets are archived in [`docs/tasks/done/`](done/);
active and pending packets remain here. See [`docs/tasks/README.md`](README.md).

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

## Phase 1 — Simulation core (execution plan: `docs/tasks/done/VS-01-plan.md`, master plan §23.2)

### Sprint 0 — Docs and coordination
- [x] C0 master-plan + todo synced (visual parallel track §23.2)
- [x] C1 ledger + ADR-015 + ADR-005 superseded
- [x] C2 `docs/proposals/visual-feedback-layer.md`
- [x] C3 dependency matrix renderer/web → game-data

### Sprint A — Asset organization and capabilities
- [x] A0.1 organize all assets (`public/assets/**`, `build-manifest`, `copy`, `.gitignore`)
- [x] A0.2 `docs/assets/capabilities.md`

### Sprint C — Visual base (playable animated demo)
- [x] V1 interpolation + 1 tile = 64 px scale
- [x] V3 asset pipeline (manifest, loader, `createStripAnimation`)
- [x] V4 terrain layer (tileset + water foam + decorations)
- [x] V5 animated units (idle/run, flip, shadow, fallback)
- [x] V10a base HUD (selection panel + chrome)
- [x] V12a visual base e2e
- [x] Gate: MOVE animated over real tileset, no teleport, playable

### Sprint D — Phase 1 core (P1.01–P1.03)
- [x] A1 P1.00 systems pipeline in frozen order + event hook
- [x] A2 P1.01 complete command contracts (`command-schema`)
- [x] A3 P1.02 atomic validate→apply pipeline (`command-atomicity`)
- [x] A4 movement system (speed, integer remainder, arrival)
- [x] A5 MOVE real per tick + migrate move-command/e2e
- [x] A6 P1.03 order queue + STOP/HOLD/PATROL (`order-lifecycle`)

### Sprint E — HUD data + events
- [x] A7 P1.04 players/wallet + canonical extension + golden regen + version 0.2.0 (`player-state`)
- [x] A8 P1.04b SURRENDER + defeat
- [x] V8 snapshot/protocol hp/maxHp/kind/orderState/players/events
- [x] V6 event contract (attackFired/damageDealt/unitDied)
- [x] V10b resources/supply HUD — BUILD-004

### Sprint F — Combat + readable feedback
- [x] A9 P1.05 combat components + stats + ATTACK + instant damage (`basic-combat`)
- [x] A10 P1.05b target selection + ATTACK_MOVE + HOLD auto-attack
- [x] A11 P1.06 simultaneous damage and death (`simultaneous-death`)
- [x] V7 emit real events
- [x] V9 combat feedback (HP bars, streak/Arrow, damage popup, explosion)
- [x] V11 hostile demo scenario
- [x] V12b visual combat e2e

### Sprint G — Closing
- [x] A12 P1.07 victory/draw/tick limit (`victory`)
- [x] A13 P1.08 central invariants (`core-invariants`)
- [x] A14 P1.09 expanded determinism (`core-replay`)
- [x] V13 `docs/simulation.md` + `docs/commands.md` + public-api
- [x] A0.2b capabilities.md updated
- [x] G1 Phase 1 gate + report + README + todo + ledger

> **Phase 1 complete** (2026-09-18). Simulation core A1–A10 was rebuilt from
> scratch after being lost in the merge of the engineering refactor (`82212a8`);
> A11–A14 + visual track (V7–V13) completed on top. Gate: `pnpm run verify` green,
> 21/21 e2e. Report: `docs/reports/phase-1.md`.

> Phase 1 dependency (master plan): Phase 0 approved. Full command contracts,
> order queue, and complete combat rules. Visual track runs in parallel (ADR-015).

## Phase 2 — Economy and production

Execution plan: `docs/tasks/done/VS-01-plan.md`. Latest completed task packet:
`docs/tasks/done/BUILD-003.md`. Active packet: `docs/tasks/BUILD-004.md`.

### VS-01 — Economy v0 (P2.01–P2.02)

- [x] T1 Canonical Mineral Node, Base, Cargo, and GATHER order state
- [x] T2 Atomic shared/protocol/simulation GATHER command
- [x] Checkpoint: state and command contracts green
- [x] T3 Worker gather/carry/return/deposit loop in the system pipeline
- [x] T4 Exhaustion, contention, waiting, cancellation, and death behavior
- [x] Checkpoint: playable simulation slice green
- [x] T5 Snapshot, restore, deterministic replay, version, and golden hash
- [x] T6 Public contracts and operational documentation
- [x] Completion: `pnpm run verify`; browser changes also ran the explicit E2E gate

### VS-01B — Playable Economy Integration

- [x] Dedicated economy scenario and authoritative Base/Mineral projections
- [x] Contextual browser GATHER, minimal visuals, and live Mineral HUD
- [x] Real-interaction browser coverage for deposit, repeat, and STOP
- [x] Pickaxe/carrying sprites, economy progress bar, active-node highlight, and visible phase status
- [x] Completion: `pnpm run verify`; browser changes also require the explicit E2E gate

### ECONOMY-006 — Manual cargo deposit and visible carrying state

- [x] Atomic shared/protocol/simulation `DEPOSIT` command and canonical order tag
- [x] Economy-system deposit (walk, credit, idle) reusing Base validation/credit helpers
- [x] `SnapshotUnit.carrying` projection independent of the front order
- [x] Renderer carry pose without a gather order and Base right-click deposit in the HUD
- [x] Postmortem and co-located regression tests for the invisible carrying state
- [x] Completion: `pnpm run verify`; browser changes also require the explicit E2E gate

### BUILD-001 — Building placement validation

- [x] Deterministic rectangular footprint validation with explicit rejection reasons
- [x] Map bounds, invalid cells, integer tile coordinates, overlap, and edge-touching rules
- [x] Invariant helper and focused unit/invariant coverage
- [x] Completion gates passed; no construction, protocol, renderer, or production changes

### BUILD-002 — Base construction

- [x] BASE definition, cost, footprint, duration, and canonical construction state
- [x] Atomic BUILD command with placement, ownership, worker, and mineral validation
- [x] Foundation reservation, worker construction, pause, takeover, and completion
- [x] Snapshot, restore, replay, hash, and invariant coverage
- [x] Completion gates passed; no cancellation, production, pathfinding, or UI changes

### BUILD-003 — Barracks construction

- [x] BARRACKS definition, 3×3 footprint, 150 minerals, and 100 ticks
- [x] Generalized BUILD validation and canonical construction/order tags
- [x] Foundation, pause, takeover, resume, completion, and Barracks marker coverage
- [x] Snapshot, replay, deterministic hash, invariant, contract, and architecture coverage
- [x] Completion gates passed; no production, supply, rally point, or UI changes

### BUILD-004 — Supply Depot and Supply HUD

- [x] Supply state, Base/Depot capacity, unit usage, over-cap, and global cap
- [x] Supply Depot definition and shared construction lifecycle
- [x] Canonical snapshot, restore, hash, replay, protocol guard, and projection
- [x] Supply HUD and browser scenario coverage
- [x] Completion gates passed; no production queue or reserved supply

### Remaining Phase 2

- [ ] P2.04–P2.12 (see `docs/master-plan.md`)

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

## Quality Hardening

## Concept Authority

| Packet | Status | Dependencies | Packages | Validation |
|--------|--------|--------------|----------|------------|
| AUTH-005A | done | — | protocol, server | contracts, integration |
| AUTH-005 | done | AUTH-005A | protocol, server | contracts, integration |
| AUTH-006 | done | AUTH-005 | server, simulation, web | integration, simulation, e2e |
| AUTH-007 | done | AUTH-006 | web, renderer, architecture | architecture |
| AUTH-008 | done | AUTH-007 | protocol, server, web | e2e |
| AUTH-009 | done | AUTH-008 | protocol, renderer, web | unit |
| AUTH-010 | done | — | simulation | simulation, orders |
| AUTH-011 | done | AUTH-010 | simulation | simulation, orders, determinism |
| AUTH-012 | done | AUTH-011 | simulation | simulation, orders, determinism |
| AUTH-013 | done | AUTH-012 | simulation | simulation, determinism |
| AUTH-014 | done | — | shared, renderer | unit |
| AUTH-015 | done | AUTH-014 | renderer, web | unit |
| AUTH-016 | done | AUTH-015 | docs | lint |
| AUTH-017 | done | AUTH-013 | protocol, simulation | contracts, simulation, architecture |
| AUTH-018 | done | AUTH-005–017 | docs, quality | verify, browser |

### Fundação
- [ ] QUAL-000 Spec + ADR
- [x] QUAL-017 Front-matter + guard + resumo (postmortem tracking)
- [ ] QUAL-018 Board + tracking guard + protocolo
- [ ] QUAL-016 Higiene de saída (test output)

### Low Effort
- [ ] QUAL-004 Input helper (deps: QUAL-000)
- [ ] QUAL-007 Barrier input (deps: QUAL-004)
- [ ] QUAL-012 expectAnim + barrier (deps: QUAL-000)
- [ ] QUAL-008 Dynamic geometry (deps: QUAL-002)
- [ ] QUAL-015 Branch baseline (deps: none)

### Core
- [ ] QUAL-001 Structural harness (deps: QUAL-000)
- [ ] QUAL-002 HUD contract (deps: QUAL-001)
- [ ] QUAL-003 Display list invariants (deps: QUAL-001)
- [ ] QUAL-005 Gesture matrix (deps: QUAL-004)
- [ ] QUAL-009 Concurrent isolation (deps: QUAL-000)
- [ ] QUAL-010 Barrier singleton (deps: QUAL-000)

### Structural
- [ ] QUAL-011 Toggle CI parallelism (deps: QUAL-009, QUAL-010)
- [ ] QUAL-006 WebKit/touch (deps: QUAL-005)

### Conditional
- [ ] QUAL-013 Path-based E2E gate (deps: QUAL-002, QUAL-005)
- [ ] QUAL-014 Coverage ratchet (deps: QUAL-016)

### Browser Validation
- [x] E2E-001 Gate stratification: complete, functional, and performance gates
