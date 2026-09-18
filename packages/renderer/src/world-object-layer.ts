import { fixedToRenderPixels } from '@rts/shared'
import { Graphics } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { RenderBase, RenderMineralNode } from './types.js'

const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825]
const BASE_WIDTH = 80
const BASE_HEIGHT = 64
const MINERAL_RADIUS = 30
const MINERAL_COLOR = 0xfbbf24

/** Minimal static presentation and hit testing for economy world objects. */
export class WorldObjectLayer {
  private readonly viewport: Viewport
  private readonly bases = new Map<number, Graphics>()
  private readonly mineralNodes = new Map<number, Graphics>()
  private readonly mineralNodePositions = new Map<number, { readonly x: number; readonly y: number }>()
  private readonly activeMineralNodes = new Set<number>()

  constructor(viewport: Viewport) {
    this.viewport = viewport
  }

  present(bases: readonly RenderBase[], mineralNodes: readonly RenderMineralNode[]): void {
    const seenBases = new Set<number>()
    for (const base of bases) {
      seenBases.add(base.id)
      let graphic = this.bases.get(base.id)
      if (graphic === undefined) {
        graphic = new Graphics()
        graphic.rect(-BASE_WIDTH / 2, -BASE_HEIGHT / 2, BASE_WIDTH, BASE_HEIGHT)
        graphic.fill({ color: OWNER_COLORS[base.owner % OWNER_COLORS.length] ?? 0x64748b, alpha: 0.8 })
        graphic.stroke({ color: 0xf8fafc, width: 4 })
        graphic.moveTo(-BASE_WIDTH / 2, -BASE_HEIGHT / 2)
        graphic.lineTo(0, -BASE_HEIGHT / 2 - 22)
        graphic.lineTo(BASE_WIDTH / 2, -BASE_HEIGHT / 2)
        graphic.stroke({ color: 0xf8fafc, width: 4 })
        graphic.eventMode = 'none'
        this.viewport.addChild(graphic)
        this.bases.set(base.id, graphic)
      }
      graphic.position.set(fixedToRenderPixels(base.x), fixedToRenderPixels(base.y))
    }
    this.removeMissing(this.bases, seenBases)

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
