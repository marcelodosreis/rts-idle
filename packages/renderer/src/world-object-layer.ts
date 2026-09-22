import { FIXED_SCALE, fixedToRenderPixels } from '@rts/shared'
import { Graphics } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { buildingVisualStyle } from './building-visual-style.js'
import { BAR_BACKGROUND, BAR_BORDER, BAR_HEIGHT, BAR_RADIUS, clampRatio, drawProgressBar } from './progress-bar.js'
import type { RenderBuilding, RenderBuildPreview, RenderMineralNode } from './types.js'

const MINERAL_RADIUS = 30
const MINERAL_COLOR = 0xfbbf24

const pixelsPerTile = fixedToRenderPixels(FIXED_SCALE)

/** Minimal static presentation and hit testing for economy world objects. */
export class WorldObjectLayer {
  private readonly viewport: Viewport
  private readonly buildings = new Map<number, Graphics>()
  private readonly constructionHitboxes = new Map<
    number,
    { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  >()
  private readonly mineralNodes = new Map<number, Graphics>()
  private readonly mineralNodePositions = new Map<number, { readonly x: number; readonly y: number }>()
  private readonly activeMineralNodes = new Set<number>()
  private preview: RenderBuildPreview | null = null

  constructor(viewport: Viewport) {
    this.viewport = viewport
  }

  present(buildings: readonly RenderBuilding[], mineralNodes: readonly RenderMineralNode[]): void {
    const seenBuildings = new Set<number>()
    this.constructionHitboxes.clear()
    for (const building of buildings) {
      seenBuildings.add(building.id)
      let graphic = this.buildings.get(building.id)
      if (graphic === undefined) {
        graphic = new Graphics()
        graphic.eventMode = 'none'
        this.viewport.addChild(graphic)
        this.buildings.set(building.id, graphic)
      }
      const style = buildingVisualStyle(building.buildingType, building.status, building.owner)
      const footprint = building.footprint
      if (style.kind === 'base') {
        this.drawBase(graphic, footprint, style)
      } else {
        const width = footprint.width * pixelsPerTile
        const height = footprint.height * pixelsPerTile
        graphic
          .clear()
          .rect(0, 0, width, height)
          .fill({ color: style.fillColor, alpha: style.fillAlpha })
          .stroke({ color: style.strokeColor, width: 4 })
      }
      if (style.kind === 'foundation') {
        drawProgressBar(graphic, {
          x: 0,
          y: -10,
          width: footprint.width * pixelsPerTile,
          height: BAR_HEIGHT,
          ratio: clampRatio(building.progressTicks, building.totalTicks),
          fillColor: 0x22c55e,
          background: BAR_BACKGROUND,
          border: BAR_BORDER,
          radius: BAR_RADIUS
        })
      }
      graphic.position.set(fixedToRenderPixels(building.x), fixedToRenderPixels(building.y))
      this.constructionHitboxes.set(building.id, {
        x: fixedToRenderPixels(building.x),
        y: fixedToRenderPixels(building.y),
        width: footprint.width * pixelsPerTile,
        height: footprint.height * pixelsPerTile
      })
    }
    this.removeMissing(this.buildings, seenBuildings)

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

  private drawBase(
    graphic: Graphics,
    footprint: { readonly width: number; readonly height: number },
    style: ReturnType<typeof buildingVisualStyle>
  ): void {
    // Building visuals share the top-left footprint anchor used by previews and foundations.
    const width = footprint.width * pixelsPerTile
    const height = footprint.height * pixelsPerTile
    graphic.clear()
    graphic.rect(0, 0, width, height)
    graphic.fill({ color: style.fillColor, alpha: style.fillAlpha })
    graphic.stroke({ color: style.strokeColor, width: 4 })
    graphic.moveTo(0, 0)
    graphic.lineTo(width / 2, -22)
    graphic.lineTo(width, 0)
    graphic.stroke({ color: style.strokeColor, width: 4 })
  }

  setBuildPreview(preview: RenderBuildPreview | null): void {
    this.preview = preview
    this.renderPreview()
  }

  private renderPreview(): void {
    const id = -1
    let graphic = this.buildings.get(id)
    if (this.preview === null) {
      if (graphic !== undefined) {
        this.viewport.removeChild(graphic)
        graphic.destroy()
        this.buildings.delete(id)
      }
      return
    }
    if (graphic === undefined) {
      graphic = new Graphics()
      graphic.eventMode = 'none'
      this.viewport.addChild(graphic)
      this.buildings.set(id, graphic)
    }
    const width = this.preview.width * pixelsPerTile
    const height = this.preview.height * pixelsPerTile
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

  buildingAt(x: number, y: number): number | null {
    let topmost: number | null = null
    for (const [id, hitbox] of this.constructionHitboxes) {
      if (x >= hitbox.x && x <= hitbox.x + hitbox.width && y >= hitbox.y && y <= hitbox.y + hitbox.height) {
        topmost = id
      }
    }
    return topmost
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
