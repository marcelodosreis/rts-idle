import type { MapDefinition } from '@rts/game-data'
import type { Viewport } from 'pixi-viewport'
import type { AssetLibrary } from './assets/asset-library.js'
import { mapDefinitionToGrid } from './terrain-conversion.js'
import { DEFAULT_DRESSING_COUNTS } from './terrain-dressing.js'
import { createTerrainScene, type TerrainScene } from './terrain-scene.js'

/**
 * Game terrain presentation: delegates to the shared `TerrainScene` (autotile
 * grid, cliffs, stairs, animated foam, and deterministic dressing) so the game
 * renders terrain exactly like the sprite lab. Presentation-only; the
 * simulation never sees this.
 */
export class TerrainLayer {
  private readonly viewport: Viewport
  private readonly library: AssetLibrary
  private scene: TerrainScene | null = null

  constructor(viewport: Viewport, library: AssetLibrary) {
    this.viewport = viewport
    this.library = library
  }

  /** Builds the terrain scene from the map. Returns `false` if art is missing. */
  async build(map: MapDefinition): Promise<boolean> {
    const scene = await createTerrainScene(
      this.library,
      map.palette !== undefined ? { palette: map.palette } : undefined
    )
    const conversion = mapDefinitionToGrid(map)
    scene.render(conversion.grid, conversion.stairs, {
      seed: map.decorationSeed ?? 1,
      counts: DEFAULT_DRESSING_COUNTS
    })
    this.viewport.addChild(scene.container)
    this.scene = scene
    return true
  }

  dispose(): void {
    this.scene?.destroy()
    this.scene = null
  }
}
