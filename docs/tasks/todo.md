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

## Phase 2 — Economy and production (complete)

Execution plan: `docs/tasks/done/VS-01-plan.md`. All planned Phase 2
deliverables through `P2.12` are complete.

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

### BUILD-005 — Construction cancellation (P2.05)

- [x] Autonomous `constructionRefund` formula in `@rts/shared` and `CANCEL_CONSTRUCTION` command
- [x] Atomic cancellation of owned not-yet-completed constructions with `INVALID_STATE` guard
- [x] Builder detachment, footprint release, and dangling-`BUILD`-order invariant
- [x] Two-step HUD action with estimated refund and reduced-scope browser coverage
- [x] Completion gates passed; no production, demolition, or resource/queue work

### Remaining Phase 2

- [x] P2.07 — Production queue and unit training for Pawn, Warrior, and Archer (`PROD-001-002`); Base trains Pawn and Barracks trains Warrior/Archer
- [x] P2.08 — Blocked spawn and rally (`docs/tasks/P2.08.md`)
- [x] P2.09 — Rally shortcut and producer feedback (`docs/tasks/P2.09.md`)
- [x] P2.09.01 — Producer cancellation and destruction (`docs/tasks/done/P2.09.01.md`; master-plan deliverable P2.09)
- [x] ECONOMY-UI-002 — Build menu
- [x] ECONOMY-UI-003 — Production panel for Pawn, Warrior, and Archer
- [x] P2.10.01 — Persistent unit health bars (`docs/tasks/done/P2.10.01.md`)
- [x] P2.10.02 — Building health and shared damage (`docs/tasks/done/P2.10.02.md`)
- [x] P2.10 — Repair (`docs/tasks/done/P2.10.md`)
- [x] P2.11 — Research and modifiers (`docs/tasks/done/P2.11.md`): Castle II, Monastery queue, Attack/Defense/Economy/Movement, armor, modifiers, HUD, and E2E
- [x] P2.11.01 — Monk Heal (`docs/tasks/done/P2.11.01.md`): self/allied healing, cooldown, HUD, effects, and E2E
- [x] P2.12 — Economic integration (`docs/tasks/done/P2.12.md`)

## Phase 3 — Navigation, full combat, and fog

Execution plan: `docs/tasks/P3-phase-plan.md`. `P3.05.01` and `P3.06.01` are
complete. Stop before `P3.07.01`.

- [x] P3.01.01 — Navigation grid (`docs/tasks/done/P3.01.01.md`)
- [x] P3.01.02 — A* pathfinding (`docs/tasks/done/P3.01.02.md`)
- [x] P3.02.01 — Serializable incremental search (`docs/tasks/done/P3.02.01.md`)
- [x] P3.03.01 — Footprint navigation invalidation (`docs/tasks/done/P3.03.01.md`)
- [x] P3.04.01 — Group destinations (`docs/tasks/done/P3.04.01.md`)
- [x] P3.05.01 — Spatial index (`docs/tasks/done/P3.05.01.md`)
- [x] P3.06.01 — Collision and avoidance (`docs/tasks/done/P3.06.01.md`)
- [ ] P3.07.01 — Vision and memory
- [ ] P3.08.01 — Filtered observations and events
- [ ] P3.08.02 — Fog rendering
- [ ] P3.09.01 — Targeting and pursuit
- [ ] P3.10.01 — Projectiles
- [ ] P3.11.01 — Area damage
- [ ] P3.12.01 — Combined army/chokepoint stress

The first technical slice is the pathfinding package. The first complete
player-facing navigation slice is only complete after A*, authoritative MOVE
integration, blocked/unreachable feedback, and real-server browser E2E.

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

> Deprioritized in favor of Phase 3. These tasks remain pending backlog and do
> not block the current gameplay milestone.

## Concept Authority

| Packet | Status | Dependencies | Packages | Validation |
|--------|--------|--------------|----------|------------|
| ARCH.03.01 | done | — | protocol, server | contracts, integration |
| ARCH.03.02 | done | ARCH.03.01 | protocol, server | contracts, integration |
| ARCH.03.03 | done | ARCH.03.02 | server, simulation, web | integration, simulation, e2e |
| ARCH.03.04 | done | ARCH.03.03 | web, renderer, architecture | architecture |
| ARCH.03.05 | done | ARCH.03.04 | protocol, server, web | e2e |
| ARCH.03.06 | done | ARCH.03.05 | protocol, renderer, web | unit |
| ARCH.03.07 | done | — | simulation | simulation, orders |
| ARCH.03.08 | done | ARCH.03.07 | simulation | simulation, orders, determinism |
| ARCH.03.09 | done | ARCH.03.08 | simulation | simulation, orders, determinism |
| ARCH.03.10 | done | ARCH.03.09 | simulation | simulation, determinism |
| ARCH.03.11 | done | — | shared, renderer | unit |
| ARCH.03.12 | done | ARCH.03.11 | renderer, web | unit |
| ARCH.03.13 | done | ARCH.03.12 | docs | lint |
| ARCH.03.14 | done | ARCH.03.10 | protocol, simulation | contracts, simulation, architecture |
| ARCH.03.15 | done | ARCH.03.01–14 | docs, quality | verify, browser |

