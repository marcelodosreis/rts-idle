import { type Container, Graphics, type PointData } from 'pixi.js'
import type { UnitLayer } from './unit-layer.js'
import { UNIT_RADIUS } from './unit-sprite.js'

const SELECTION_COLOR = 0xfbc02d
const BOX_FILL_COLOR = 0x1565c0
const RING_PADDING = 4

export interface SelectionControllerOptions {
  readonly selectionLayer: Container
  readonly units: UnitLayer
  /** Screen-space rectangle graphics, owned by the renderer and drawn above the viewport. */
  readonly selectionRect: Graphics
}

/**
 * Selection feedback: box selection over screen coordinates, the selection-id
 * set, and per-unit selection rings. Logical box membership is owned by the
 * application layer; unit positions come from the UnitLayer for ring updates.
 */
export class SelectionController {
  private readonly selectionLayer: Container
  private readonly units: UnitLayer
  private readonly selectionRect: Graphics
  private readonly selection = new Set<number>()
  private readonly selectionRings = new Map<number, Graphics>()
  private selecting = false
  private selectionStart: PointData | null = null
  private boxState = { visible: false, x: 0, y: 0, width: 0, height: 0 }

  constructor(options: SelectionControllerOptions) {
    this.selectionLayer = options.selectionLayer
    this.units = options.units
    this.selectionRect = options.selectionRect
  }

  beginBox(screen: PointData): void {
    this.selecting = true
    this.selectionStart = { x: screen.x, y: screen.y }
    this.selectionRect.visible = true
    this.boxState = { visible: true, x: screen.x, y: screen.y, width: 0, height: 0 }
    this.selectionRect.clear()
    this.selectionRect.rect(screen.x, screen.y, 0, 0).fill({ color: BOX_FILL_COLOR, alpha: 0.15 })
    this.selectionRect.stroke({ width: 1, color: BOX_FILL_COLOR })
  }

  updateBox(screen: PointData): void {
    if (!this.selecting || this.selectionStart === null) {
      return
    }
    const x = Math.min(this.selectionStart.x, screen.x)
    const y = Math.min(this.selectionStart.y, screen.y)
    const width = Math.abs(screen.x - this.selectionStart.x)
    const height = Math.abs(screen.y - this.selectionStart.y)
    this.boxState = { visible: true, x, y, width, height }
    this.selectionRect.clear()
    this.selectionRect.rect(x, y, width, height).fill({ color: BOX_FILL_COLOR, alpha: 0.15 })
    this.selectionRect.stroke({ width: 1, color: BOX_FILL_COLOR })
  }

  finishBox(): void {
    if (!this.selecting) {
      return
    }
    this.selecting = false
    this.selectionRect.visible = false
    this.selectionRect.clear()
    this.selectionStart = null
    this.boxState = { ...this.boxState, visible: false }
  }

  cancelBox(): void {
    this.selecting = false
    this.selectionStart = null
    this.selectionRect.visible = false
    this.selectionRect.clear()
    this.boxState = { ...this.boxState, visible: false }
  }

  getBoxState(): Readonly<typeof this.boxState> {
    return { ...this.boxState }
  }

  /** Replaces the selected id set and (re)creates rings for visible units. */
  set(ids: readonly number[]): void {
    const next = new Set(ids)
    for (const id of [...this.selection]) {
      if (!next.has(id)) {
        this.removeRing(id)
        this.selection.delete(id)
      }
    }
    for (const id of next) {
      this.selection.add(id)
      const position = this.units.position(id)
      if (position !== undefined) {
        this.updateRing(id, position.x, position.y)
      }
    }
  }

  get(): readonly number[] {
    return [...this.selection]
  }

  /** Repositions rings after units move (called on every presented frame). */
  updateRings(): void {
    for (const id of this.selection) {
      const position = this.units.position(id)
      if (position !== undefined) {
        this.updateRing(id, position.x, position.y)
      }
    }
  }

  private updateRing(id: number, x: number, y: number): void {
    let ring = this.selectionRings.get(id)
    if (ring === undefined) {
      ring = new Graphics()
      ring.circle(0, 0, UNIT_RADIUS + RING_PADDING).stroke({ color: SELECTION_COLOR, width: 2 })
      ring.eventMode = 'none'
      this.selectionLayer.addChild(ring)
      this.selectionRings.set(id, ring)
    }
    ring.position.set(x, y)
  }

  private removeRing(id: number): void {
    const ring = this.selectionRings.get(id)
    if (ring === undefined) {
      return
    }
    this.selectionLayer.removeChild(ring)
    ring.destroy()
    this.selectionRings.delete(id)
  }
}
