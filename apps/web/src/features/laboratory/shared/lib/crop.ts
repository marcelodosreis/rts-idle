import type { AssetLibrary } from '@rts/renderer'
import { Rectangle, Texture } from 'pixi.js'
import { frameRgba, opaqueBounds } from './pixels'

/**
 * Shared visible-bounds crop used by every sprite lab section. All sections
 * display art 1:1 at its native pixel size, cropped to its opaque (visible)
 * pixels and anchored `0.5/0.5`, so the visible content is always centered
 * and transparent margins never uncenter the sprite.
 */

export interface VisibleBounds {
  readonly minX: number
  readonly minY: number
  readonly w: number
  readonly h: number
}

export interface CroppedFrames {
  readonly bounds: VisibleBounds
  /** One texture per strip frame (or a single static texture). */
  readonly textures: readonly Texture[]
}

const boundsCache = new Map<string, VisibleBounds>()

/** Opaque content bounds of an entry, unioned across all strip frames. */
export async function visibleBoundsOf(assets: AssetLibrary, key: string): Promise<VisibleBounds | null> {
  const cached = boundsCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const entry = assets.entry(key)
  if (entry === null) {
    return null
  }
  const texture = await assets.texture(key)
  if (texture === null) {
    return null
  }
  const image = texture.source.resource as CanvasImageSource
  let result: VisibleBounds | null = null
  if (entry.kind === 'strip') {
    let minX = entry.cellW
    let minY = entry.cellH
    let maxX = -1
    let maxY = -1
    for (let i = 0; i < entry.frames; i += 1) {
      const rgba = await frameRgba(image, { x: i * entry.cellW, y: 0, w: entry.cellW, h: entry.cellH })
      const b = opaqueBounds(rgba, entry.cellW, entry.cellH)
      if (b === null) {
        continue
      }
      minX = Math.min(minX, b.minX)
      minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX)
      maxY = Math.max(maxY, b.maxY)
    }
    if (maxX >= 0) {
      result = { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 }
    }
  } else {
    const rgba = await frameRgba(image, { x: 0, y: 0, w: entry.cellW, h: entry.cellH })
    const b = opaqueBounds(rgba, entry.cellW, entry.cellH)
    if (b !== null) {
      result = { minX: b.minX, minY: b.minY, w: b.maxX - b.minX + 1, h: b.maxY - b.minY + 1 }
    }
  }
  if (result !== null) {
    boundsCache.set(key, result)
  }
  return result
}

/**
 * Strip/static textures cropped to the union visible bounds. All frames share
 * the same crop box, so animations never shift or flicker.
 */
export async function croppedFrames(assets: AssetLibrary, key: string): Promise<CroppedFrames | null> {
  const entry = assets.entry(key)
  if (entry === null) {
    return null
  }
  const texture = await assets.texture(key)
  if (texture === null) {
    return null
  }
  const bounds = await visibleBoundsOf(assets, key)
  if (bounds === null) {
    return null
  }
  if (entry.kind === 'strip') {
    const frames: Texture[] = []
    for (let i = 0; i < entry.frames; i += 1) {
      frames.push(
        new Texture({
          source: texture.source,
          frame: new Rectangle(i * entry.cellW + bounds.minX, bounds.minY, bounds.w, bounds.h)
        })
      )
    }
    return { bounds, textures: frames }
  }
  return {
    bounds,
    textures: [
      new Texture({
        source: texture.source,
        frame: new Rectangle(bounds.minX, bounds.minY, bounds.w, bounds.h)
      })
    ]
  }
}

/**
 * Display scale for the lab: always 1:1 native pixels, shrinking only when
 * the content would overflow the preview box. Never upscales.
 */
export function nativeScale(boundsW: number, boundsH: number, maxBox: number): number {
  return Math.max(0.01, Math.min(1, maxBox / boundsW, maxBox / boundsH))
}

/**
 * Crops every tile of a tileset to the union of its visible (opaque) bounds,
 * so a slice grid shows all tiles at their native size without transparent
 * margins. Returns `null` when the entry is not a tileset or has no content.
 */
export async function croppedTiles(assets: AssetLibrary, key: string): Promise<CroppedFrames | null> {
  const entry = assets.entry(key)
  if (entry === null || entry.kind !== 'tileset' || entry.columns === undefined || entry.rows === undefined) {
    return null
  }
  const texture = await assets.texture(key)
  if (texture === null) {
    return null
  }
  const image = texture.source.resource as CanvasImageSource
  let minX = entry.cellW
  let minY = entry.cellH
  let maxX = -1
  let maxY = -1
  for (let row = 0; row < entry.rows; row += 1) {
    for (let column = 0; column < entry.columns; column += 1) {
      const rgba = await frameRgba(image, {
        x: column * entry.cellW,
        y: row * entry.cellH,
        w: entry.cellW,
        h: entry.cellH
      })
      const b = opaqueBounds(rgba, entry.cellW, entry.cellH)
      if (b === null) {
        continue
      }
      minX = Math.min(minX, b.minX)
      minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX)
      maxY = Math.max(maxY, b.maxY)
    }
  }
  if (maxX < 0) {
    return null
  }
  const bounds: VisibleBounds = { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 }
  const textures: Texture[] = []
  for (let row = 0; row < entry.rows; row += 1) {
    for (let column = 0; column < entry.columns; column += 1) {
      textures.push(
        new Texture({
          source: texture.source,
          frame: new Rectangle(column * entry.cellW + bounds.minX, row * entry.cellH + bounds.minY, bounds.w, bounds.h)
        })
      )
    }
  }
  return { bounds, textures }
}
