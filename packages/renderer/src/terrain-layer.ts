import type { MapDefinition, MapTileKind } from '@rts/game-data'
import { Sprite, Texture } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { AssetLibrary } from './assets/asset-library.js'

const TILE_PX = 64
/** Baked resolution divisor: tiles are drawn at TILE_PX / BAKE_SCALE and the
 * sprite is scaled back up with nearest-neighbor, keeping the texture ~38 MB
 * for a 192×192 map instead of ~600 MB at 1:1. */
const BAKE_SCALE = 4
const BAKED_TILE_PX = TILE_PX / BAKE_SCALE

/** Tile key → manifest key for each terrain kind drawn on the base layer. */
function tileAssetKey(kind: MapTileKind): string {
  switch (kind) {
    case 'grass':
      return 'terrain.tileset.color1'
    case 'water':
      return 'terrain.water.background'
    case 'rock':
      return 'terrain.decorations.rock1'
  }
}

/**
 * Renders the map as a single pre-baked texture sprite: every tile is blitted
 * onto one offscreen canvas, so a 192×192 map is one draw call instead of tens
 * of thousands of sprites. Presentation-only; the simulation never sees this.
 */
export class TerrainLayer {
  private readonly viewport: Viewport
  private readonly library: AssetLibrary
  private sprite: Sprite | null = null

  constructor(viewport: Viewport, library: AssetLibrary) {
    this.viewport = viewport
    this.library = library
  }

  /** Builds the terrain sprite from the map. Returns `false` if art is missing. */
  async build(map: MapDefinition): Promise<boolean> {
    const textures = new Map<MapTileKind, { readonly texture: Texture; readonly tileIndex: number }>()
    const grass = await this.library.tileTextures(tileAssetKey('grass'))
    const water = await this.library.texture(tileAssetKey('water'))
    const rock = await this.library.texture(tileAssetKey('rock'))
    if (grass === null || water === null || rock === null) {
      return false
    }
    textures.set('grass', { texture: grass[0]!, tileIndex: 0 })
    textures.set('water', { texture: water, tileIndex: 0 })
    textures.set('rock', { texture: rock, tileIndex: 0 })

    const width = map.width * BAKED_TILE_PX
    const height = map.height * BAKED_TILE_PX
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context === null) {
      return false
    }
    context.imageSmoothingEnabled = false

    for (let index = 0; index < map.tiles.length; index += 1) {
      const kind = map.tiles[index]!
      const entry = textures.get(kind)
      if (entry === undefined) {
        continue
      }
      const { texture } = entry
      const tileX = (index % map.width) * BAKED_TILE_PX
      const tileY = Math.floor(index / map.width) * BAKED_TILE_PX
      this.blit(context, texture, tileX, tileY)
    }

    const sprite = new Sprite(Texture.from(canvas))
    sprite.eventMode = 'none'
    sprite.scale.set(BAKE_SCALE)
    this.viewport.addChild(sprite)
    this.sprite = sprite
    return true
  }

  dispose(): void {
    if (this.sprite !== null) {
      this.sprite.destroy()
      this.sprite = null
    }
  }

  private blit(context: CanvasRenderingContext2D, texture: Texture, x: number, y: number): void {
    const source = texture.source.resource as CanvasImageSource
    const frame = texture.frame
    context.drawImage(source, frame.x, frame.y, frame.width, frame.height, x, y, BAKED_TILE_PX, BAKED_TILE_PX)
  }
}
