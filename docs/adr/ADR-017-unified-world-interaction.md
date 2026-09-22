# ADR-017: Unified World Interaction

## Status

Accepted

## Context

World input was distributed across Pixi viewport handlers, unit sprites, DOM `contextmenu`, the match session, and separate editor canvases. Modifier keys such as `Ctrl` and `Cmd` were interpreted in multiple locations. This made Mac trackpad support, pointer cancellation, browser zoom suppression, and future touch or keyboard support difficult to evolve safely.

## Decision

Renderer input is normalized into typed, gameplay-independent `WorldInteraction` events. The renderer owns browser events, screen/world coordinate conversion, hit testing, camera gestures, pointer capture, and gesture cancellation. The web match layer owns selection state, command modes, target validation, and `CommandIntent` creation.

The renderer uses one target precedence policy: mineral, unit, building, ground. The visual renderer does not authorize gameplay commands.

Camera controls are shared through a renderer camera controller. Mouse and Trackpad are explicit web preferences because browsers do not reliably distinguish a physical mouse wheel from a two-finger trackpad `wheel` event.

## Consequences

- Simulation and server boundaries remain unchanged.
- Camera input can be reused by the game and renderer tools.
- Gameplay commands have one web owner.
- Input profiles can evolve without device sniffing.
- Browser page zoom is prevented only while the canvas consumes the gesture.
- Touch, edge scrolling, hotkeys, and gamepad support can be added behind the same contracts.

## Non-goals

- No client prediction.
- No input state in snapshots or replays.
- No automatic hardware detection.
- No mobile gameplay contract in this decision.
