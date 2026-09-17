# Agent Coordination Ledger

Claim a file before editing it. Mark it `done` when finished. Never edit a file another agent has marked `in-flight`. Full ownership rules live in `AGENTS.md` (section *Agent Coordination*).

| File / Area | Owner | Status | Last action |
|---|---|---|---|
| `README.md` | Philosophy agent | done | Core philosophy opening; removed content-specific and AI claims |
| `AGENTS.md` | Philosophy agent | done | Added Agent Coordination section |
| `docs/agent-ledger.md` | Philosophy agent | done | Created |
| `docs/adr/*` | Philosophy agent | done | ADR-001..008 written (all accepted; 007 approved) |
| `docs/game-design.md` | Philosophy agent | done | Created + Playable releases section added |
| `docs/proposals/m0-playable-core.md` | Philosophy agent | done | Created — approved |
| `docs/master-plan.md` §2, §23 | Philosophy agent | done | M0 milestone + Phase M0 inserted (coordinated pass, ADR-007) |
| `tasks/todo.md` | Philosophy agent (user-approved cross-territory edit) | done | Added Phase M0 checklist — implementation agent: keep in sync |
| `docs/master-plan.md` | Shared | free | — |
| `packages/**`, `apps/**`, `tools/**`, `tests/**`, `.github/**` | Implementation agent | free | — |
| Implementation ADRs (tick rate, ECS store design, A* budget, PixiJS/WebGL2, filtered replication) | Implementation agent | pending | To be written when the Phase 0 spikes run |
| Pull headless `simulate`/`balance` tooling earlier than Phase 7 | Implementation agent | pending | Recommendation from philosophy review — enable the data-driven balance loop before full content |
| Materialize Phase M0 tasks into the implementation backlog | Implementation agent | pending | Check `tasks/todo.md` — M0.01..M0.09 added by philosophy agent (user-approved) |
| `packages/renderer/src/renderer.ts` | Implementation agent | done | Camera fix: removed `fitWorld()`; `initialZoom`/`initialCenter`/`clampZoom`; `getZoom()` |
| `apps/web/src/screens/MatchScreen.tsx`, `apps/web/src/client/connection.ts` | Implementation agent | done | Pass initial camera; real WS open/error status; unit count |
| `tests/e2e/regression-units-visible.spec.ts` | Implementation agent | done | Permanent regression for invisible-units bug (postmortem 2026-09-16) |
| `docs/postmortems/TEMPLATE.md`, `docs/postmortems/2026-09-16-invisible-units.md` | Implementation agent | done | Postmortem + template |
| `AGENTS.md` (Bug Response Protocol), `README.md` (postmortems mention) | Implementation agent | done | Added bug → postmortem → regression protocol |
| `docs/specs/*`, `docs/master-plan.md` (ADR titles), `tasks/todo.md` | Implementation agent | done | English-only pass (docs/README always in English) |
| `packages/renderer/src/renderer.ts`, `apps/web/src/screens/MatchScreen.tsx` | Implementation agent | done | Minimal operability slice: selection rings, command ping, `selected: N` HUD, `setSelection`/`getSelection`/`getPing` debug |
| `tests/e2e/selection-feedback.spec.ts` | Implementation agent | done | E2E: selection feedback + command ping |
| `apps/web/src/screens/MatchScreen.tsx`, `packages/renderer/src/renderer.ts` | Implementation agent | done | Fix MOVE fractional coords (round at command boundary); added `moveCamera` debug |
| `tests/e2e/regression-move-fractional-coords.spec.ts`, `tests/integration/move-command.test.ts` | Implementation agent | done | Regression: fractional-coordinate MOVE must move; contract: fractional payload rejected INVALID_PAYLOAD |
| `docs/postmortems/2026-09-16-move-rejected-fractional-coordinates.md`, `docs/testing/manual-smoke.md` | Implementation agent | done | Postmortem + manual smoke checklist |
| `apps/server/src/main.ts` | Implementation agent | done | Per-connection isolated demo session (fixes shared-state flakiness) |
| `docs/postmortems/2026-09-16-shared-demo-session.md` | Implementation agent | done | Postmortem: shared demo session |
| `packages/simulation/src/formation.ts`, `packages/simulation/src/engine.ts` | Implementation agent | done | Deterministic formation spread for multi-unit MOVE |
| `tests/unit/formation-offsets.test.ts`, `tests/integration/formation-destinations.test.ts`, `tests/e2e/regression-units-spread.spec.ts` | Implementation agent | done | Regression: units must arrive spread, never stacked |
| `docs/postmortems/2026-09-16-units-stacked-at-target.md`, `docs/testing/manual-smoke.md` | Implementation agent | done | Postmortem + smoke test update |
| `apps/server/package.json` | Implementation agent | done | `dev` → `tsx watch` (auto-restart, no stale servers) |
| `docs/postmortems/2026-09-16-stale-server-served-old-code.md`, `docs/testing/manual-smoke.md` | Implementation agent | done | Postmortem (stale server) + restart/refresh note |
| `tests/fixtures/seeds.ts`, `tests/fixtures/identity.ts`, `tests/fixtures/index.ts` + 8 test files | Implementation agent | done | Centralized all test seeds + duplicated `identity` into `tests/fixtures/`; relative imports (work in Vitest + Playwright) |
| `tools/simulator/**`, `tools/fuzz/**`, `tools/replay/**` + `tests/unit/ascii-map.test.ts`, `tests/unit/replay-format.test.ts`, `tests/fuzz/fuzz-core.test.ts` | Implementation agent | done | Headless tools pulled early, then **removed** (user rejected); `simulate`/`fuzz`/`replay` CLIs and their tests deleted; `balance`/`benchmark` keep their scripts |
| `vitest.config.ts` | Implementation agent | done | Reordered `@rts/simulation/*` aliases (specific subpaths before base prefix) so fixtures/contracts resolve under Vitest |
| `tools/benchmark/**`, `packages/simulation/src/determinism-fixture.ts` | Implementation agent | done | P0.17: simulation benchmark harness + determinism fixture (subpath `./fixtures`) |
| `apps/web/det.html`, `apps/web/perf.html`, `apps/web/src/{det,perf}/main.ts` | Implementation agent | done | P0.17: browser determinism + renderer perf harness pages |
| `tests/e2e/determinism-browser.spec.ts`, `tests/e2e/renderer-perf.spec.ts` | Implementation agent | done | P0.17: Node≡Chromium determinism + renderer perf |
| `docs/adr/ADR-009..013` | Implementation agent | done | P0.18: tick rate (20/s), PixiJS/WebGL2, canonical hashing, custom ECS, system order |
| `docs/master-plan.md` §21.4 | Implementation agent | done | P0.18: measured baseline (2026-09-16) |
| `.github/workflows/ci.yml` | Implementation agent | done | Add E2E (chromium) after build |
| `docs/adr/ADR-009..013` | Implementation agent | done | Dedup review vs ADR-001..008: 011→refs ADR-002, 012→refs ADR-001; added `Status: Accepted` to all |
| M0 revert (coordinated pass) | Implementation agent (user decision) | done | M0 withdrawn: master-plan §2/§23 restored to original ordering; ADR-007 → Superseded; proposal → Withdrawn; todo Phase M0 removed; game-design reworded. Next: Phase 1 |
| Config extraction from beatswag.co (user request) | Implementation agent | done | Cloned to /tmp/opencode/beatswag-co; brought Husky (pre-commit lint-staged + 10-file gate, commit-msg commitlint, pre-push blocks `main` + typecheck), Biome rules (biome.jsonc, formatter style kept, 4 documented exceptions), .lintstagedrc.json, commitlint.config.js, .gitignore `/.husky/_`. Deps: husky, lint-staged, @commitlint/cli+config. All suites green |
| Config round 2 (user request) | Implementation agent | done | minimumReleaseAge=2 in pnpm-workspace.yaml (+biome exclude) · CI concurrency+cancel-in-progress · PR template with opencode session · semantic-release (repo-level, branches main, npmPublish false, @semantic-release/git bumps package.json, CI release job with [skip ci] guard; dry-run validated, needs remote to fully run). Error-code guard deferred to Phase 6 (P6.10). /tmp clone deleted |
| Full-codebase engineering refactor (user request) | Implementation agent | done | Phases A–H: safety net, rng split, protocol, simulation splits, renderer split, apps, tests/barriers, docs (engineering-standard, architecture, ADR-014), final audit. See ADR-014 |
| `packages/shared/**`, `packages/simulation/**`, `packages/protocol/**`, `packages/renderer/**` | Implementation agent | done | Engineering refactor (Phases B–D). Public APIs preserved; determinism/hash unchanged |
| `apps/server/**`, `apps/web/**`, `tools/**` | Implementation agent | done | Engineering refactor (Phase E); protocol adoption + clarity |
| `tests/**`, `docs/engineering-standard.md`, `docs/architecture.md`, `docs/adr/ADR-014*.md`, `AGENTS.md`, `README.md` | Implementation agent | done | Engineering refactor (Phases A/F/G). Claims registered before each edit |
| `tools/benchmark/**`, `apps/web/src/perf/main.ts` | Implementation agent | done | Follow-up audit (user review): split benchmark-simulation.ts into benchmark-{world,stats,timing,environment,row}; split cli.ts into args/format/main; extracted local percentile + gridPosition in perf harness |
| `package.json` (scripts), `README.md`, `docs/testing/manual-smoke.md` | Implementation agent | done | Added `pnpm dev` (parallel server+web) and `pnpm verify` (full local gate); docs updated |
| Visual/feedback layer + Phase 1 (2026-09-17 user decision) | Implementation agent | in-flight (paused) | ADR-005 superseded (real RTS sprite pack, license-gated). Sprints 0–E done: docs/ADR-015, assets org (52 curated), terrain, animated units, HUD base, systems pipeline, contracts, atomicity, movement, order queue (STOP/HOLD/PATROL), players/wallet, surrender, combat A9/A10 (191 vitest + 11 e2e green). PAUSED for animation/sprite agent — see `docs/handoff-animations.md`. Next: A11 simultaneous death. |