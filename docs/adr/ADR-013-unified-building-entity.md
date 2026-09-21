# ADR-013: Unified Building Entity

## Status

Accepted

## Context

The simulation represented the same world object through parallel `Base`,
`Barracks`, and `Construction` components. That split required every consumer
to reconcile functional markers with construction state and allowed snapshots
to emit duplicate representations.

## Decision

Use one registered `Building` component for every building. It stores the
building type, lifecycle status (`FOUNDATION`, `UNDER_CONSTRUCTION`, or
`COMPLETED`), progress, builder, and footprint. The initial scenario bases are
ordinary completed Building values. The canonical snapshot contains one
`buildings` collection, and the simulation version is `0.7.0`.

Mineral nodes remain separate resources. Compatibility aliases may exist at
the TypeScript boundary for old fixtures, but they are not registered ECS
components and are not used by simulation, server, protocol, or renderer
logic.

## Consequences

Construction lifecycle changes one component, placement checks all buildings,
and clients have one selection/hitbox collection. Existing serialized states
must be treated as pre-0.7.0 data; there is no silent old-format write path.
