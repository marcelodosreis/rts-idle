# ADR-015: Visual identity — real RTS sprite pack

Status: Accepted

Date: 2026-09-17

## Context

Testing the demo made the feel gap explicit: placeholder circles, instant
teleport MOVE, and no combat feedback made it impossible to judge whether
input landed. The conclusion was that the visual/feedback layer must advance
**together with** the systems, not only at Phase 8/9. Placeholder art cannot
carry that — real sprites and a tileset are required.

ADR-005 (doodle as packaging) is **superseded by user decision** (2026-09-17):
the visual identity is now a real RTS sprite/tileset pack.

## Decision

- Adopt a real RTS sprite/tileset pack (candidate: **Tiny Swords** by Kay
  Lousberg / Pixel Frog) for units, buildings, terrain, FX, and UI.
- **License gate (golden rule):** the pack is used publicly only if its license
  permits public use. Until the license is validated, no asset is committed,
  shipped, or released (`.gitignore`: `tmp/`, `apps/web/public/assets/`).
  If the license is not permissive, the pack is rejected and the pipeline keeps
  working with a fallback (placeholders / any licensed pack) because everything
  is data-driven.
- The visual layer is **presentation-only**: the simulation stays portable,
  deterministic, single-writer. The renderer consumes per-tick simulation
  events (`attackFired`, `damageDealt`, `unitDied`, later `gatherTick`)
  filtered by allowed observation, and renders ephemeral effects.
- The visual catalog is **data-driven in game-data** (ADR-004): each
  unit/building → `spriteId`, animation frames, durations, scale, anchor,
  faction color. Swapping the art pack is a data change; the simulation does
  not change.
- Frozen conventions: `1 tile = 64 render px`; frame cell = square of strip
  height; animation timing is wall-clock (presentation only); faction colors
  map `PlayerId 0→Blue, 1→Red, 2→Purple, 3→Yellow` (Black reserved).
  See `docs/proposals/visual-feedback-layer.md` and master plan §23.2.

## Alternatives

- Continue with procedural placeholders — rejected: cannot validate feel.
- Keep doodle identity — superseded by user decision (ADR-005).
- Tint one palette over neutral sprites — rejected: the pack ships per-faction
  art; real art reads better than tint.

## Consequences

- **Positive:** readable, animated demo that exercises the feel loop early;
  data-driven pipeline makes art replaceable; determinism untouched.
- **Negative:** assets are external and license-gated; repo gains a curated
  asset tree and tooling (`tools/assets/`); CI visual e2e needs assets locally
  (tests are fallback-tolerant so CI stays green without art).

## Evidence

- Asset inventory and integration possibilities: `docs/assets/capabilities.md`.
- Contracts: `docs/proposals/visual-feedback-layer.md`, master plan §23.2.
- Supersedes: ADR-005.