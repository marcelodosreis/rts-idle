import type { AssetKind } from '@rts/shared'
import { Container, Graphics, type Texture } from 'pixi.js'
import { createSectionApp, disposeSectionApp } from '../shared/core/app.js'
import { checkerboard, drawGridLines } from '../shared/core/context.js'
import { croppedFrames, croppedTiles } from '../shared/core/crop.js'
import type { SectionContext } from '../shared/core/types.js'
import {
  type BuildKind,
  buildKindOf,
  CANVAS_H,
  type CanvasResult,
  DEFAULT_OPTIONS,
  type RenderOptions
} from './canvas.js'
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

export interface CanvasRendererHandle {
  readonly render: (key: string, options: RenderOptions) => Promise<CanvasResult>
  readonly selectSlice: (index: number) => void
  readonly destroy: () => void
}

/**
 * Imperative browser canvas: renders one asset with the lab standard (crop to
 * visible pixels, `0.5/0.5` anchor, 1:1 native) and keeps a single `StripPlayer`
 * for strips. With the `slices` option it shows every frame/tile in a grid.
 */
export class SpriteBrowserCanvas implements CanvasRendererHandle {
  private active: Active | null = null
  private sliceTextures: readonly Texture[] = []
  private sliceActive = 0
  private lastKey = ''
  private lastOptions: RenderOptions = { ...DEFAULT_OPTIONS }
  private renderSeq = 0
  private readonly content = new Container()
  private readonly buildCtx: BuildContext

  private constructor(
    private readonly app: Awaited<ReturnType<typeof createSectionApp>>,
    private readonly ctx: SectionContext,
    private readonly onSummary: (summary: string) => void,
    private readonly onSlice: (index: number) => void
  ) {
    app.stage.addChild(this.content)
    this.buildCtx = {
      app,
      ctx,
      content: this.content,
      setSliceTextures: (textures, activeSlice) => {
        this.sliceTextures = textures
        this.sliceActive = activeSlice
      }
    }
  }

  static async create(
    host: HTMLElement,
    ctx: SectionContext,
    onSummary: (summary: string) => void,
    onSlice: (index: number) => void
  ): Promise<CanvasRendererHandle> {
    let renderer: SpriteBrowserCanvas | null = null
    const app = await createSectionApp(host, CANVAS_H, () => renderer?.onHostResize())
    renderer = new SpriteBrowserCanvas(app, ctx, onSummary, onSlice)
    return renderer
  }

  private clear(): void {
    this.active?.destroy()
    this.active = null
    this.sliceTextures = []
    const children = [...this.content.children]
    this.content.removeChildren(0, this.content.children.length)
    for (const child of children) {
      child.destroy()
    }
  }

  /** Loads the cropped slice textures for a key (frames or tiles). */
  private async loadSlices(key: string): Promise<readonly Texture[]> {
    const entry = this.ctx.assets.entry(key)
    if (entry === null) {
      return []
    }
    if (entry.kind === 'tileset') {
      const tiles = await croppedTiles(this.ctx.assets, key)
      return tiles?.textures ?? []
    }
    const cropped = await croppedFrames(this.ctx.assets, key)
    const textures = cropped?.textures ?? []
    return entry.kind === 'strip' ? textures : textures.slice(0, 1)
  }

  selectSlice(index: number): void {
    if (index < 0 || index >= this.sliceTextures.length) {
      return
    }
    this.sliceActive = index
    this.onSlice(index)
    // In slice-grid mode the clicked frame/tile becomes the selection; re-render
    // so the highlight moves to the newly picked slice.
    if (this.lastOptions.slices) {
      this.lastOptions = { ...this.lastOptions, variant: index }
      void this.render(this.lastKey, this.lastOptions)
      return
    }
    this.applySliceSelection(index)
  }

  private applySliceSelection(index: number): void {
    const player = this.active?.player
    if (player !== null && player !== undefined) {
      player.sprite.gotoAndStop(index)
      player.setPaused(true)
    }
    // For building tilesets the slice is the variant; update options and re-render.
    if (buildKindOf(this.lastKey, this.ctx.assets.entry(this.lastKey)?.kind) === 'tileset') {
      this.lastOptions = { ...this.lastOptions, variant: index }
      void this.render(this.lastKey, this.lastOptions)
      return
    }
    const entry = this.ctx.assets.entry(this.lastKey)
    this.onSummary(
      `${this.lastKey}\nfile: ${entry?.file ?? '?'}\nframe ${this.sliceActive + 1}/${this.sliceTextures.length}` +
        (this.sliceTextures.length > 1 ? ' selected' : '')
    )
  }

