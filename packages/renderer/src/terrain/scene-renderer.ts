import { TILE_PIXELS } from '@rts/shared'
import { AnimatedSprite, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import { type AutoTileTerrain, autotileTile, cliffBase, stairTile } from './autotile.js'
import { DEFAULT_DRESSING_VARIANTS, DRESSING_ASSET_KEYS, type DressingKind, dressTerrain } from './dressing.js'
import { GRASS_COLOR, WATER_COLOR } from './palette.js'
import type { ManualDecoration, TerrainScene, TerrainSceneDressing, TerrainSceneOptions } from './scene.js'

const TILE = TILE_PIXELS
const FOAM_OFFSET = -64
const FOAM_FPS = 10
const FLAT_CENTER = 10

interface LastRender {
  readonly grid: readonly (readonly AutoTileTerrain[])[]
  readonly stairs: ReadonlyMap<string, 'left' | 'right'>
  readonly dressing: TerrainSceneDressing
  readonly manualDecorations: ReadonlyMap<string, ManualDecoration>
}

/**
 * Concrete {@link TerrainScene}: water fill, animated foam, autotile grid with
 * cliff bases, stair ramps, and deterministic dressing. Presentation-only;
 * never shared with the simulation. Constructed through {@link createTerrainScene}.
 */
export class TerrainSceneRenderer implements TerrainScene {
  readonly container = new Container()
  private readonly assets: AssetLibrary
  private readonly waterContainer = new Container()
  private readonly foamContainer = new Container()
  private readonly gridContainer = new Container()
  private readonly overlayContainer = new Container()
  private readonly dressingContainer = new Container()
  private readonly foamStep: number
  private readonly waterCols: number
  private readonly waterRows: number
  private atlas: readonly Texture[] | null
  private readonly waterTexture: Texture | null
  private readonly foamFrames: readonly Texture[] | null
  private palette: string
  private foamCount = 0
  private destroyed = false
  private renderGeneration = 0
  private paletteRequest = 0
  private lastRender: LastRender | null = null

  private constructor(
    assets: AssetLibrary,
    options: {
      readonly palette: string
      readonly scale: number
      readonly foamStep: number
      readonly waterCols: number
      readonly waterRows: number
      readonly atlas: readonly Texture[] | null
      readonly waterTexture: Texture | null
      readonly foamFrames: readonly Texture[] | null
    }
  ) {
    this.assets = assets
    this.foamStep = options.foamStep
    this.waterCols = options.waterCols
    this.waterRows = options.waterRows
    this.atlas = options.atlas
    this.waterTexture = options.waterTexture
    this.foamFrames = options.foamFrames
    this.palette = options.palette
    this.container.scale.set(options.scale)
    this.container.addChild(
      this.waterContainer,
      this.foamContainer,
      this.gridContainer,
      this.overlayContainer,
      this.dressingContainer
    )
  }

  static async create(assets: AssetLibrary, options?: TerrainSceneOptions): Promise<TerrainSceneRenderer> {
    const palette = options?.palette ?? 'color1'
    const [atlas, waterTexture, foamFrames] = await Promise.all([
      assets.tileTextures(`terrain.tileset.${palette}`),
      assets.texture('terrain.water.background'),
      assets.stripTextures('terrain.water.foam')
    ])
    return new TerrainSceneRenderer(assets, {
      palette,
      scale: options?.scale ?? 1,
      foamStep: options?.foamStep ?? 5,
      waterCols: options?.waterCols ?? 0,
      waterRows: options?.waterRows ?? 0,
      atlas,
      waterTexture,
      foamFrames
    })
  }

  private clear(host: Container): void {
    const children = [...host.children]
    host.removeChildren(0, host.children.length)
    for (const child of children) {
      child.destroy()
    }
  }

  private tileSprite(index: number): Sprite | Graphics {
    const frame = this.atlas?.[index]
    if (frame !== undefined) {
      const sprite = new Sprite(frame)
      sprite.width = TILE
      sprite.height = TILE
      return sprite
    }
    return new Graphics().rect(0, 0, TILE, TILE).fill(GRASS_COLOR)
  }

  private hasWaterNeighborAny(grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): boolean {
    return (
      grid[y - 1]?.[x] === 'water' ||
      grid[y + 1]?.[x] === 'water' ||
      grid[y]?.[x - 1] === 'water' ||
      grid[y]?.[x + 1] === 'water'
    )
  }

  private hasWaterNeighbor(grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): boolean {
    return grid[y]?.[x] === 'land' && this.hasWaterNeighborAny(grid, x, y)
  }

  private drawWater(grid: readonly (readonly AutoTileTerrain[])[]): void {
    this.clear(this.waterContainer)
    const cols = Math.max(grid[0]?.length ?? 0, this.waterCols)
    const rows = Math.max(grid.length, this.waterRows)
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        let tile: Sprite | Graphics
        if (this.waterTexture !== null) {
          tile = new Sprite(this.waterTexture)
          tile.width = TILE
          tile.height = TILE
        } else {
          tile = new Graphics().rect(0, 0, TILE, TILE).fill(WATER_COLOR)
        }
        tile.position.set(x * TILE, y * TILE)
        this.waterContainer.addChild(tile)
      }
    }
  }

  private drawCell(grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): void {
    const kind = grid[y]?.[x]
    if (kind === undefined || kind === 'water') {
      return
    }
    const px = x * TILE
    const py = y * TILE
    if (kind === 'elevated') {
      let backdrop: Sprite | Graphics
      if (this.hasWaterNeighborAny(grid, x, y) && this.waterTexture !== null) {
        backdrop = new Sprite(this.waterTexture)
        backdrop.width = TILE
        backdrop.height = TILE
      } else if (this.hasWaterNeighborAny(grid, x, y)) {
        backdrop = new Graphics().rect(0, 0, TILE, TILE).fill(WATER_COLOR)
      } else {
        backdrop = this.tileSprite(FLAT_CENTER)
      }
      backdrop.position.set(px, py)
      this.gridContainer.addChild(backdrop)
    }
    const sprite = this.tileSprite(autotileTile(grid, x, y).atlasIndex ?? 0)
    sprite.position.set(px, py)
    this.gridContainer.addChild(sprite)
    const base = kind === 'elevated' ? cliffBase(grid, x, y) : null
    if (base !== null) {
      const baseSprite = this.tileSprite(base)
      baseSprite.position.set(px, py + TILE)
      this.overlayContainer.addChild(baseSprite)
    }
  }

  private drawFoam(grid: readonly (readonly AutoTileTerrain[])[]): void {
    this.clear(this.foamContainer)
    this.foamCount = 0
    if (this.foamFrames === null) {
      return
    }
    const cols = grid[0]?.length ?? 0
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!this.hasWaterNeighbor(grid, x, y)) {
          continue
        }
        const sprite = new AnimatedSprite([...this.foamFrames])
        sprite.animationSpeed = FOAM_FPS / 60
        sprite.position.set(x * TILE + FOAM_OFFSET, y * TILE + FOAM_OFFSET)
        sprite.gotoAndPlay((this.foamCount * this.foamStep) % 16)
        this.foamContainer.addChild(sprite)
        this.foamCount += 1
      }
    }
  }

  private drawStairs(stairs: ReadonlyMap<string, 'left' | 'right'>): void {
    for (const [key, kind] of stairs) {
      const parts = key.split(',')
      const x = Number(parts[0] ?? 0)
      const y = Number(parts[1] ?? 0)
      const pieces = stairTile(kind)
      const bottom = this.tileSprite(pieces.bottom)
      bottom.position.set(x * TILE, y * TILE)
      this.overlayContainer.addChild(bottom)
      const top = this.tileSprite(pieces.top)
      top.position.set(x * TILE, (y - 1) * TILE)
      this.overlayContainer.addChild(top)
    }
  }

  private async dressingFrames(kind: DressingKind, variant: number): Promise<readonly Texture[]> {
    const keys = DRESSING_ASSET_KEYS[kind]
    const key = keys[variant % keys.length]
    if (key === undefined) {
      return []
    }
    const entry = this.assets.entry(key)
    if (entry === null) {
      return []
    }
    if (entry.kind === 'strip') {
      const frames = await this.assets.stripTextures(key)
      return frames ?? []
    }
    const tex = await this.assets.texture(key)
    return tex !== null ? [tex] : []
  }

  private addDressingSprite(
    frames: readonly Texture[],
    position: { readonly x: number; readonly y: number },
    width: number,
    frameIndex: number
  ): void {
    if (frames.length > 1) {
      const sprite = new AnimatedSprite([...frames])
      sprite.animationSpeed = FOAM_FPS / 60
      sprite.width = width
      sprite.scale.y = sprite.scale.x
      sprite.position.set(position.x, position.y)
      sprite.gotoAndPlay(frameIndex % frames.length)
      this.dressingContainer.addChild(sprite)
      return
    }
    const sprite = new Sprite(frames[0])
    sprite.width = width
    sprite.scale.y = sprite.scale.x
    sprite.position.set(position.x, position.y)
    this.dressingContainer.addChild(sprite)
  }

  private async drawDressing(
    grid: readonly (readonly AutoTileTerrain[])[],
    dressing: TerrainSceneDressing,
    generation: number
  ): Promise<void> {
    const enabled = Object.values(dressing.counts).some((count) => count > 0)
    if (!enabled) {
      return
    }
    const counts = Object.fromEntries(Object.entries(dressing.counts).filter(([, count]) => count > 0))
    const items = dressTerrain(grid, dressing.seed, {
      counts: counts as Record<DressingKind, number>,
      variants: DEFAULT_DRESSING_VARIANTS
    })
    let frameIndex = 0
    for (const item of items) {
      const frames = await this.dressingFrames(item.kind, item.variant)
      if (this.destroyed || generation !== this.renderGeneration) {
        return
      }
      if (frames.length === 0) {
        continue
      }
      const width = TILE * (item.kind === 'cloud' ? 1.5 : 1)
      const position = { x: item.x * TILE + (TILE - width) / 2, y: item.y * TILE + TILE - width }
      this.addDressingSprite(frames, position, width, frameIndex)
      frameIndex += 1
    }
  }

  private async drawManualDecorations(
    decorations: ReadonlyMap<string, ManualDecoration>,
    generation: number
  ): Promise<void> {
    let frameIndex = 0
    for (const [key, entry] of decorations) {
      const parts = key.split(',')
      const x = Number(parts[0] ?? 0)
      const y = Number(parts[1] ?? 0)
      const frames = await this.dressingFrames(entry.kind, entry.variant)
      if (this.destroyed || generation !== this.renderGeneration) {
        return
      }
      if (frames.length === 0) {
        continue
      }
      this.addDressingSprite(frames, { x: x * TILE, y: y * TILE }, TILE, frameIndex)
      frameIndex += 1
    }
  }

  render(
    grid: readonly (readonly AutoTileTerrain[])[],
    stairs: ReadonlyMap<string, 'left' | 'right'>,
    dressing: TerrainSceneDressing,
    manualDecorations: ReadonlyMap<string, ManualDecoration> = new Map()
  ): void {
    const generation = ++this.renderGeneration
    this.lastRender = { grid, stairs, dressing, manualDecorations }
    this.drawWater(grid)
    this.drawFoam(grid)
    this.clear(this.gridContainer)
    this.clear(this.overlayContainer)
    this.clear(this.dressingContainer)
    const cols = grid[0]?.length ?? 0
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        this.drawCell(grid, x, y)
      }
    }
    this.drawStairs(stairs)
    // Explicit placements are authoritative; scatter is the fallback.
    if (manualDecorations.size > 0) {
      void this.drawManualDecorations(manualDecorations, generation)
    } else {
      void this.drawDressing(grid, dressing, generation)
    }
  }

  async setPalette(next: string): Promise<void> {
    if (next === this.palette) {
      return
    }
    const request = ++this.paletteRequest
    const nextAtlas = await this.assets.tileTextures(`terrain.tileset.${next}`)
    if (this.destroyed || request !== this.paletteRequest) {
      return
    }
    this.palette = next
    this.atlas = nextAtlas
    if (this.lastRender !== null) {
      this.render(
        this.lastRender.grid,
        this.lastRender.stairs,
        this.lastRender.dressing,
        this.lastRender.manualDecorations
      )
    }
  }

  setPaused(paused: boolean): void {
    for (const child of this.foamContainer.children) {
      if (child instanceof AnimatedSprite) {
        if (paused) {
          child.stop()
        } else {
          child.play()
        }
      }
    }
  }

  tileTexture(index: number): Texture | null {
    return this.atlas?.[index] ?? null
  }

  destroy(): void {
    this.destroyed = true
    this.renderGeneration += 1
    this.paletteRequest += 1
    this.container.destroy({ children: true })
  }
}
