# Asset Capabilities — Tiny Swords pack

> Living inventory of the visual assets and every way they can be integrated,
> improved, or polished. Source pack: **Tiny Swords** by Kay Lousberg / Pixel
> Frog (vendor copy: `tmp/tiny_swords`). **License pending validation** — no
> asset is committed or shipped until the license permits public use (golden
> rule, ADR-015). The curated subset lives in `apps/web/public/assets/`
> (`pnpm assets:prepare`, `tools/assets/`).

Pack shape: 410 PNGs + 17 `.aseprite` (frame-authoritative sources), 5 unit
types × 5 palettes, 8 buildings × 5 palettes, terrain tilesets + decorations +
resources, particle FX, and a UI kit. Frame rule: frame cell = square of the
strip height; frame count = `width / height`.

---

## 1. Units

| Unit | Animations available | Sim mapping (baseline) | Notes |
|---|---|---|---|
| **Pawn** | Idle, Run, Interact (Axe/Gold/Hammer/Knife/Meat/Pickaxe/Wood variants), plain Idle/Run | **Worker** | Tool variants map to worker states: gather gold/wood/meat, build (hammer), repair (pickaxe). No attack pose — use Interact for a melee swing |
| **Warrior** | Idle, Run, Attack1, Attack2, Guard | **Soldier / melee** | Two attack variants for variety; Guard = HOLD stance |
| **Archer** | Idle, Run, Shoot; separate **Arrow** projectile sprite | **Ranger / ranged** | Arrow is a single 64×64 sprite — projectile feedback |
| **Lancer** | Idle, Run, Attack + Defence in **4 directions** (Up/Down/Right/UpRight/DownRight) | Future content | Directional sheets → 8-way facing support (needs camera-relative orientation) |
| **Monk** | Idle, Run, Heal, Heal_Effect | Future support unit | Heal cast + a heal beam/aura FX |

**Improvement / polish possibilities**
- Facing: flip sprites on move direction (default `flipOnMoveX`); Lancer adds full 8-way.
- Tool swap on the Pawn driven by `orderState`/economy action.
- Guard → HOLD visual, Heal → support cast visual.
- Footstep dust (Dust FX) emitted from the Run animation.
- No death animation in the pack → death = Explosion FX + fade/shrink (decided).

## 2. Buildings

| Building | Animations | Sim mapping |
|---|---|---|
| Castle | static | **Base** |
| Barracks | static | **Barracks** |
| Tower | static | **Defense** |
| Archery, Monastery, House1–3 | static | Phase 2 expansion (research/production/farms) |

**Improvement / polish possibilities**
- Construction phases: overlay progress ring / scaffolding tint on the foundation.
- Destruction/under-attack: Fire FX + smoke tint on damaged buildings.
- Rally flag / production-ready glow above producers.

## 3. Terrain

| Asset | Notes |
|---|---|
| **Tilemap_color1..5** | 9×6 grid of 64 px tiles, 5 palettes → per-faction map themes or zone tinting |
| **Water Foam** (animated) | 16-frame loop → animated water edges |
| **Water Background color** | flat water fill tile |
| **Shadow** | soft blob → unit shadow decal |
| Decorations | Bushes (4 anim), Clouds (8 anim), Rocks (4 static), Water Rocks (4 anim), Rubber Duck (anim) |
| Resources | Gold (stones + animated highlight), Wood (trees + stumps, animated), Meat (resource + Sheep Idle/Move/Grass), Tools (4) |

**Improvement / polish possibilities**
- Procedural map dressing: scatter rocks/bushes/trees/clouds deterministically by seed.
- Shadow decal under every unit/building (cheap, big readability win).
- Water foam edges where land meets water; animated.
- Gold/tree/meat resources use their animated sprites when being gathered.

## 4. Particle FX

| FX | Use |
|---|---|
| Explosion_01 / Explosion_02 | **Death** of units/buildings (no death frames in the pack) |
| Fire_01..03 | Burning / under-attack / campfire |
| Dust_01..02 | Footsteps, construction, movement |
| Water Splash | Water interaction, projectile landing in water |

**Improvement / polish possibilities**
- Muzzle flash from Fire at attack time; Dust on Run; Explosion on death; splash for AoE (Phase 3).

## 5. UI kit

| Asset | Use |
|---|---|
| Bars (Big/Small Bar Base+Fill) | HP bars, resource bars |
| Buttons (16: Blue/Red × big/small × round/square × regular/pressed) | Command panel, menus |
| Icons (12) | Command/unit icons (unlabeled — assign semantics) |
| Cursors (4) | Custom in-game cursor states |
| Human Avatars (25) | Player portraits |
| Banners + Ribbons (5 palettes) | Faction banners, victory/defeat screens |
| Papers (Regular/Special) | Panel backgrounds |
| Swords | Attack icon / combat affordance |
| Wood Table | Bottom command-panel base |

**Improvement / polish possibilities**
- HP bar = SmallBar above units (Base+Fill, tinted by faction); resource bar = BigBar.
- Custom cursor per mode (normal/attack/move) via Cursors.
- Faction-colored Banners on the HUD and at base.

