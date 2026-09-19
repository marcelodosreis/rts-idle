import { FIXED_SCALE, fixedToRenderPixels } from '@rts/shared'
import { Graphics } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { buildingVisualStyle, ownerColor } from './building-visual-style.js'
import { BAR_BACKGROUND, BAR_BORDER, BAR_HEIGHT, BAR_RADIUS, clampRatio, drawProgressBar } from './progress-bar.js'
import type { RenderBase, RenderBuildPreview, RenderConstruction, RenderMineralNode } from './types.js'

const BASE_WIDTH = 80
const BASE_HEIGHT = 64
const MINERAL_RADIUS = 30
const MINERAL_COLOR = 0xfbbf24

/** Minimal static presentation and hit testing for economy world objects. */
export class WorldObjectLayer {
  private readonly viewport: Viewport
  private readonly bases = new Map<number, Graphics>()
  private readonly constructions = new Map<number, Graphics>()
  private readonly mineralNodes = new Map<number, Graphics>()
  private readonly mineralNodePositions = new Map<number, { readonly x: number; readonly y: number }>()
  private readonly activeMineralNodes = new Set<number>()
  private preview: RenderBuildPreview | null = null

  constructor(viewport: Viewport) {
    this.viewport = viewport
  }

  present(
    bases: readonly RenderBase[],
    mineralNodes: readonly RenderMineralNode[],
    constructions: readonly RenderConstruction[] = []
  ): void {
    const constructionIds = new Set(constructions.map((construction) => construction.id))
    const seenBases = new Set<number>()
    for (const base of bases) {
      if (constructionIds.has(base.id)) {
        continue
      }
      seenBases.add(base.id)
      let graphic = this.bases.get(base.id)
      if (graphic === undefined) {
        graphic = new Graphics()
        graphic.eventMode = 'none'
        this.viewport.addChild(graphic)
        this.bases.set(base.id, graphic)
      }
      this.drawBase(graphic, base.owner)
      graphic.position.set(fixedToRenderPixels(base.x), fixedToRenderPixels(base.y))
    }
    this.removeMissing(this.bases, seenBases)

    const seenConstructions = new Set<number>()
    for (const construction of constructions) {
      seenConstructions.add(construction.id)
      let graphic = this.constructions.get(construction.id)
      if (graphic === undefined) {
        graphic = new Graphics()
        graphic.eventMode = 'none'
        this.viewport.addChild(graphic)
        this.constructions.set(construction.id, graphic)
      }
      const style = buildingVisualStyle(construction.buildingType, construction.status, construction.owner)
      if (style.kind === 'base') {
        this.drawBase(graphic, construction.owner)
      } else {
        const width = construction.footprint.width * (FIXED_SCALE / 4)
        const height = construction.footprint.height * (FIXED_SCALE / 4)
        graphic.clear()
        graphic.rect(0, 0, width, height)
        graphic.fill({ color: style.fillColor, alpha: style.fillAlpha })
        graphic.stroke({ color: style.strokeColor, width: 4 })
        if (style.kind === 'barracks') {
          graphic.rect(width * 0.2, height * 0.2, width * 0.6, height * 0.6)
          graphic.stroke({ color: 0xf97316, width: 3 })
        }
      }
      if (style.kind === 'foundation') {
        const width = construction.footprint.width * (FIXED_SCALE / 4)
        const ratio = clampRatio(construction.progressTicks, construction.totalTicks)
        drawProgressBar(graphic, {
          x: 0,
          y: -10,
          width,
          height: BAR_HEIGHT,
          ratio,
          fillColor: 0x22c55e,
          background: BAR_BACKGROUND,
          border: BAR_BORDER,
          radius: BAR_RADIUS
        })
      }
      graphic.position.set(fixedToRenderPixels(construction.x), fixedToRenderPixels(construction.y))
    }
    this.removeMissing(this.constructions, seenConstructions)

    const seenNodes = new Set<number>()
    this.mineralNodePositions.clear()
    for (const node of mineralNodes) {
      seenNodes.add(node.id)
      let graphic = this.mineralNodes.get(node.id)
      if (graphic === undefined) {
        graphic = new Graphics()
        graphic.poly([0, -34, 28, 0, 0, 34, -28, 0]).fill({ color: MINERAL_COLOR, alpha: 0.9 })
        graphic.poly([0, -34, 28, 0, 0, 34, -28, 0]).stroke({ color: 0xfef3c7, width: 4 })
        graphic.eventMode = 'none'
        this.viewport.addChild(graphic)
        this.mineralNodes.set(node.id, graphic)
      }
      const x = fixedToRenderPixels(node.x)
      const y = fixedToRenderPixels(node.y)
      graphic.position.set(x, y)
      graphic.alpha = node.remaining === 0 ? 0.35 : 1
      graphic.scale.set(this.activeMineralNodes.has(node.id) ? 1.2 : 1)
      if (node.remaining > 0) {
        this.mineralNodePositions.set(node.id, { x, y })
      }
    }
    this.removeMissing(this.mineralNodes, seenNodes)
    this.renderPreview()
  }

