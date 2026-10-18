import { type Container, Graphics } from 'pixi.js'
import type { RenderFog } from '../core/types.js'

const TILE_PIXELS = 64
const FOG_COLOR = 0x101827
const EXPLORED_ALPHA = 0.46
const UNKNOWN_ALPHA = 0.88

/** Presents server-provided visibility without calculating gameplay state. */
export class FogLayer {
  private readonly tiles = new Map<number, Graphics>()
  private width = 0
  private height = 0

  constructor(
    private readonly layer: Container,
    initialWidth = 0,
    initialHeight = 0
  ) {
    this.layer.label = 'fog'
    this.layer.eventMode = 'none'
    if (initialWidth > 0 && initialHeight > 0) {
      this.rebuild(initialWidth, initialHeight)
    }
  }

  present(fog: RenderFog | undefined): void {
    if (fog === undefined) {
      this.showUnknown()
      return
    }
    this.layer.visible = true
    if (fog.width !== this.width || fog.height !== this.height) {
      this.rebuild(fog.width, fog.height)
    }
    const visible = new Set(fog.visibleTiles)
    const explored = new Set(fog.exploredTiles)
    for (let index = 0; index < this.width * this.height; index += 1) {
      const tile = this.tiles.get(index)
      if (tile === undefined) {
        continue
      }
      if (visible.has(index)) {
        tile.visible = false
      } else {
        tile.visible = true
        tile.alpha = explored.has(index) ? EXPLORED_ALPHA : UNKNOWN_ALPHA
      }
    }
  }

  dispose(): void {
    for (const tile of this.tiles.values()) {
      tile.destroy()
    }
    this.tiles.clear()
    this.layer.removeChildren()
    this.width = 0
    this.height = 0
  }

  private rebuild(width: number, height: number): void {
    this.dispose()
    this.width = width
    this.height = height
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x
        const tile = new Graphics().rect(x * TILE_PIXELS, y * TILE_PIXELS, TILE_PIXELS, TILE_PIXELS).fill(FOG_COLOR)
        tile.eventMode = 'none'
        tile.visible = false
        this.tiles.set(index, tile)
        this.layer.addChild(tile)
      }
    }
  }

  private showUnknown(): void {
    this.layer.visible = true
    for (const tile of this.tiles.values()) {
      tile.visible = true
      tile.alpha = UNKNOWN_ALPHA
    }
  }
}
