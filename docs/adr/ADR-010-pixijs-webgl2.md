# ADR-010: PixiJS + pixi-viewport, WebGL2 baseline

Status: Accepted

Date: 2026-09-16

## Context

The browser needs a 2D renderer with a game loop, camera, and input for the RTS
world. Phaser was the original candidate; the user requested a more modern
alternative. The presentation layer must stay decoupled from the simulation
(the simulation never imports the renderer).

## Decision

Use **PixiJS v8** for rendering with **pixi-viewport v6** for the camera, and
**WebGL2 as the baseline backend**. React handles menus/HUD but never the game
world.

Rationale: PixiJS is a rendering library (not a game engine), so it fits the
project's "simulation owns gameplay, renderer only observes" rule. It provides
the `Application`/`Ticker` loop, sprites, GPU rendering, and pointer events;
pixi-viewport adds pan/zoom/clamp. WebGPU remains an experiment behind a flag
until browser support and performance justify promoting it.

## Alternatives

- Phaser 4 — rejected per user request (preferred a more modern, library-style
  approach); it also imposes more framework opinion on top of a simulation we
  must own.
- Excalibur.js — viable full engine, but its ECS/actor model would duplicate the
  simulation's own determinism requirements.

## Consequences

- The PixiJS ticker drives presentation only; the simulation clock stays
  independent (fixed timestep, see ADR-009).
- Input (selection, right-click orders, camera) lives in the renderer/web
  client; gameplay decisions never run there.
- `pixi-viewport` is a peer dependency matched to pixi v8 (`>=8`); locked
  versions are `pixi.js@8.20.1`, `pixi-viewport@6.0.3`.

## Evidence

Renderer perf harness (headless Chromium/SwiftShader, not a real-GPU gate):
frame avg ~17–26 ms at 1,000–5,000 presented units. Camera, selection rings,
command ping, and MOVE round-trips verified by E2E (8 passing specs).