  private async build(key: string, entryKind: AssetKind, kind: BuildKind, options: RenderOptions): Promise<Active> {
    if (kind === 'unit') {
      return buildUnit(this.buildCtx, key, options)
    }
    if (kind === 'tileset') {
      return buildTileset(this.buildCtx, key, options)
    }
    if (kind === 'grid') {
      return buildGrid(this.buildCtx, key)
    }
    if (entryKind === 'strip') {
      return buildStrip(this.buildCtx, key, options, buildKindOf(key, entryKind))
    }
    return buildStatic(this.buildCtx, key, options)
  }

  private addGridOverlay(): void {
    const grid = new Graphics()
    drawGridLines(grid, this.app.screen.width, CANVAS_H)
    this.content.addChild(grid)
  }

  private async rebuildSlices(
    key: string,
    entry: { file: string; kind: AssetKind; cellW: number; cellH: number },
    options: RenderOptions,
    kind: BuildKind
  ): Promise<CanvasResult> {
    const slices = await this.loadSlices(key)
    this.sliceTextures = slices
    this.sliceActive = Math.min(options.variant, Math.max(0, slices.length - 1))
    this.active = await buildSlicesGrid(this.buildCtx, slices, this.sliceActive, (index) => this.selectSlice(index))
    if (options.gridLines) {
      this.addGridOverlay()
    }
    const summary =
      `${key}\nfile: ${entry.file}\n${entry.kind} ${entry.cellW}×${entry.cellH}px` +
      (slices.length > 1 ? ` · ${slices.length} slices` : '') +
      `\nselected: slice ${this.sliceActive + 1}/${slices.length}`
    return { kind, summary, slices: slices.length, active: this.sliceActive }
  }

  private async rebuild(key: string, options: RenderOptions): Promise<CanvasResult> {
    const entry = this.ctx.assets.entry(key)
    if (entry === null) {
      return { kind: 'static', summary: `${key}\nno entry for ${key}`, slices: 0, active: 0 }
    }
    const kind = buildKindOf(key, entry.kind)
    if (options.slices) {
      return this.rebuildSlices(key, entry, options, kind)
    }
    this.active = await this.build(key, entry.kind, kind, options)
    if (options.gridLines) {
      this.addGridOverlay()
    }
    const summary =
      `${key} · ${entry.kind} ${entry.cellW}×${entry.cellH}px` +
      (entry.kind === 'strip' ? ` · ${entry.frames} frames` : '') +
      (this.sliceTextures.length > 1 ? ` · slice ${this.sliceActive + 1}/${this.sliceTextures.length}` : '')
    return { kind, summary: `${key}\n${summary}`, slices: this.sliceTextures.length, active: this.sliceActive }
  }

  async render(key: string, options: RenderOptions): Promise<CanvasResult> {
    this.lastKey = key
    this.lastOptions = options
    const seq = ++this.renderSeq
    // Preserve a manual strip selection across re-renders (fps/overlay toggles);
    // tilesets drive the active slice from the variant option.
    const isTileset = buildKindOf(key, this.ctx.assets.entry(key)?.kind) === 'tileset'
    if (isTileset || this.sliceTextures.length === 0) {
      this.sliceActive = options.variant
    }
    this.clear()
    if (options.checker) {
      this.content.addChild(checkerboard(this.app.screen.width, CANVAS_H))
    }
    const result = await this.rebuild(key, options)
    // Only the most recent render may publish its summary; stale async renders
    // (e.g. fast browse hook right after mount) are discarded.
    if (seq === this.renderSeq) {
      this.onSummary(result.summary)
    }
    return result
  }

  /** Re-renders the current asset when the host box changes. */
  private onHostResize(): void {
    if (this.lastKey !== '') {
      void this.render(this.lastKey, this.lastOptions)
    }
  }

  destroy(): void {
    this.clear()
    disposeSectionApp(this.app)
    this.app.destroy()
  }
}
