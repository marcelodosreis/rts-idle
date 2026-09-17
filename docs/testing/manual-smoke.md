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

Open `http://localhost:5173`. The status line shows
`status: connected · units: 8 · selected: N`.

> If behavior looks stale after a code change (units stacking, old rules):
> the server's `tsx watch` should have restarted — but a browser tab does not
> auto-reconnect yet (Phase 6). Do a hard refresh (`Ctrl+Shift+R`) after the
> server restarts. If it still looks stale, restart both dev servers.

## Implemented and expected behavior

| # | Action | Expected result |
|---|---|---|
| 1 | Wait ~1s | `status: connected`; **4 green** units visible (player 0 base). Status shows `units: 8` (4 red are across the map). |
| 2 | Left-click a green unit | Unit gets a **yellow ring**; status shows `selected: 1`. |
| 3 | Left-drag over several units | Units in the box get rings; `selected: N`. |
| 4 | Right-click on the map | A **white ping** flashes; the selected unit(s) **teleport** to the target (movement is instant — no animation yet). With several units selected, they arrive **spread around** the target in a formation. |
| 5 | Right-click repeatedly | Ping appears each time; units re-target. |
| 6 | Middle-drag / wheel | Camera pans / zooms (0.05×–4×). |
| 7 | Zoom out and pan right | The 4 **red** units (player 1) near `x≈46080`. |

### Console diagnostics (F12)

```js
window.__rtsDebug.getTick()        // grows ~20/s → snapshots are flowing
window.__rtsDebug.getPositions()   // current unit coords, e.g. { "1": {x, y}, ... }
window.__rtsDebug.getSelection()   // selected unit ids
window.__rtsDebug.getZoom()        // current camera zoom
```

Run `getPositions()` before and after a right-click: the moved unit's
coordinates must change.

## Not implemented yet (do not expect)

- Movement animation — MOVE is an instant teleport (Phase 1/3).
- Combat, gathering, building, production, fog, minimap, red units controllable.
- `pnpm run replay/simulate/fuzz/balance/benchmark` (stubs).

## If something from the table fails

That is a bug → report it. Per the Bug Response Protocol, it gets a postmortem
and a permanent regression test before it is closed.

## Automated verification

```bash
pnpm run build                # required before E2E (Node reference for determinism-browser)
pnpm run test:unit            # primitives, ECS, formation
pnpm run test:integration     # MOVE, authoritative session, formation destinations
pnpm run test:simulation      # tick, snapshot/restore
pnpm run test:determinism     # replay determinism
pnpm run test:architecture    # simulation isolation
pnpm run test:e2e             # browser: render, select, move, determinism, regressions, perf
pnpm run typecheck && pnpm run lint
```

Performance / tick-rate evidence:

```bash
pnpm run benchmark            # simulation step cost, percentiles, CPU@20/30/60, hash, memory
```