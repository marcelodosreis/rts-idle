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

## Regression scenario (the main playable flow)

Open `http://localhost:5173/?scenario=regression&aggression=passive&sprites=off`.

`regression` is the sole automated gameplay fixture. Every player-facing
gameplay E2E, including navigation and collision, starts from this scenario;
the other demo scenarios remain available for manual exploration only. Unit,
integration, simulation, and determinism tests use deterministic fixtures and
do not load browser demo scenarios.

In this scenario the player owns four pawns, a Castle (250/500 HP), a House, a
Warrior/Archer/Monk/Lancer squad, and 600 gold. The enemy squad is stationary
unless `aggression=offensive`.

| # | Action | Expected result |
|---|---|---|
| 1 | Wait ~2s | `status: connected`; units and buildings render; the top bar shows live Gold/Wood and `used / cap` supply. |
| 2 | Left-click a pawn | Yellow selection ring; the selection panel shows the unit, its HP, and its capabilities. |
| 3 | Left-drag over several pawns | A selection box selects every unit inside; `selected: N`. |
| 4 | Right-click a tree (lower-left) | The pawn travels over and cuts; Wood rises after depositing at the Castle. |
| 5 | Right-click the gold mine | The pawn gathers Gold with pickaxe/cargo progress; Gold rises after depositing. |
| 6 | Right-click an owned Castle with cargo | The pawn returns and deposits the carried resource. |
| 7 | Click **Build** → **House** / **Barracks** / **Monastery** | A placement preview follows the cursor; invalid tiles show why placement is rejected. |
| 8 | Left-click a valid tile with a pawn selected | A foundation appears; the assigned pawn walks there and builds through progress feedback. |
| 9 | Click a foundation → **Pause** / assign another pawn | Construction pauses when its builder leaves and resumes with the new builder. |
| 10 | Click a foundation → **Cancel** | The construction is removed with the authoritative partial refund. |
| 11 | Click the completed Castle → **Train** | Pawn enters the queue; resources and supply are reserved immediately and the queue count updates. |
| 12 | Fill the queue with 5 pawns, block the exit, wait | The active item turns `Waiting for exit`; the queue stays 5/5 with reservations and the Train button stays blocked. |
| 13 | Move the blocking pawn away | The waiting item spawns, the queue advances in order, and reserved supply becomes used supply. |
| 14 | Click a completed Barracks → **Train** | Warrior/Archer become available; their costs are deducted and they spawn at the deterministic exit. |
| 15 | Click a completed producer → **Set rally** then right-click ground | A rally marker appears; newly trained units walk to the latest authoritative point. |
| 16 | Click a completed Monastery → research a Tier II topic | Research enters the shared queue and applies its modifier when it completes. |
| 17 | Select a Monk, right-click a damaged friendly unit | The Monk heals it; the heal effect plays and the cooldown is visible. |
| 18 | Select a damaged mechanical unit or building, click **Repair** | A pawn repairs it every 10 ticks for 5 HP and 1 gold with progress feedback. |
| 19 | Bottom bar **Stop** / **Hold** / **Patrol** / **Attack-move** | Orders behave as documented in `docs/commands.md`; the HUD shows the order state. |
| 20 | Click **Cancel** on a queued production row | Two-step confirmation; the row is refunded per its queue state. |
| 21 | Bottom bar **Surrender**, or destroy the enemy | The match ends with the **Victory / Defeat / Draw** overlay and a "New match" button. |
| 22 | Top bar **scenario** selector | Reloads into another scenario (`Default`, `8v8`, `Monk Heal`, `Free for all`, `Regression`). |
| 23 | Middle-drag / wheel | Camera pans / zooms within the configured limits. |
| 24 | Top bar **Sprites** switch | Turning it off reloads the match with fallback circles/markers; commands and simulation remain active. |

### Navigation and collision

Select one of the owned pawns near the lower side of the map and right-click
open ground beyond the owned House at approximately tile `(16, 10)`. The unit
must route around the building through the real server without crossing its
footprint, teleporting, or overlapping another unit. If the destination is
unreachable or movement remains blocked, the match HUD displays the blocked or
unreachable feedback.

### Other scenarios

- `?scenario=default` — hostile demo: both squads march and fight automatically.
- `?scenario=8v8` — large scripted battle.
- `?scenario=monk-heal` — two Monks and two damaged Warriors for heal checks.
- `?scenario=ffa` — four players orbit-attack clockwise.

### Console diagnostics (F12)

```js
window.__rtsDebug.getTick()               // grows ~20/s → snapshots are flowing
window.__rtsDebug.getPositions()          // current unit coords
window.__rtsDebug.getUnitOwners()         // id -> player slot
window.__rtsDebug.getUnitKinds()          // id -> unit kind
window.__rtsDebug.getUnitHealth(id)       // { current, max }
window.__rtsDebug.getSelection()          // selected unit ids
window.__rtsDebug.getConstructionStates() // buildings, queue, progress, rally
window.__rtsDebug.getResources()          // authoritative resource amounts
window.__rtsDebug.getZoom()               // current camera zoom
```

## CLI tooling

```bash
pnpm replay      # replay a recorded command stream
pnpm balance     # balance report
pnpm benchmark   # simulation/render benchmarks
```

## Not implemented yet (do not expect)

- Fog of war, minimap, hotkeys/control groups, and audio.
- Multiplayer rooms and reconnection UX across tab reloads (Phase 6).
- AI opponents — all enemies are pre-scripted.

## If something from the table fails

That is a bug → report it. Per the Bug Response Protocol, it gets a postmortem
and a permanent regression test before it is closed.

## Automated verification

```bash
pnpm run verify                    # typecheck + lint + all vitest suites + build
pnpm run fuzz                      # malformed and accepted command-stream properties
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts  # browser e2e target
```

Test runners use compact dot reporters by default to keep local output useful
for humans and LLM tooling. Passing tests produce a short progress summary;
failed tests still print their assertion details and stack traces. The compact
reporter reduces output volume, not test execution time.

The complete browser gate uses the generated CI matrix. It runs functional and
performance groups independently for both Chromium and Firefox; use the serial
command only as a local fallback:

```bash
pnpm run test:e2e:prepare -- --output=tmp/e2e-plan.json
# Execute every generated group with E2E_WORKERS=1 on an isolated runner.
```

Plan generation fails closed: discovery parses structured Playwright JSON and
every required category/browser must have all of its discovered test cases
assigned exactly once before the matrix is published.
