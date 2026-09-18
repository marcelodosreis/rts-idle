# Manual Smoke Test

How to verify what is implemented, yourself, in the browser — and what is
expected at each step. Keep this updated every time something new lands.

## Setup

```bash
# One command: starts the authoritative server (:8080) and the Vite app (:5173)
# in parallel. Logs are prefixed [@rts/server] / [@rts/web]; Ctrl+C stops both.
pnpm dev

# Alternatively, in two separate terminals:
#   pnpm --filter @rts/server dev   (auto-restarts via `tsx watch`)
#   pnpm --filter @rts/web dev      (Vite hot-reloads)
```

Open `http://localhost:5173`. The top bar shows
`status: connected · tick N · scenario · units · selected`.

> If behavior looks stale after a code change: the server's `tsx watch` should
> have restarted — but a browser tab does not auto-reconnect yet (Phase 6). Do
> a hard refresh (`Ctrl+Shift+R`) after the server restarts.

## Implemented and expected behavior

The demo is a **hostile scenario**: each faction spawns in its own corner and
marches toward the enemy, then fights in place where they meet.

| # | Action | Expected result |
|---|---|---|
| 1 | Wait ~2s | `status: connected`; the blue (left) and red (right) squads **march** toward each other and start fighting. Overhead **HP bars** appear as units take damage. |
| 2 | Left-click a unit | Unit gets a **yellow ring**; `selected: 1`; the selection panel shows its details. |
| 3 | Left-drag over several units | Units in the box get rings; `selected: N`. |
| 4 | Right-click on the map (ground) | A **white ping** flashes; the selected unit(s) **move** to the target in a formation. |
| 5 | Right-click on an **enemy** unit | The selected units issue **ATTACK** and chase/fire at that target. |
| 6 | Bottom bar **Stop** / **Hold** | Cancels orders / parks the selection with a defensive stance. |
| 7 | Bottom bar **Attack** then right-click an enemy | Arms the attack order: the next enemy right-click issues ATTACK. |
| 8 | Bottom bar **Attack-move** / **Patrol** then right-click ground | The selection moves attacking en route / patrols back and forth. |
| 9 | Bottom bar **Surrender** | The match ends with a **Defeat** overlay and a "New match" button. |
| 10 | Wait for the match to end (or Surrender) | Overlay shows **Victory / Defeat / Draw**; "New match" reloads a fresh session. |
| 11 | Top bar **scenario** selector | Reloads into a different scenario (`2v2`, `4v4`, Melee vs ranged, Free for all, Overwhelming force, Against the odds). |
| 12 | Middle-drag / wheel | Camera pans / zooms (0.05×–4×). |

### Console diagnostics (F12)

```js
window.__rtsDebug.getTick()          // grows ~20/s → snapshots are flowing
window.__rtsDebug.getPositions()     // current unit coords, e.g. { "1": {x, y}, ... }
window.__rtsDebug.getUnitOwners()    // id -> player slot
window.__rtsDebug.getUnitHealth(id)  // { current, max } → drives the HP bar
window.__rtsDebug.getSelection()     // selected unit ids
window.__rtsDebug.getZoom()          // current camera zoom
```

## Not implemented yet (do not expect)

- Economy (gathering, production, buildings) — Phase 2.
- Fog, pathfinding, projectiles — Phase 3.
- Groups, hotkeys, minimap, full match flow — Phase 8.
- Replay/CLI tooling — Phase 7.

## If something from the table fails

That is a bug → report it. Per the Bug Response Protocol, it gets a postmortem
and a permanent regression test before it is closed.

## Automated verification

```bash
pnpm run verify                    # typecheck + lint + all vitest suites + build
pnpm exec playwright test         # browser e2e (selection, move, combat, results, scenarios)
```