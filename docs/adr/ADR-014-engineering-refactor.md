# ADR-014 — Engineering refactor: module layout, protocol contract, and fixture reuse

Status: Accepted

Date: 2026-09-16

## Context

The Phase 0 foundation was functionally complete, but several modules mixed
independent responsibilities, the wire format was duplicated ad-hoc across
`apps/server` and `apps/web` without validation, domain types (`Fixed`,
`PlayerId`) were modeled as raw `number`, and the same fixture/identity/shape
was rebuilt in several places. Before Phase 1 grows the simulation, the
codebase needed a structural pass that preserved every public contract and
every byte of the canonical stream.

## Decision

- **Protocol becomes real.** Versioned wire messages (`MoveMessage`,
  `SnapshotMessage`, `ErrorMessage`) and runtime guards live in
  `packages/protocol`; server and web consume them instead of defining local
  JSON shapes and casting unvalidated input.
- **Simulation module layout.** Split `engine.ts` into `engine/` (creation,
  restore, host contract, class) and `commands/` (dispatch, MOVE rules,
  limits). Split `canonical/encoder.ts` into `canonical/{writer,reader,utf8,
  error}` and `snapshot/serialize.ts` into `snapshot/{serialize,hash}`. Split
  `ecs/world.ts` into `ecs/{component-store,world,create-world}`.
- **Renderer module layout.** Split `renderer.ts` into `types.ts` (public
  contract), `unit-layer.ts`, `selection.ts`, `ping.ts`; `PixiRenderer`
  orchestrates.
- **Domain typing.** `Fixed`, `EntityId`, and `PlayerId` are applied to
  payloads, components, and commands. The `Owner` decode validates the slot
  range instead of casting.
- **Shared factories.** `createRulesIdentity(tag, overrides)` replaces four
  hand-built identities; `gridPosition` replaces duplicated grid math;
  `MAX_UNITS_PER_COMMAND` is a single exported constant.
- **Test fixtures centralized.** `tests/fixtures/world.ts` and
  `tests/fixtures/commands.ts` replace per-file world/command builders.
- **RNG split.** `shared/rng.ts` becomes `shared/rng/` (rotate-left,
  splitmix32, rng-state, create-rng, next-rng, next-rng-int) with semantic
  locals and why-comments. This mirrors the module-cohesion rule while keeping
  the algorithm byte-identical.
- **Automated barriers.** `tests/architecture/package-dependencies.test.ts`
  enforces the package dependency matrix (master plan §4.2); the public-API
  test guards the exported surface.

## Alternatives

- **Keep the monoliths** (`engine.ts`, `renderer.ts`) — rejected: Phase 1+
  systems and UI features would compound the mixed responsibilities.
- **Splitting every function into its own file** — rejected: over-fragmentation
  without cohesion gain; the brief's "one public function per file" is applied
  per cohesive responsibility, not per line.
- **Add a validation library (zod)** — rejected: the protocol guards are small
  and dependency-free; master plan keeps external schemas optional.

## Consequences

- Public `@rts/*` surfaces are preserved exactly (verified by the public-API
  test); the RNG golden vector, the serialized-state golden bytes, determinism,
  replay, and snapshot tests are unchanged and green.
- Future code has clear homes: new commands go in `commands/`, new wire
  messages in `protocol/`, new renderer feedback in its own layer module.
- The dependency matrix is now machine-enforced; adding a forbidden import
  fails CI.
- The `docs/engineering-standard.md` codifies the conventions (one public
  function per file, math clarity, self-audit) so new agents follow them
  without re-deriving them.

## Evidence

- `tests/simulation/hash-golden.test.ts` — pinned state bytes + hash.
- `tests/unit/canonical-encoder.test.ts`, `tests/unit/protocol-messages.test.ts`,
  `tests/unit/snapshot-to-frame.test.ts`.
- `tests/architecture/package-dependencies.test.ts`,
  `tests/architecture/public-api.test.ts`.
- Full validation: typecheck, lint, 125 unit/integration/simulation/
  determinism/architecture tests, build, 10 e2e specs.