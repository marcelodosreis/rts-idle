import type { AssetKind } from '@rts/shared'
import type { BlendChoice } from '../../shared/services/strip-player'
import type { SectionContext } from '../../shared/types/section-context'
import { type CanvasRendererHandle, SpriteBrowserCanvas } from './canvas-renderer'

export const CANVAS_H = 460

export interface RenderOptions {
  readonly flip: boolean
  readonly shadow: boolean
  readonly blend: BlendChoice
  readonly variant: number
  readonly fps: number
  readonly paused: boolean
  readonly checker: boolean
  readonly overlay: boolean
  /** Show every frame/tile as a slice grid in the normal display format. */
  readonly slices: boolean
  /** Draw divisory grid lines on top of the display. */
  readonly gridLines: boolean
}

export const DEFAULT_OPTIONS: RenderOptions = {
  flip: false,
  shadow: false,
  blend: 'normal',
  variant: 0,
  fps: 10,
  paused: false,
  checker: false,
  overlay: false,
  slices: false,
  gridLines: false
}

export type BuildKind = 'unit' | 'fx' | 'tileset' | 'grid' | 'static'

export interface CanvasResult {
  readonly kind: BuildKind
  readonly summary: string
  /** Number of selectable slices (strip frames / tileset tiles), 0 if none. */
  readonly slices: number
  /** Currently selected slice index. */
  readonly active: number
}

/** The display kind a key maps to (drives inspector controls). */
export function buildKindOf(key: string, kind: AssetKind | undefined): BuildKind {
  if (key.startsWith('units.') && kind === 'strip') {
    return 'unit'
  }
  if (key.startsWith('fx.') && kind === 'strip') {
    return 'fx'
  }
  if (key.startsWith('buildings.') && kind === 'tileset') {
    return 'tileset'
  }
  if (kind === 'tileset') {
    return 'grid'
  }
  return 'static'
}

/**
 * Central canvas for the unified browser. Renders one asset with the lab
 * standard (crop to visible pixels, `0.5/0.5` anchor, 1:1 native) and keeps a
 * single `StripPlayer` for strips. With the `slices` option it shows every
 * frame/tile in a grid using the same normal display format.
 */
export async function createCanvas(
  host: HTMLElement,
  ctx: SectionContext,
  onSummary: (summary: string) => void,
  onSlice: (index: number) => void
): Promise<CanvasRendererHandle> {
  return SpriteBrowserCanvas.create(host, ctx, onSummary, onSlice)
}
