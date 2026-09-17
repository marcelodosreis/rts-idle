# ADR-008 — Client prediction deferred, gated by measurement

Status: Accepted

## Context

Responsiveness is a core product goal, but client prediction combined with server authority, fog of war, and replay is the most expensive networking combination in games. For an M1 that plays against a bot (server-side, local/low-latency), prediction is not needed to feel snappy.

## Decision

- M1 ships with filtered replication, interpolation, and immediate local input feedback (selection, clicks, orders) — with no gameplay extrapolation.
- Client prediction / command buffering is deferred to M2+ and adopted only if measurement justifies it (input-to-visible-movement targets in `docs/master-plan.md` §21.4 fail with replication alone).
- Prediction must never break server authority or replay integrity: the canonical command stream remains the only source of truth.

## Alternatives

- **Prediction from day one**: rejected — highest-risk networking work before it is proven necessary, and it complicates fog and replay.
- **No feedback until the authoritative tick**: rejected — unacceptable input latency; violates the responsiveness goal.

## Consequences

- **Positive**: low-risk M1; authority and replay stay clean; snappiness comes from interpolation + instant input feedback.
- **Negative**: a later, measured decision is required at M2+; the replication path must keep the buffer/resync machinery needed to support prediction later.

## Evidence

- `docs/master-plan.md` §18.5 (replication), §20.3 (interpolation, "do not extrapolate gameplay"), §21.4 (input and movement latency targets).