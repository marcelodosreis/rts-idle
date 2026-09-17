# Proposal: Visual/feedback layer

Status: Approved (user decision 2026-09-17)

Source of truth for the presentation layer contracts. Mirrors master plan §23.2
and ADR-015. Supersedes the doodle packaging direction (ADR-005).

## Goal

The demo must be playable and readable *while* the simulation core advances:
animated units over a real tileset, no teleport (interpolation), and readable
combat feedback (streaks/arrows, impact flash, damage popups, death FX, HP
bars) fed by deterministic simulation events.

## Frozen contracts

### Scale and coordinates
- `1 tile = 64 render px`; `FIXED_TO_PIXEL = 64 / 256 = 1/4`.
- All renderer conversion (units, selection, ping, worldToScreen, terrain)
  goes through this factor. The world is 192×192 tiles (master plan §14.3).

### Frame geometry (asset manifest)
- Frame cell is the square of the strip height (units 192 px, Lancer 320,
  trees 256, resources 128, water foam 192); frame count = `width / height`,
  validated by `tools/assets/build-manifest.ts`.
- Per-asset: `{ key, file, cellW, cellH, frames, duration, anchor, flip }`.

### Animation timing
- Wall-clock in the renderer (presentation only). **Never** tick-synced, never
  part of the canonical stream. Default frame rate: **10 fps (100 ms per
  frame)**, overridable per asset.

### Faction colors
- `PlayerId 0→Blue, 1→Red, 2→Purple, 3→Yellow`; Black reserved (neutral/fallback).
- Real per-faction art (pack ships 5 palettes); no tinting.

### Sprite → simulation mapping (baseline)
- Pawn = Worker, Warrior = Soldier/melee, Archer = Ranger.
- Lancer / Monk = future content (directional / heal).
- Buildings: Castle = Base, Barracks = Barracks, Tower = Defense,
  Archery/Monastery/House1-3 = Phase 2 expansion.

### Simulation events (deterministic, replay-safe)
- Types: `attackFired { attackerId, targetId, x, y }`,
  `damageDealt { targetId, amount, x, y }`,
  `unitDied { id, x, y }`; `gatherTick` arrives with Phase 2.
- Emitted per tick at step 19, derived from state (never persisted in the
  canonical snapshot → replay reproduces them automatically).
- Carried to the client as `events[]` inside the snapshot message.
- Fog filtering is Phase 3 (demo is one session per client; no hiding).

### Renderer consumes presentation data only
- The renderer never computes gameplay. Effects are ephemeral and disposed.
- Asset failure → placeholder fallback (keeps CI/tests green without art).

### Death feedback
- The pack has no unit death animation: death = Explosion FX + fade/shrink +
  removal (documented in `docs/assets/capabilities.md`).

## License gate (golden rule)

- The pack (Tiny Swords) is used publicly only if its license permits public
  use. Until validated: `tmp/` and `apps/web/public/assets/` are gitignored and
  no asset is committed, shipped, or released.
- If rejected: the data-driven pipeline swaps to any licensed pack; fallbacks
  keep development green.

## Open (license-conditional) decisions

- Exact pack license terms and attribution requirements (record in
  `apps/web/public/assets/LICENSES.md` after validation).
- Tile theme selection per map/faction from the 5 tileset color variants.
- Whether to ship the full curated set now or a reduced bundle.
- Damage-popup and HP-bar final styling (readability contract: colors, size,
  thresholds) — defaults are set in the implementation.

## Deliverables

- Asset inventory + integration/polish roadmap: `docs/assets/capabilities.md`.
- Task checklists: `tasks/todo.md` (Sprints A–G).
- ADR: `docs/adr/ADR-015-visual-identity.md`.