## Architecture Track 04 — Web feature organization

| Packet | Status | Dependencies | Packages | Validation |
|--------|--------|--------------|----------|------------|
| ARCH.04.08 | done | ARCH.04.07 | protocol, server, web, tests | verify, browser |
| ARCH.04.09 | done | ARCH.04.08 | web, tests, docs | unit, e2e, verify |

### Fundação
- [ ] QH.00 Spec + ADR
- [x] QH.19 Clean code, SOLID, and strong-typing baseline
- [x] QH.20 Web app function decomposition (React ≤50 lines)
- [x] QH.21 Typed-domain completion (registries + branded AssetKey)
- [x] QH.22 Public API and docs sync
- [x] QH.23 Session projections and tools coverage
- [x] QH.24 Mandatory enforcement (git, CI, governance)
- [x] QH.26.01 Deterministic CI and E2E reliability (deps: QH.25)
- [x] QH.27.01 Deterministic E2E and faster pipeline (`docs/tasks/done/QH.27.01.md`; deps: QH.26.01)
- [x] QH.28.01 Unified regression E2E fixture (`docs/tasks/done/QH.28.01.md`; deps: QH.27.01, P2.12)
- [x] QH.28.02 Deterministic blocked production coverage (`docs/tasks/done/QH.28.02.md`; deps: QH.28.01, P2.12)
- [x] QH.17 Front-matter + guard + summary (postmortem tracking)
- [x] QH.18 Board + tracking guard + protocol
- [x] QH.16 Output hygiene (test output)

> QUAL-016 and QUAL-018 are complete. The 2026-10-03 hardening batch below
> records the exceptions and additional completed tasks.

### Quality hardening batch 2026-10-03

Completed in this batch: QH.03 reduced renderer invariants, QH.09 session
isolation, QH.12 animation convention, and QH.28.02 blocked production
coverage. P2.11 documentation was reconciled with the current Gold/Wood model.

Deferred or out of scope for this batch: QH.00, QH.01, QH.02, QH.04, QH.05,
QH.06, QH.07, QH.08, QH.10, QH.13, QH.14, and QH.15; WebKit/touch/mobile
coverage; ARCH.02.*; DEP.01-DEP.09; SCL.01-SCL.04; and Phase 3 work.
QH.11 is recorded as complete because the existing CI parallelism already
satisfied its contract; it was not reimplemented here.

The batch deferral is now an explicit priority decision: Phase 3 has resumed,
and the remaining Quality Hardening tasks stay pending without blocking it.

### Low Effort
- [ ] QH.04 Input helper (deps: QH.00)
- [ ] QH.07 Barrier input (deps: QH.04)
- [x] QH.12 expectAnim + barrier (`docs/tasks/done/QH.12.md`; reduced scope, deps: QH.00)
- [ ] QH.08 Dynamic geometry (deps: QH.02)
- [ ] QH.15 Branch baseline (deps: none)

### Core
- [ ] QH.01 Structural harness (deps: QH.00)
- [ ] QH.02 HUD contract (deps: QH.01)
- [x] QH.03 Display list invariants (`docs/tasks/done/QH.03.md`; reduced scope, deps: QH.01)
- [ ] QH.05 Gesture matrix (deps: QH.04)
- [x] QH.09 Concurrent isolation (`docs/tasks/done/QH.09.md`; reduced scope, deps: QH.00)
- [ ] QH.10 Barrier singleton (deps: QH.00)

### Structural
- [x] QH.11 Toggle CI parallelism (`docs/tasks/done/QH.11.md`; already satisfied, deps: QH.09, QH.10)
- [ ] QH.06 WebKit/touch (deps: QH.05)

### Conditional
- [ ] QH.13 Path-based E2E gate (deps: QH.02, QH.05)
- [ ] QH.14 Coverage ratchet (deps: QH.16)

### Browser Validation
- [x] Browser gate stratification: complete, functional, and performance-telemetry jobs
