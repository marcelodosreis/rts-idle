import { Graphics, type PointData } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { UnitLayer } from './unit-layer.js'
import { UNIT_RADIUS } from './unit-layer.js'

const SELECTION_COLOR = 0xfbc02d
const BOX_FILL_COLOR = 0x1565c0
const RING_PADDING = 4

export interface SelectionControllerOptions {
  readonly viewport: Viewport
  readonly units: UnitLayer
  /** Screen-space rectangle graphics, owned by the renderer and drawn above the viewport. */
  readonly selectionRect: Graphics
  readonly onBoxSelected: (ids: readonly number[]) => void
}

/**
 * Selection state and feedback: box selection over screen coordinates, the
 * selection-id set, and per-unit selection rings. Coordinates are translated
 * to world space through the viewport; unit positions come from the UnitLayer.
 */
export class SelectionController {
  private readonly viewport: Viewport
  private readonly units: UnitLayer
  private readonly selectionRect: Graphics
  private readonly onBoxSelected: (ids: readonly number[]) => void
  private readonly selection = new Set<number>()
  private readonly selectionRings = new Map<number, Graphics>()
  private selecting = false
  private selectionStart: PointData | null = null

  constructor(options: SelectionControllerOptions) {
    this.viewport = options.viewport
    this.units = options.units
    this.selectionRect = options.selectionRect
    this.onBoxSelected = options.onBoxSelected
  }

  startBox(screen: PointData): void {
    this.selecting = true
    this.selectionStart = { x: screen.x, y: screen.y }
    this.selectionRect.visible = true
    this.selectionRect.clear()
    this.selectionRect.rect(screen.x, screen.y, 0, 0).fill(BOX_FILL_COLOR, 0.15)
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
    this.selectionRect.clear()
    this.selectionRect.rect(x, y, width, height).fill(BOX_FILL_COLOR, 0.15)
    this.selectionRect.stroke({ width: 1, color: BOX_FILL_COLOR })
  }

  endBox(screen: PointData): void {
    if (!this.selecting || this.selectionStart === null) {
      return
    }
    this.selecting = false
    this.selectionRect.visible = false
    this.selectionRect.clear()

    const x0 = Math.min(this.selectionStart.x, screen.x)
    const y0 = Math.min(this.selectionStart.y, screen.y)
    const x1 = Math.max(this.selectionStart.x, screen.x)
    const y1 = Math.max(this.selectionStart.y, screen.y)

    const topLeft = this.viewport.toWorld(x0, y0)
    const bottomRight = this.viewport.toWorld(x1, y1)

    const selected: number[] = []
    for (const [id, position] of this.units.positionsPixels()) {
      if (
        position.x >= topLeft.x &&
        position.x <= bottomRight.x &&
        position.y >= topLeft.y &&
        position.y <= bottomRight.y
      ) {
        selected.push(id)
      }
    }
    this.onBoxSelected(selected)
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
      this.viewport.addChild(ring)
      this.selectionRings.set(id, ring)
    }
    ring.position.set(x, y)
  }

  private removeRing(id: number): void {
    const ring = this.selectionRings.get(id)
    if (ring === undefined) {
      return
    }
    this.viewport.removeChild(ring)
    ring.destroy()
    this.selectionRings.delete(id)
  }
}
