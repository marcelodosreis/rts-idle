import { AnimatedSprite, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { AssetLibrary } from './assets/asset-library.js'
import { type AutoTileTerrain, autotileTile, cliffBase, stairTile } from './terrain-autotile.js'
import { DEFAULT_DRESSING_VARIANTS, DRESSING_ASSET_KEYS, type DressingKind, dressTerrain } from './terrain-dressing.js'

const TILE = 64
const FOAM_OFFSET = -64
const FOAM_FPS = 10
const FLAT_CENTER = 10
const GRASS_COLOR = 0x9abf6f
const WATER_COLOR = 0x7db8d8

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

export async function createTerrainScene(assets: AssetLibrary, options?: TerrainSceneOptions): Promise<TerrainScene> {
  const scale = options?.scale ?? 1
  const foamStep = options?.foamStep ?? 5
  const waterCols = options?.waterCols ?? 0
  const waterRows = options?.waterRows ?? 0
  let palette = options?.palette ?? 'color1'
  let atlas: readonly Texture[] | null = await assets.tileTextures(`terrain.tileset.${palette}`)
  const waterTexture = await assets.texture('terrain.water.background')
  const foamFrames = await assets.stripTextures('terrain.water.foam')

  const container = new Container()
  container.scale.set(scale)
  const waterContainer = new Container()
  const foamContainer = new Container()
  const gridContainer = new Container()
  const overlayContainer = new Container()
  const dressingContainer = new Container()
  container.addChild(waterContainer, foamContainer, gridContainer, overlayContainer, dressingContainer)

  let foamCount = 0

  const clear = (host: Container): void => {
    const children = [...host.children]
    host.removeChildren(0, host.children.length)
    for (const child of children) {
      child.destroy()
    }
  }

  const tileSprite = (index: number): Sprite | Graphics => {
    const frame = atlas?.[index]
    if (frame !== undefined) {
      const sprite = new Sprite(frame)
      sprite.width = TILE
      sprite.height = TILE
      return sprite
    }
    return new Graphics().rect(0, 0, TILE, TILE).fill(GRASS_COLOR)
  }

  const hasWaterNeighborAny = (grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): boolean =>
    grid[y - 1]?.[x] === 'water' ||
    grid[y + 1]?.[x] === 'water' ||
    grid[y]?.[x - 1] === 'water' ||
    grid[y]?.[x + 1] === 'water'

  const hasWaterNeighbor = (grid: readonly (readonly AutoTileTerrain[])[], x: number, y: number): boolean =>
    grid[y]?.[x] === 'land' && hasWaterNeighborAny(grid, x, y)

  const drawWater = (grid: readonly (readonly AutoTileTerrain[])[]): void => {
    clear(waterContainer)
    const gridCols = grid[0]?.length ?? 0
    const gridRows = grid.length
    const cols = Math.max(gridCols, waterCols)
    const rows = Math.max(gridRows, waterRows)
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        let tile: Sprite | Graphics
        if (waterTexture !== null) {
          tile = new Sprite(waterTexture)
          tile.width = TILE
          tile.height = TILE
        } else {
          tile = new Graphics().rect(0, 0, TILE, TILE).fill(WATER_COLOR)
        }
        tile.position.set(x * TILE, y * TILE)
        waterContainer.addChild(tile)
      }
    }
  }

  const drawCell = (
    host: Container,
    overlay: Container,
    grid: readonly (readonly AutoTileTerrain[])[],
    x: number,
    y: number
  ): void => {
    const kind = grid[y]?.[x]
    if (kind === undefined || kind === 'water') {
      return
    }
    const position = { x: x * TILE, y: y * TILE }
    if (kind === 'elevated') {
      const coastal = hasWaterNeighborAny(grid, x, y)
      let backdrop: Sprite | Graphics
      if (coastal && waterTexture !== null) {
        backdrop = new Sprite(waterTexture)
        backdrop.width = TILE
        backdrop.height = TILE
      } else if (coastal) {
        backdrop = new Graphics().rect(0, 0, TILE, TILE).fill(WATER_COLOR)
      } else {
        backdrop = tileSprite(FLAT_CENTER)
      }
      backdrop.position.set(position.x, position.y)
      host.addChild(backdrop)
    }
    const sprite = tileSprite(autotileTile(grid, x, y).atlasIndex ?? 0)
    sprite.position.set(position.x, position.y)
    host.addChild(sprite)
    if (kind === 'elevated') {
      const base = cliffBase(grid, x, y)
      if (base !== null) {
        const baseSprite = tileSprite(base)
        baseSprite.position.set(position.x, position.y + TILE)
        overlay.addChild(baseSprite)
      }
    }
  }

  const drawFoam = (grid: readonly (readonly AutoTileTerrain[])[]): void => {
    clear(foamContainer)
    foamCount = 0
    if (foamFrames === null) {
      return
    }
    const cols = grid[0]?.length ?? 0
    const rows = grid.length
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!hasWaterNeighbor(grid, x, y)) {
          continue
        }
        const sprite = new AnimatedSprite(foamFrames)
        sprite.animationSpeed = FOAM_FPS / 60
        sprite.position.set(x * TILE + FOAM_OFFSET, y * TILE + FOAM_OFFSET)
        sprite.gotoAndPlay((foamCount * foamStep) % 16)
        foamContainer.addChild(sprite)
        foamCount += 1
      }
    }
  }

  const drawStairs = (overlay: Container, stairs: ReadonlyMap<string, 'left' | 'right'>): void => {
    for (const [key, kind] of stairs) {
      const parts = key.split(',')
      const x = Number(parts[0] ?? 0)
      const y = Number(parts[1] ?? 0)
      const pieces = stairTile(kind)
      const bottom = tileSprite(pieces.bottom)
      bottom.position.set(x * TILE, y * TILE)
      overlay.addChild(bottom)
      const top = tileSprite(pieces.top)
      top.position.set(x * TILE, (y - 1) * TILE)
      overlay.addChild(top)
    }
  }

  const dressingFrames = async (kind: DressingKind, variant: number): Promise<readonly Texture[]> => {
    const keys = DRESSING_ASSET_KEYS[kind]
    const key = keys[variant % keys.length]
    if (key === undefined) {
      return []
    }
    const entry = assets.entry(key)
    if (entry === null) {
      return []
    }
    if (entry.kind === 'strip') {
      const frames = await assets.stripTextures(key)
      return frames ?? []
    }
    const tex = await assets.texture(key)
    return tex !== null ? [tex] : []
  }

  const drawDressing = async (
    grid: readonly (readonly AutoTileTerrain[])[],
    dressing: TerrainSceneDressing
  ): Promise<void> => {
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
      const frames = await dressingFrames(item.kind, item.variant)
      if (frames.length === 0) {
        continue
      }
      const scaleMultiplier = item.kind === 'cloud' ? 1.5 : 1
      if (frames.length > 1) {
        const sprite = new AnimatedSprite([...frames])
        sprite.animationSpeed = FOAM_FPS / 60
        sprite.width = TILE * scaleMultiplier
        sprite.scale.y = sprite.scale.x
        sprite.position.set(item.x * TILE + (TILE - sprite.width) / 2, item.y * TILE + TILE - sprite.height)
        sprite.gotoAndPlay(frameIndex % frames.length)
        dressingContainer.addChild(sprite)
      } else {
        const sprite = new Sprite(frames[0])
        sprite.width = TILE * scaleMultiplier
        sprite.scale.y = sprite.scale.x
        sprite.position.set(item.x * TILE + (TILE - sprite.width) / 2, item.y * TILE + TILE - sprite.height)
        dressingContainer.addChild(sprite)
      }
      frameIndex += 1
    }
  }

  const drawManualDecorations = async (decorations: ReadonlyMap<string, ManualDecoration>): Promise<void> => {
    if (decorations.size === 0) {
      return
    }
    let frameIndex = 0
    for (const [key, entry] of decorations) {
      const parts = key.split(',')
      const x = Number(parts[0] ?? 0)
      const y = Number(parts[1] ?? 0)
      const frames = await dressingFrames(entry.kind, entry.variant)
      if (frames.length === 0) {
        continue
      }
      if (frames.length > 1) {
        const sprite = new AnimatedSprite([...frames])
        sprite.animationSpeed = FOAM_FPS / 60
        sprite.width = TILE
        sprite.scale.y = sprite.scale.x
        sprite.position.set(x * TILE + (TILE - sprite.width) / 2, y * TILE + TILE - sprite.height)
        sprite.gotoAndPlay(frameIndex % frames.length)
        dressingContainer.addChild(sprite)
      } else {
        const sprite = new Sprite(frames[0])
        sprite.width = TILE
        sprite.scale.y = sprite.scale.x
        sprite.position.set(x * TILE + (TILE - sprite.width) / 2, y * TILE + TILE - sprite.height)
        dressingContainer.addChild(sprite)
      }
      frameIndex += 1
    }
  }

  let lastRender: {
    readonly grid: readonly (readonly AutoTileTerrain[])[]
    readonly stairs: ReadonlyMap<string, 'left' | 'right'>
    readonly dressing: TerrainSceneDressing
    readonly manualDecorations: ReadonlyMap<string, ManualDecoration>
  } | null = null

  const render = (
    grid: readonly (readonly AutoTileTerrain[])[],
    stairs: ReadonlyMap<string, 'left' | 'right'>,
    dressing: TerrainSceneDressing,
    manualDecorations: ReadonlyMap<string, ManualDecoration> = new Map()
  ): void => {
    lastRender = { grid, stairs, dressing, manualDecorations }
    drawWater(grid)
    drawFoam(grid)
    clear(gridContainer)
    clear(overlayContainer)
    clear(dressingContainer)
    const cols = grid[0]?.length ?? 0
    const rows = grid.length
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        drawCell(gridContainer, overlayContainer, grid, x, y)
      }
    }
    drawStairs(overlayContainer, stairs)
    // Explicit placements are authoritative; scatter is the fallback.
    if (manualDecorations.size > 0) {
      void drawManualDecorations(manualDecorations)
    } else {
      void drawDressing(grid, dressing)
    }
  }

  const setPalette = async (next: string): Promise<void> => {
    if (next === palette) {
      return
    }
    palette = next
    atlas = await assets.tileTextures(`terrain.tileset.${palette}`)
    if (lastRender !== null) {
      render(lastRender.grid, lastRender.stairs, lastRender.dressing, lastRender.manualDecorations)
    }
  }

  const setPaused = (paused: boolean): void => {
    for (const child of foamContainer.children) {
      if (child instanceof AnimatedSprite) {
        if (paused) {
          child.stop()
        } else {
          child.play()
        }
      }
    }
  }

  const tileTexture = (index: number): Texture | null => atlas?.[index] ?? null

  const destroy = (): void => {
    container.destroy({ children: true })
  }

  return { container, render, setPalette, setPaused, tileTexture, destroy }
}
