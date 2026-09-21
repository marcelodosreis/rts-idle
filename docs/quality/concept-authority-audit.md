# Concept Authority Audit

## Scope

This inventory records equivalent domain concepts that currently have more than
one rule authority. It covers the simulation, shared, game-data, protocol,
renderer, server, web, and tools source trees. Items remain separate follow-up
tasks so that behavior, protocol, and serialization changes are not coupled.

| Priority | Concept | Observed divergence | Recommended authority |
| --- | --- | --- | --- |
| Critical | Building placement | Web reimplements bounds, terrain, and overlap; simulation uses another validator; the server does not receive invalid map tiles. | Pure policy in game-data, consumed by web and simulation; server remains authoritative. |
| Critical | Match map | Web uses `MapDefinition`; simulation relies on coincident 32×32 default bounds, including local playtest. | Session receives the same validated map and bounds used by the client. |
| High | Rendered footprint | Snapshot carries the authoritative footprint, but renderer again queries `BUILDING_DEFINITIONS` for drawing and hit testing. | Snapshot after creation; catalog only before BUILD. |
| High | Command admissibility | BUILD and SURRENDER validate phase and active player; other commands do not share the policy. | Common simulation guard before dispatch. |
| High | Building catalog | Types, guards, tags, labels, costs, and `build_base`/`build_barracks` mappings occur in multiple modules. | Canonical tuples in shared; data in game-data; one codec in simulation. |
| High | Legacy compatibility | Legacy MOVE and `command` envelope; Building and Base/Barracks/Construction aliases; old server/renderer projections. | Versioned removal plan after callers and tests migrate. |
| High | Projected types | `SnapshotBuilding`, `RenderBuilding`, and `HudConstruction` repeat nearly the same contract. | Protocol owns the projection; renderer reuses types; HUD adds only derived fields. |
| High | Architecture matrix | Engineering standard forbids web → game-data, but tests, manifest, and code allow it. | Resolve the decision and synchronize standard, barrier, and manifests. |
| Medium | Movement destination | The same `Movement` is assembled in eight places. | Internal `setMovementDestination` and `clearMovement` helpers. |
| Medium | Queue manipulation | Removing or replacing the first order is reimplemented in economy, construction, combat, and death. | Internal queue helpers that preserve order and semantics. |
| Medium | Nearest selection | Construction, base, and combat use loops with separate tie-breaks. | Deterministic comparator: distance, then EntityId or declared order. |
| Medium | Valid base/construction | BASE, COMPLETED, and legacy rules repeat in economy system. | Central domain predicates. |
| Medium | Player slots | `0..3`, lists, casts, validation, and palettes repeat. | `PLAYER_IDS` in shared with derived `PlayerId`. |
| Medium | Demo scenarios | Server offers `2v2` and `mixed`, while web maintains an independent list that omits them. | Server-provided catalog or shared contract. |
| Medium | Bars and health | Economy ratios and HP thresholds are recalculated in renderer and HUD. | Classification and ratios in renderer; each UI keeps only concrete colors. |
| Medium | Animation timing | Duration-to-FPS conversion appears in renderer, lab player, and stress view. | One visual-timing helper. |
| Medium | Coordinates | Fixed scale, tile size, row-major indexing, and `"x,y"` keys are manually repeated. | Existing fixed/tile helpers plus cohesive domain helpers. |
| Medium | Runtime guards | TypeScript unions and runtime lists of unit kinds, building types, statuses, and commands can diverge. | Canonical tuples and `satisfies Record<...>` maps for exhaustiveness. |
| Low | Metrics | Percentile and average appear in benchmark and web harness. | Keep separate until a diagnostics package is warranted. |

## Deliberate non-centralization

Boundary security guards remain mandatory even where domain values are shared.
Pixi CSS and colors remain presentation-specific representations, and small
local helpers such as `isRecord` remain local when no domain authority exists.
