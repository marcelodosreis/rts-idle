# Input Controls

The game has two explicit input profiles. The profile is a presentation preference and is never sent to the server or included in simulation state.

## Mouse Profile

| Input | Action |
|---|---|
| Primary click | Select a unit or inspect a world object |
| Primary drag | Box-select units |
| Right-click | Issue a contextual command |
| Middle-button drag | Pan the camera |
| Mouse wheel | Zoom the camera |
| Escape | Cancel a pending interaction |

## Trackpad Profile

| Input | Action |
|---|---|
| Primary click | Select a unit or inspect a world object |
| Primary drag | Box-select units |
| Secondary click | Issue a contextual command |
| Control-click | Secondary-click compatibility path on macOS |
| Two-finger scroll | Pan the camera |
| Pinch | Zoom the camera |
| Escape | Cancel a pending interaction |

The browser does not reliably identify whether a pixel-based `wheel` event came from a physical mouse wheel or a two-finger trackpad scroll. The explicit profile avoids device detection heuristics and keeps the behavior predictable.

## Target Priority

When several rendered objects overlap, input resolves the target in this order:

1. Mineral node.
2. Unit.
3. Building.
4. Ground.

The renderer only reports the target. The web match controller decides whether that target means selection, movement, attack, gathering, deposit, or construction.

## Browser Boundaries

While the pointer is over the game canvas, camera-owned wheel and pinch gestures are consumed by the canvas. They must not zoom the document. Browser scrolling and browser zoom remain available outside the canvas.

## Interaction Safety

Selection, camera movement, and target commands are separate interactions. A camera gesture cannot start a box selection, and a box selection cannot issue a command. Pointer cancellation, focus loss, match completion, and renderer disposal cancel transient input state.
