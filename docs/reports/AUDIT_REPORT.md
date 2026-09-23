# Project Audit Report

## Executive Summary

RTS Idle is a browser-first, server-authoritative RTS foundation with a
deterministic simulation core and strong automated coverage. The engine is
well structured, but gameplay scope remains limited: economy, construction,
production, AI, pathfinding, and multiplayer are still incomplete or early
stage.

The project follows the design principle "Build small. Engineer large." The
current implementation is a solid technical foundation rather than a complete
MVP.

## Current Architecture

- Monorepo with packages, apps, tests, and development tools.
- Deterministic ECS simulation with fixed-point coordinates and seeded RNG.
- Server-authoritative WebSocket sessions.
- PixiJS renderer with terrain, animated units, combat feedback, and HUD.
- React web application with match and Laboratory routes.
- Architecture barriers for package dependencies and simulation isolation.
- Unit, integration, simulation, contract, order, invariant, determinism, and
  browser test suites.

## Implemented Capabilities

- MOVE, STOP, HOLD, PATROL, ATTACK, ATTACK_MOVE, GATHER, DEPOSIT, and
  SURRENDER commands.
- Deterministic snapshots, hashes, export, restore, and replay validation.
- Combat with simultaneous death, victory, draw, and tick-limit outcomes.
- Unit selection, box selection, command bar, match overlay, and camera input.
- Economy v0: workers gather minerals, carry cargo, and deposit at owned Bases.
- Base, Barracks, and Supply Depot construction with pause, reassignment, and
  completion feedback.
- Supply capacity accounting and Supply HUD.
- Laboratory browser, editor, stress, report, determinism, and performance
  tools.

## Known Limitations

- No production queue or unit training.
- No real AI; enemies use scripted scenarios.
- No grid pathfinding; units use straight-line movement.
- No collision avoidance or fog of war.
- No minimap, audio, or multiplayer rooms.
- Asset catalogs and curated art are optional in CI; fallback rendering is used
  when real assets are unavailable.

## Quality Status

- TypeScript, lint, build, architecture, and deterministic checks are part of
  the completion gate.
- Playwright coverage runs in Chromium and Firefox.
- Tests use fixed fixtures and deterministic seeds.
- Browser tests support fallback mode without curated asset files.
- CI uses isolated jobs, build artifacts, dependency caching, and controlled
  Playwright workers.

## Priority Recommendations

1. Complete the economy and production loop.
2. Add a minimal playable AI opponent.
3. Implement pathfinding and collision handling.
4. Expand faction, unit, and building content.
5. Add production and resource-management UI.
6. Defer multiplayer, replay expansion, and advanced research until the core
   gameplay loop is complete.

## Conclusion

The deterministic core, renderer, server boundary, and testing infrastructure
are in good shape. The next major milestone should prioritize playable
gameplay breadth over additional infrastructure.
