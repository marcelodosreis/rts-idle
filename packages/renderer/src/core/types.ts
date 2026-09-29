import type { OrderState, SnapshotBuilding, SnapshotEconomy } from '@rts/protocol'
import type { BuildingType, MapDefinition, SimulationEvent, UnitKind } from '@rts/shared'
import type { PointData } from 'pixi.js'
import type { InputProfile, WorldInteraction } from '../input/input-types.js'

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
  readonly damage?: number
  readonly armor?: number
  readonly movementSpeedFixed?: number
  readonly cargoCapacity?: number
  readonly lookAtX?: number
  /** Authoritative behavior state from the simulation (drives idle/run). */
  readonly orderState?: OrderState
  readonly repairProgressTicks?: number
  readonly repairProgressMax?: number
  readonly healCooldownRemaining?: number
  readonly economy?: SnapshotEconomy
  /** True while the worker holds cargo, independent of its current order. */
  readonly carrying?: boolean
}

export type RenderBuilding = SnapshotBuilding

/** Closed set of sprite animation states reported by the renderer (debug/E2E). */
export const SPRITE_ANIMS = [
  'idle',
  'run',
  'attack',
  'build',
  'repair_run',
  'repair_interact',
  'gather',
  'carry_idle',
  'carry_run',
  'fallback'
] as const
export type SpriteAnim = (typeof SPRITE_ANIMS)[number]

export const SPRITE_SHAPES = ['circle', 'square', 'triangle'] as const
export type SpriteShape = (typeof SPRITE_SHAPES)[number]

/** Base locomotion frames every unit kind provides. */
export const FRAME_ANIMS = ['idle', 'run', 'attack'] as const
export type FrameAnim = (typeof FRAME_ANIMS)[number]

/** Debug snapshot of one unit's sprite, shared by the renderer and its consumers. */
export interface UnitSpriteState {
  readonly visible: boolean
  readonly frame: number | null
  readonly anim: SpriteAnim
  readonly inTree: boolean
  readonly facing: number
  readonly scale: number
  readonly glyph: string | null
  readonly shape: SpriteShape | null
}

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
  readonly buildingType?: BuildingType
  readonly valid: boolean
}

/** A completed tick ready for presentation. */
export interface RenderFrame {
  /** Diagnostic frame number retained for renderer performance tooling. */
  readonly tick: number
  readonly units: readonly RenderUnit[]
  readonly buildings?: readonly RenderBuilding[]
  readonly mineralNodes?: readonly RenderMineralNode[]
  /** Per-tick deterministic events that drive combat feedback. */
  readonly events?: readonly SimulationEvent[]
}

export interface RendererCallbacks {
  /** The sole normalized input boundary from the renderer to the application. */
  readonly onInteraction: (interaction: WorldInteraction) => void
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
  /** Camera gesture profile; defaults to the mouse contract. */
  readonly inputProfile?: InputProfile
}

/** Public renderer contract: mount/present/resize/dispose plus camera and selection access. */
export interface GameRenderer {
  mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void>
  present(frame: RenderFrame): void
  resize(width: number, height: number): void
  dispose(): void
  setSelection(ids: readonly number[]): void
  setSelectedRallyProducer(id: number | null): void
  setSelectedRallyPoint(point: { readonly x: number; readonly y: number } | null): void
  getSelection(): readonly number[]
  getSelectionBoxState(): {
    readonly visible: boolean
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }>
  /** Current animation frame of a unit's sprite, or `null` when in fallback. */
  getUnitAnimationFrame(id: number): number | null
  /** Last reported health of a unit (drives the overhead HP bar), or `null`. */
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  /** Debug: whether a unit's sprite body is visible and its current frame. */
  getUnitSpriteState(id: number): UnitSpriteState | null
  getZoom(): number
  setInputProfile(profile: InputProfile): void
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
  setBuildPreview(preview: RenderBuildPreview | null): void
}
