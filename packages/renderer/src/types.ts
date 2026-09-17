import type { PointData } from 'pixi.js'

/** A unit as rendered: id, integer fixed-unit position, owner slot. */
export interface RenderUnit {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly owner: number
}

/** A completed tick ready for presentation. */
export interface RenderFrame {
  readonly tick: number
  readonly units: readonly RenderUnit[]
}

export interface RendererCallbacks {
  readonly onUnitSelected?: (id: number) => void
  readonly onBoxSelected?: (ids: readonly number[]) => void
  readonly onGroundCommand?: (worldX: number, worldY: number) => void
}

export interface RendererOptions {
  readonly worldWidth: number
  readonly worldHeight: number
  readonly initialZoom?: number
  readonly initialCenter?: PointData
}

/** Public renderer contract: mount/present/resize/dispose plus camera and selection access. */
export interface GameRenderer {
  mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void>
  present(frame: RenderFrame): void
  resize(width: number, height: number): void
  dispose(): void
  setSelection(ids: readonly number[]): void
  getSelection(): readonly number[]
  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }>
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
}
