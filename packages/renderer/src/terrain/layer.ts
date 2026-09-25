import type { MapDefinition } from '@rts/shared'
import type { Container } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import { mapToTerrainSceneInput } from './conversion.js'
import { createTerrainScene, type TerrainScene } from './scene.js'

/**
 * Game terrain presentation: delegates to the shared `TerrainScene` (autotile
 * grid, cliffs, stairs, animated foam, and deterministic dressing) so the game
 * renders terrain exactly like the sprite lab. Presentation-only; the
 * simulation never sees this.
 */
export class TerrainLayer {
  private readonly terrainLayer: Container
  private readonly library: AssetLibrary
  private scene: TerrainScene | null = null

  constructor(terrainLayer: Container, library: AssetLibrary) {
    this.terrainLayer = terrainLayer
    this.library = library
  }

  /** Builds the terrain scene from the map. Returns `false` if art is missing. */
  async build(map: MapDefinition): Promise<boolean> {
    const scene = await createTerrainScene(
      this.library,
      map.palette !== undefined ? { palette: map.palette } : undefined
    )
    const input = mapToTerrainSceneInput(map)
    scene.render(input.grid, input.stairs, input.dressing, input.decorations)
    this.terrainLayer.addChild(scene.container)
    this.scene = scene
    return true
  }

  dispose(): void {
    if (this.scene !== null) {
      this.terrainLayer.removeChild(this.scene.container)
      this.scene.destroy()
    }
    this.scene = null
  }
}