## 6. Map and scale

- World `192×192` tiles; `1 tile = 64 render px` (fixed ÷ 4).
- Tilemap_color1 = default terrain; Water Foam + Water Background for water regions.
- Shadow decal at 1 tile; buildings anchored bottom-center; units anchored at feet.

## 7. Curated vs. available

The whole pack is curated today: **446 assets** in `manifest.json` (all PNGs in
`tmp/tiny_swords` — units incl. Lancer/Monk/tool variants, buildings × 5
palettes, 5 terrain tilesets + water/shadow/foam, decorations, resources, FX,
UI kit). Kinds are derived from geometry at build time (`strip` when width is
divisible by height). Unit keys follow the game contract
`units.{faction}.{kind}.{anim}` (Lancer renamed from `lancer_idle` → `idle`).

**Laboratory (`/laboratory`, dev-only):** validation pages over the real
`AssetLibrary` — the same foundation the game consumes. A tab shell
(`Browse · Terrain · Stress · Report`) with a unified asset browser:

1. **Browse** — unified browser over all 446 curated keys. Sidebar search +
   auto-derived categories (nothing in the manifest is ever hidden, including
   unique assets like `rock1`, `rubber_duck`, resource stumps). Central canvas
   renders every asset with the lab display standard (crop to visible pixels,
   `0.5/0.5` anchor, 1:1 native scale) and animates strips via `StripPlayer`.
   The inspector shows a live readout, transparency/overlay toggles, per-type
   controls (unit flip/shadow, FX blend, tileset variant/footprint) and the
   shared per-asset validator (`validate-asset.ts`). Breadcrumb + prev/next +
   keyboard arrows navigate without ever losing the selection.
2. **Terrain** — unified terrain lab: paint grass/water/elevated + stairs,
   animated coastal foam, 5 palettes, flat/elevated/cliff matrices, official
   stair/cliff presets, and deterministic dressing by seed
   (`terrain-dressing.ts`).
3. **Stress** — up to 2000 **animated** sprites (driven per-frame) with a live
   FPS meter.
4. **Report** — the shared validator over all assets (`validate-asset.ts`) plus
   the game-mapping table (every key the game resolves today → found/missing).

Shared rules live in `packages/renderer` (`terrain-autotile.ts`,
`terrain-dressing.ts`, `assets/validate-asset.ts`); the lab never duplicates
game logic.

## 8. Integration points (by system)

| System (phase) | Assets to wire |
|---|---|
| MOVE / orders (Phase 1) | idle/run flip, Dust |
| Combat (Phase 1) | attack anims, Arrow, Explosion, HP bars, Fire muzzle |
| Economy (Phase 2) | Pawn tool variants, Gold/Wood/Meat sprites, Sheep |
| Buildings (Phase 2) | Castle/Barracks/Tower/Archery/Monastery/Houses, rally flag |
| UI/HUD (Phase 1→8) | Bars, Buttons, Icons, Papers, Wood Table, Banners, Avatars |
| Fog/projectiles/AoE (Phase 3) | Water Splash, Explosion_02, directional Lancer |

Keep this document updated on every integration (task A0.2b). Before wiring an
asset into a game system, validate it in the sprite lab and confirm the
contract resolves in **Game-mapping** — the game renderer resolves
`units.{faction}.{kind}.idle/run` today, so any key that does not match the
pattern shows up as MISSING immediately.

## 9. Phase 1 integration status (A0.2b)

What the game consumed in the Phase 1 simulation/visual pass:

- **Unit sprite contract** — `units.{faction}.{kind}.{subtype}` resolves
  `idle`/`run` for every kind and `attack` via a per-kind subtype mapping
  (warrior → `attack`, archer → `shoot`, pawn → `interact_axe` as a temporary
  melee swing). Unit sprites are cloned per unit, flipped by direction, and
  scaled at `SPRITE_SCALE = 0.25`.
- **Per-role combat stats** — the declarative unit definitions in
  (`packages/game-data/src/units.ts`) author stats per kind: warrior 150 hp / 15 dmg / melee, archer 60 hp / 8 dmg
  / range 3, pawn 100 hp / 10 dmg / melee. The mixed demo scenario pits melee
  vs ranged to demonstrate range and durability trade-offs.
- **Combat feedback (V9)** — the renderer consumes the deterministic per-tick
  events and the extended snapshot:
  - HP bars overhead (green/yellow/red by ratio), shown only when damaged
    (`packages/renderer/src/progress-bar.ts`).
  - Attack streaks, floating damage numbers, and death explosions
    (`packages/renderer/src/effects-layer.ts`).
  - Attack animation flashes on `attackFired`.
- **Fallback remains CI-safe** — with no art the renderer draws placeholder
  circles; e2e tests skip art-dependent assertions when the manifest is absent.
- The Explosion FX asset is not yet wired (death uses a procedural ring);
  the pack's `explosion` strip is a future swap-in.