  private drawBase(graphic: Graphics, owner: number): void {
    graphic.clear()
    graphic.rect(-BASE_WIDTH / 2, -BASE_HEIGHT / 2, BASE_WIDTH, BASE_HEIGHT)
    graphic.fill({ color: ownerColor(owner), alpha: 0.8 })
    graphic.stroke({ color: 0xf8fafc, width: 4 })
    graphic.moveTo(-BASE_WIDTH / 2, -BASE_HEIGHT / 2)
    graphic.lineTo(0, -BASE_HEIGHT / 2 - 22)
    graphic.lineTo(BASE_WIDTH / 2, -BASE_HEIGHT / 2)
    graphic.stroke({ color: 0xf8fafc, width: 4 })
  }

  setBuildPreview(preview: RenderBuildPreview | null): void {
    this.preview = preview
    this.renderPreview()
  }

  private renderPreview(): void {
    const id = -1
    let graphic = this.constructions.get(id)
    if (this.preview === null) {
      if (graphic !== undefined) {
        this.viewport.removeChild(graphic)
        graphic.destroy()
        this.constructions.delete(id)
      }
      return
    }
    if (graphic === undefined) {
      graphic = new Graphics()
      graphic.eventMode = 'none'
      this.viewport.addChild(graphic)
      this.constructions.set(id, graphic)
    }
    const width = this.preview.width * (FIXED_SCALE / 4)
    const height = this.preview.height * (FIXED_SCALE / 4)
    graphic.clear()
    graphic.rect(0, 0, width, height)
    graphic.fill({ color: this.preview.valid ? 0x22c55e : 0xef4444, alpha: 0.28 })
    graphic.stroke({ color: this.preview.valid ? 0x86efac : 0xfca5a5, width: 4 })
    graphic.position.set(fixedToRenderPixels(this.preview.x), fixedToRenderPixels(this.preview.y))
  }

  setActiveMineralNodes(ids: ReadonlySet<number>): void {
    this.activeMineralNodes.clear()
    for (const id of ids) {
      this.activeMineralNodes.add(id)
    }
    for (const [id, graphic] of this.mineralNodes) {
      graphic.scale.set(this.activeMineralNodes.has(id) ? 1.2 : 1)
    }
  }

  mineralNodeAt(x: number, y: number): number | null {
    const threshold = MINERAL_RADIUS * MINERAL_RADIUS
    for (const [id, position] of this.mineralNodePositions) {
      const dx = position.x - x
      const dy = position.y - y
      if (dx * dx + dy * dy <= threshold) {
        return id
      }
    }
    return null
  }

  private removeMissing(graphics: Map<number, Graphics>, seen: ReadonlySet<number>): void {
    for (const [id, graphic] of graphics) {
      if (seen.has(id)) {
        continue
      }
      this.viewport.removeChild(graphic)
      graphic.destroy()
      graphics.delete(id)
    }
  }
}
