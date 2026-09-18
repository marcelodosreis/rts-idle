# ADR-005 — Doodle as packaging; the product is responsiveness and readable combat

Status: **Superseded** (by ADR-015, user decision 2026-09-17)

## Context

Competing visually with big-budget RTS is unwinnable. The project must define its own identity and spend its engineering budget where it creates real value.

## Decision

- The aesthetic is simple doodle/sketch: cheap assets, fast iteration, low GPU requirements, browser-first.
- The product is the feeling of controlling an extremely responsive competitive RTS. Core philosophy: **"an extremely responsive competitive RTS with simple aesthetics — and a simulation engine engineered far above the size of the game."**
- Engineering budget prioritizes: instant input feedback, authoritative movement, interpolation, readable combat (clear targeting, damage, deaths, fog), and scouting that matters.
- Presentation is part of responsiveness: selection, health bars, fog, and projectile readability are UX, not decoration.

## Alternatives

- **Chasing AAA visuals**: rejected — an unwinnable war with a fraction of the budget.
- **Minimal presentation**: rejected — for an RTS, legibility *is* the feel.

## Superseded by ADR-015

The doodle identity is no longer the direction (user decision 2026-09-17). The
visual layer uses a real RTS sprite/tileset pack, license-gated and
data-driven. The identity-neutral goals below (legibility, factions, cheap
rendering) remain valid.

## Consequences

- **Positive**: own identity; assets iterate fast; low GPU requirement enables browser and potentially mobile; the "feel" gap becomes the moat.
- **Negative**: visual polish still requires disciplined presentation work; accessibility and readability must be treated as first-class.

## Evidence

- `README.md` core philosophy statement.
- `docs/master-plan.md` §20 (presentation, doodle, accessibility) and §21 (renderer spikes).