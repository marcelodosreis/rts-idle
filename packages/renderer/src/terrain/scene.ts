import type { Container, Texture } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import type { AutoTileTerrain } from './autotile.js'
import type { DressingKind } from './dressing.js'
import { TerrainSceneRenderer } from './scene-renderer.js'

export interface TerrainSceneDressing {
  readonly seed: number
  readonly counts: Readonly<Partial<Record<DressingKind, number>>>
}

/**
 * An explicitly placed decoration, keyed by `"x,y"` in the scene's manual
 * decoration map. `variant` is a 0-based index into `DRESSING_ASSET_KEYS`.
 */
export interface ManualDecoration {
  readonly kind: DressingKind
  readonly variant: number
}

export interface TerrainSceneOptions {
  /** Terrain tileset palette (`color1`-`color5`); defaults to `color1`. */
  readonly palette?: string
  /** Uniform scene scale so a large grid fits a small host (default 1). */
  readonly scale?: number
  /** Foam animation stagger step (0-15); default 5. */
  readonly foamStep?: number
  /**
   * Water fill width/height in tiles. The whole background is pure water, so
   * the fill can exceed the grid (default: the grid bounds).
   */
  readonly waterCols?: number
  readonly waterRows?: number
}

/**
 * Shared terrain presentation: water fill, animated foam, autotile grid with
 * cliff bases, stair ramps, and deterministic dressing. Both the sprite lab's
 * terrain editor and the game's `TerrainLayer` render through this scene, so
 * a grid + stairs + dressing config produces identical pixels everywhere.
 * Presentation-only; never shared with the simulation.
 */
export interface TerrainScene {
  readonly container: Container
  render(
    grid: readonly (readonly AutoTileTerrain[])[],
    stairs: ReadonlyMap<string, 'left' | 'right'>,
    dressing: TerrainSceneDressing,
    manualDecorations?: ReadonlyMap<string, ManualDecoration>
  ): void
  setPalette(palette: string): Promise<void>
  setPaused(paused: boolean): void
  /** Tileset texture for atlas index (debug/matrix views), or `null`. */
  tileTexture(index: number): Texture | null
  destroy(): void
}

/** Builds the shared terrain scene; see {@link TerrainScene}. */
export async function createTerrainScene(assets: AssetLibrary, options?: TerrainSceneOptions): Promise<TerrainScene> {
  return TerrainSceneRenderer.create(assets, options)
}
