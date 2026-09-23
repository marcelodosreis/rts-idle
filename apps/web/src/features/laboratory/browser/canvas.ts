import { Container, Graphics } from 'pixi.js'
import { createSectionApp, disposeSectionApp } from '../shared/core/app.js'
import { checkerboard, drawGridLines } from '../shared/core/context.js'
import { croppedFrames, croppedTiles } from '../shared/core/crop.js'
import type { BlendChoice } from '../shared/core/player.js'
import type { SectionContext } from '../shared/core/types.js'
import {
  type Active,
  type BuildContext,
  buildGrid,
  buildSlicesGrid,
  buildStatic,
  buildStrip,
  buildTileset,
  buildUnit
} from './canvas-builders.js'

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
export function buildKindOf(key: string, kind: string | undefined): BuildKind {
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
): Promise<{
  render: (key: string, options: RenderOptions) => Promise<CanvasResult>
  selectSlice: (index: number) => void
  destroy: () => void
}> {
  let hostResize: (() => void) | null = null
  const app = await createSectionApp(host, CANVAS_H, () => hostResize?.())
  const content = new Container()
  app.stage.addChild(content)

  let active: Active | null = null
  let sliceTextures: readonly import('pixi.js').Texture[] = []
  let sliceActive = 0
  let lastKey = ''
  let lastOptions: RenderOptions = { ...DEFAULT_OPTIONS }
  let renderSeq = 0

  const buildCtx: BuildContext = {
    app,
    ctx,
    content,
    setSliceTextures(textures, activeSlice): void {
      sliceTextures = textures
      sliceActive = activeSlice
    }
  }

  const clear = (): void => {
    active?.destroy()
    active = null
    sliceTextures = []
    const children = [...content.children]
    content.removeChildren(0, content.children.length)
    for (const child of children) {
      child.destroy()
    }
  }

  /** Loads the cropped slice textures for a key (frames or tiles). */
  const loadSlices = async (key: string): Promise<readonly import('pixi.js').Texture[]> => {
    const entry = ctx.assets.entry(key)
    if (entry === null) {
      return []
    }
    if (entry.kind === 'strip') {
      const cropped = await croppedFrames(ctx.assets, key)
      return cropped?.textures ?? []
    }
    if (entry.kind === 'tileset') {
      const tiles = await croppedTiles(ctx.assets, key)
      return tiles?.textures ?? []
    }
    const cropped = await croppedFrames(ctx.assets, key)
    return cropped?.textures.slice(0, 1) ?? []
  }

  const selectSlice = (index: number): void => {
    if (index < 0 || index >= sliceTextures.length) {
      return
    }
    sliceActive = index
    onSlice(index)
    // In slice-grid mode the clicked frame/tile becomes the selection; re-render
    // so the highlight moves to the newly picked slice.
    if (lastOptions.slices) {
      lastOptions = { ...lastOptions, variant: index }
      void render(lastKey, lastOptions)
      return
    }
    const player = active?.player
    if (player !== null && player !== undefined) {
      player.sprite.gotoAndStop(index)
      player.setPaused(true)
    }
    // For building tilesets the slice is the variant; update options and re-render.
    if (buildKindOf(lastKey, ctx.assets.entry(lastKey)?.kind) === 'tileset') {
      lastOptions = { ...lastOptions, variant: index }
      void render(lastKey, lastOptions)
      return
    }
    const entry = ctx.assets.entry(lastKey)
    onSummary(
      `${lastKey}\nfile: ${entry?.file ?? '?'}\nframe ${sliceActive + 1}/${sliceTextures.length}` +
        (sliceTextures.length > 1 ? ` selected` : '')
    )
  }

  const rebuild = async (key: string, options: RenderOptions): Promise<CanvasResult> => {
    const entry = ctx.assets.entry(key)
    if (entry === null) {
      return { kind: 'static', summary: `${key}\nno entry for ${key}`, slices: 0, active: 0 }
    }
    const kind = buildKindOf(key, entry.kind)

    // Slice-grid mode: show every frame/tile in the normal display format.
    if (options.slices) {
      const slices = await loadSlices(key)
      sliceTextures = slices
      sliceActive = Math.min(options.variant, Math.max(0, slices.length - 1))
      active = await buildSlicesGrid(buildCtx, slices, sliceActive, (index) => selectSlice(index))
      if (options.gridLines) {
        const grid = new Graphics()
        drawGridLines(grid, app.screen.width, CANVAS_H)
        content.addChild(grid)
      }
      const summary =
        `${key}\nfile: ${entry.file}\n${entry.kind} ${entry.cellW}×${entry.cellH}px` +
        (slices.length > 1 ? ` · ${slices.length} slices` : '') +
        `\nselected: slice ${sliceActive + 1}/${slices.length}`
      return { kind, summary, slices: slices.length, active: sliceActive }
    }

    let built: Active
    if (kind === 'unit') {
      built = await buildUnit(buildCtx, key, options)
    } else if (kind === 'tileset') {
      built = await buildTileset(buildCtx, key, options)
    } else if (kind === 'grid') {
      built = await buildGrid(buildCtx, key)
    } else if (entry.kind === 'strip') {
      built = await buildStrip(buildCtx, key, options, kind)
    } else {
      built = await buildStatic(buildCtx, key, options)
    }
    active = built
    if (options.gridLines) {
      const grid = new Graphics()
      drawGridLines(grid, app.screen.width, CANVAS_H)
      content.addChild(grid)
    }
    const summary =
      `${key} · ${entry.kind} ${entry.cellW}×${entry.cellH}px` +
      (entry.kind === 'strip' ? ` · ${entry.frames} frames` : '') +
      (sliceTextures.length > 1 ? ` · slice ${sliceActive + 1}/${sliceTextures.length}` : '')
    return { kind, summary: `${key}\n${summary}`, slices: sliceTextures.length, active: sliceActive }
  }

  const render = async (key: string, options: RenderOptions): Promise<CanvasResult> => {
    lastKey = key
    lastOptions = options
    const seq = ++renderSeq
    // Preserve a manual strip selection across re-renders (fps/overlay toggles);
    // tilesets drive the active slice from the variant option.
    const isTileset = buildKindOf(key, ctx.assets.entry(key)?.kind) === 'tileset'
    if (isTileset || sliceTextures.length === 0) {
      sliceActive = options.variant
    }
    clear()
    if (options.checker) {
      content.addChild(checkerboard(app.screen.width, CANVAS_H))
    }
    const result = await rebuild(key, options)
    // Only the most recent render may publish its summary; stale async renders
    // (e.g. fast browse hook right after mount) are discarded.
    if (seq === renderSeq) {
      onSummary(result.summary)
    }
    return result
  }

  // Re-render the current asset when the host box changes: builders position
  // and scale content from `app.screen`, so a stale size would misalign them.
  hostResize = () => {
    if (lastKey !== '') {
      void render(lastKey, lastOptions)
    }
  }

  return {
    render,
    selectSlice,
    destroy: () => {
      clear()
      disposeSectionApp(app)
      app.destroy()
    }
  }
}
