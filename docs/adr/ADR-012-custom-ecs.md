# ADR-012 — Custom ECS data structure

Status: Accepted

## Context

ADR-001 established the single-writer model and the authorized mutability
exception (only `step()` mutates GameState). The open question was the concrete
entity/component/storage structure inside that core.

## Decision

Builds on **ADR-001** (single writer, mutability exception) and adds:

- A small in-house ECS in `packages/simulation/src/ecs` (no external framework).
- Components are plain data registered as a `ComponentType` (name + canonical
  encode/decode, see ADR-002/011).
- `World` holds one `ComponentStore` (`Map<EntityId, T>`) per component plus the
  alive-id set; `aliveIds()` returns ids sorted ascending so every query is
  deterministic.
- Entity ids come from a monotonic allocator and are never recycled.
- **Storage layout is not identity**: restoring a snapshot may reorganize
  internal slots without changing semantics or hashes.

## Alternatives

- **ECS framework (e.g., bitecs)** — rejected: extra dependency whose storage
  and iteration semantics add indirection to hashing/serialization without
  buying determinism we do not already control.
- **Copy-on-write immutable state** — rejected: correct but wasteful per tick;
  ADR-001's restricted single-writer mutation is deterministic and simpler.

## Consequences

- Simple `Map` stores for now; hot components can move to dense typed arrays
  later without changing behavior (guarded by roundtrip tests).
- Serialization walks components in registration order (ADR-002/011).
- Iteration is always id-sorted, so system ordering (ADR-013) is well-defined.

## Evidence

- `tests/unit/ecs-lifecycle.test.ts` — create/remove/restore, id ordering.
- `tests/simulation/snapshot-roundtrip.test.ts` — semantic equality after restore.
- `tests/determinism/minimal-replay.test.ts` and `tests/e2e/determinism-browser.spec.ts`.