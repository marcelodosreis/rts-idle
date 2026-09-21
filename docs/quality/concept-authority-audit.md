# Concept Authority Audit

## Scope

This inventory records equivalent domain concepts that currently have more than
one rule authority. It covers the simulation, shared, game-data, protocol,
renderer, server, web, and tools source trees. Items remain separate follow-up
tasks so that behavior, protocol, and serialization changes are not coupled.

| Priority | Concept | Status | Evidence |
| --- | --- | --- | --- |
| Critical | Building placement | resolved | AUTH-006, `4ebd7af`; integration, simulation, and focused browser PASS. |
| Critical | Match map | resolved | AUTH-005/006, `da0920d`, `4ebd7af`; contracts, integration, and focused browser PASS. |
| High | Rendered footprint | resolved | AUTH-009, `caf811f`; unit projection tests PASS. |
| High | Command admissibility | resolved | AUTH-010, `6903899`; simulation/orders/determinism PASS. |
| High | Building catalog | resolved | AUTH-008, `4ebd7af`; typecheck, architecture, and focused browser PASS. |
| High | Legacy compatibility | resolved | AUTH-017, `883f71a`; contracts, simulation, and architecture PASS. |
| High | Projected types | resolved | AUTH-009, `caf811f`; unit projection tests PASS. |
| High | Architecture matrix | resolved | AUTH-007, `4ebd7af`; architecture PASS. |
| Medium | Movement destination | resolved | AUTH-011, `6903899`; simulation/orders/determinism PASS. |
| Medium | Queue manipulation | resolved | AUTH-012, `6903899`; simulation/orders/determinism PASS. |
| Medium | Nearest selection | resolved | AUTH-013, `883f71a`; simulation/determinism PASS. |
| Medium | Valid base/construction | resolved | AUTH-013, `883f71a`; simulation PASS. |
| Medium | Player slots | resolved | AUTH-013, `883f71a`; shared `PLAYER_IDS` remains the existing authority; typecheck PASS. |
| Medium | Demo scenarios | resolved | AUTH-008, `4ebd7af`; focused scenarios browser tests PASS. |
| Medium | Bars and health | resolved | AUTH-015, `caf811f`; unit tests PASS. |
| Medium | Animation timing | resolved | AUTH-015, `caf811f`; unit tests PASS. |
| Medium | Coordinates | resolved | AUTH-014, `caf811f`; unit tests PASS. |
| Medium | Runtime guards | resolved | AUTH-005, `da0920d`; contracts PASS. |
| Low | Metrics | intentionally local | AUTH-016; create a shared diagnostics/metrics contract only when three independent consumers require the same statistical contract. Documentation review and lint PASS. |

## Deliberate non-centralization

Boundary security guards remain mandatory even where domain values are shared.
Pixi CSS and colors remain presentation-specific representations, and small
local helpers such as `isRecord` remain local when no domain authority exists.
