import type { OrderState, SnapshotBuilding, SnapshotEconomy } from '@rts/protocol'
import type { MapDefinition, PlayerId, SimulationEvent, UnitKind } from '@rts/shared'
import type { PointData } from 'pixi.js'

export type { UnitKind } from '@rts/shared'

/** A unit as rendered: id, integer fixed-unit position, owner slot, sprite kind. */
export interface RenderUnit {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly owner: number
  readonly kind?: UnitKind
  /** Current/maximum health, present when the unit is combat-capable. */
  readonly hp?: number
  readonly maxHp?: number
  /** Authoritative behavior state from the simulation (drives idle/run). */
  readonly orderState?: OrderState
  readonly economy?: SnapshotEconomy
  /** True while the worker holds cargo, independent of its current order. */
  readonly carrying?: boolean
}

/** A competitive slot for the HUD (defeated state, wallet). */
export interface RenderPlayer {
  readonly id: PlayerId
  readonly defeated: boolean
  readonly gold: number
  readonly usedSupply: number
  readonly supplyCap: number
}

export type RenderBuilding = SnapshotBuilding

export interface RenderMineralNode {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly remaining: number
}

export interface RenderBuildPreview {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly valid: boolean
}

/** A completed tick ready for presentation. */
export interface RenderFrame {
  readonly tick: number
  readonly units: readonly RenderUnit[]
  readonly buildings?: readonly RenderBuilding[]
  readonly mineralNodes?: readonly RenderMineralNode[]
  readonly players?: readonly RenderPlayer[]
  /** Per-tick deterministic events that drive combat feedback. */
  readonly events?: readonly SimulationEvent[]
}

export interface RendererCallbacks {
  readonly onUnitSelected?: (id: number) => void
  readonly onBuildingSelected?: (id: number) => void
  /** Primary click landed on a Mineral Node (informational selection). */
  readonly onMineralSelected?: (id: number) => void
  readonly onBoxSelected?: (ids: readonly number[]) => void
  readonly onGroundCommand?: (worldX: number, worldY: number) => void
  /** Primary click on the ground; return true when a mode consumes it. */
  readonly onGroundClick?: (worldX: number, worldY: number) => boolean
  readonly onGroundMove?: (worldX: number, worldY: number) => void
  /** Right-click landed on a unit (used for attack targeting). */
  readonly onUnitCommand?: (id: number) => void
  /** Right-click landed on a construction (used for builder assignment). */
  readonly onBuildingCommand?: (id: number) => void
  /** Right-click landed on a Mineral Node (used for contextual gathering). */
  readonly onMineralCommand?: (id: number) => void
}

export interface RendererOptions {
  readonly worldWidth: number
  readonly worldHeight: number
  readonly initialZoom?: number
  readonly initialCenter?: PointData
  /** Base URL for the asset manifest and sprites (empty string = no art). */
  readonly assetsUrl?: string
  /** Map definition rendered as terrain (empty = no terrain). */
  readonly map?: MapDefinition
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
  /** Current animation frame of a unit's sprite, or `null` when in fallback. */
  getUnitAnimationFrame(id: number): number | null
  /** Last reported health of a unit (drives the overhead HP bar), or `null`. */
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  /** Debug: whether a unit's sprite body is visible and its current frame. */
  getUnitSpriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'attack' | 'gather' | 'carry_idle' | 'carry_run' | 'fallback'
    readonly inTree: boolean
    readonly facing: number
    readonly scale: number
    readonly glyph: string | null
    readonly shape: 'circle' | 'square' | 'triangle' | null
  } | null
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
  setBuildPreview(preview: RenderBuildPreview | null): void
}
