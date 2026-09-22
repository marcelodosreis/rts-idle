import type { Viewport } from 'pixi-viewport'
import type { CancelReason, ScreenPoint, WorldInteraction, WorldPoint } from './input-types.js'
import type { WorldHitTester } from './world-hit-tester.js'

export interface WorldInputAdapterOptions {
  readonly canvas: HTMLCanvasElement
  readonly viewport: Viewport
  readonly hitTester: WorldHitTester
  readonly onInteraction: (interaction: WorldInteraction) => void
  readonly dragThresholdPx?: number
}

/** Normalizes browser/Pixi input into gameplay-independent world interactions. */
export class WorldInputAdapter {
  private readonly canvas: HTMLCanvasElement
  private readonly viewport: Viewport
  private readonly hitTester: WorldHitTester
  private readonly onInteraction: (interaction: WorldInteraction) => void
  private readonly dragThreshold: number
  private activePointerId: number | null = null
  private selectionStart: WorldPoint | null = null
  private selectionStartScreen: ScreenPoint | null = null
  private selectionStarted = false
  private lastSecondaryPointerAt = 0

  constructor(options: WorldInputAdapterOptions) {
    this.canvas = options.canvas
    this.viewport = options.viewport
    this.hitTester = options.hitTester
    this.onInteraction = options.onInteraction
    this.dragThreshold = options.dragThresholdPx ?? 6
    this.canvas.addEventListener('contextmenu', this.onContextMenu)
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('pointerdown', this.onDomPointerDown)
    this.canvas.addEventListener('pointermove', this.onDomPointerMove)
    this.canvas.addEventListener('pointerup', this.onDomPointerUp)
    this.canvas.addEventListener('pointercancel', this.onDomPointerCancel)
    this.canvas.addEventListener('lostpointercapture', this.onDomPointerCancel)
    window.addEventListener('blur', this.onWindowBlur)
  }

  dispose(): void {
    this.cancel('dispose')
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('pointerdown', this.onDomPointerDown)
    this.canvas.removeEventListener('pointermove', this.onDomPointerMove)
    this.canvas.removeEventListener('pointerup', this.onDomPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onDomPointerCancel)
    this.canvas.removeEventListener('lostpointercapture', this.onDomPointerCancel)
    window.removeEventListener('blur', this.onWindowBlur)
  }

  cancel(reason: CancelReason): void {
    this.releasePointer()
    this.selectionStart = null
    this.selectionStartScreen = null
    this.selectionStarted = false
    this.onInteraction({ type: 'cancel', reason })
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
    if (performance.now() - this.lastSecondaryPointerAt < 500) {
      return
    }
    this.lastSecondaryPointerAt = performance.now()
    this.emitSecondary(event.clientX, event.clientY)
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 2 || performance.now() - this.lastSecondaryPointerAt < 50) {
      return
    }
    this.lastSecondaryPointerAt = performance.now()
    this.emitSecondary(event.clientX, event.clientY)
  }

  private readonly onDomPointerDown = (event: PointerEvent): void => {
    if (event.button === 2) {
      if (performance.now() - this.lastSecondaryPointerAt < 50) {
        return
      }
      this.lastSecondaryPointerAt = performance.now()
      this.emitSecondary(event.clientX, event.clientY)
      return
    }
    if (event.button !== 0 || event.ctrlKey || event.metaKey || this.activePointerId !== null) {
      return
    }
    this.activePointerId = event.pointerId
    this.selectionStart = this.worldPoint(event.clientX, event.clientY)
    this.selectionStartScreen = this.screenPoint(event.clientX, event.clientY)
    this.selectionStarted = false
    this.canvas.setPointerCapture(event.pointerId)
  }

  private readonly onDomPointerMove = (event: PointerEvent): void => {
    const current = this.worldPoint(event.clientX, event.clientY)
    if (this.activePointerId === null || this.selectionStart === null) {
      this.onInteraction({ type: 'pointer-move', position: current, target: this.hitTester.targetAt(current) })
      return
    }
    if (this.distanceSquared(this.selectionStart, current) < this.dragThreshold ** 2) {
      return
    }
    const screen = this.screenPoint(event.clientX, event.clientY)
    if (this.selectionStartScreen !== null) {
      if (!this.selectionStarted) {
        this.selectionStarted = true
        this.onInteraction({ type: 'selection-start', screen: this.selectionStartScreen })
      }
      this.onInteraction({ type: 'selection-update', screen })
    }
    this.onInteraction({ type: 'pointer-move', position: current, target: this.hitTester.targetAt(current) })
  }

  private readonly onDomPointerUp = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId || this.selectionStart === null) {
      return
    }
    const start = this.selectionStart
    const screenStart = this.selectionStartScreen
    const end = this.worldPoint(event.clientX, event.clientY)
    const screenEnd = this.screenPoint(event.clientX, event.clientY)
    const dragged = this.distanceSquared(start, end) >= this.dragThreshold ** 2
    this.releasePointer()
    this.selectionStart = null
    this.selectionStartScreen = null
    this.selectionStarted = false
    if (dragged) {
      if (screenStart !== null) {
        this.onInteraction({
          type: 'selection-end',
          screenFrom: screenStart,
          screenTo: screenEnd,
          worldFrom: start,
          worldTo: end
        })
      }
      return
    }
    this.onInteraction({ type: 'primary-activate', target: this.hitTester.targetAt(end) })
  }

  private readonly onDomPointerCancel = (event: PointerEvent): void => {
    if (this.activePointerId === event.pointerId) {
      this.cancel('pointer-cancel')
    }
  }

  private readonly onWindowBlur = (): void => {
    if (this.activePointerId !== null) {
      this.cancel('focus-lost')
    }
  }

  private emitSecondary(clientX: number, clientY: number): void {
    const point = this.worldPoint(clientX, clientY)
    this.onInteraction({ type: 'secondary-activate', target: this.hitTester.targetAt(point) })
  }

  private worldPoint(clientX: number, clientY: number): WorldPoint {
    const rect = this.canvas.getBoundingClientRect()
    const point = this.viewport.toWorld(clientX - rect.left, clientY - rect.top)
    return { x: point.x, y: point.y }
  }

  private screenPoint(clientX: number, clientY: number): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  private releasePointer(): void {
    if (this.activePointerId !== null && this.canvas.hasPointerCapture(this.activePointerId)) {
      this.canvas.releasePointerCapture(this.activePointerId)
    }
    this.activePointerId = null
  }

  private distanceSquared(a: WorldPoint, b: WorldPoint): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy
  }
}
