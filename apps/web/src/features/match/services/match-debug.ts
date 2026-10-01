import type { ConstructionStatus, MatchConfig, SnapshotMessage } from '@rts/protocol'
import type { GameRenderer } from '@rts/renderer'
import { type ResourceKind, type ResourceType, resourceTypeForKind, type UnitKind } from '@rts/shared'
import type { SelectionUnitState } from '../lib/selection-projection'

export interface RtsDebug {
  getPositions(): Record<string, { readonly x: number; readonly y: number }>
  getUnitOwners(): Record<string, number>
  getUnitKinds(): Record<string, UnitKind>
  getConstructionStates(): Record<
    string,
    {
      readonly x: number
      readonly y: number
      readonly status: ConstructionStatus
      readonly hp?: number
      readonly maxHp?: number
    }
  >
  getAnimationFrame(id: number): number | null
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  getSpriteState(id: number): ReturnType<GameRenderer['getUnitSpriteState']>
  getSelection(): readonly number[]
  getSelectionBoxState(): ReturnType<GameRenderer['getSelectionBoxState']>
  setSelection(ids: readonly number[]): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  getTick(): number
  getReadyState(): MatchReadyState
  getConstructionDiagnostic(id: number): ConstructionDiagnostic | null
  getMapInfo(): {
    readonly width: number
    readonly height: number
    readonly decorations: number
    readonly isPlaytest: boolean
  }
  getResources(): Record<
    string,
    {
      readonly resourceId: number
      readonly kind: ResourceKind
      readonly resourceType: ResourceType
      readonly x: number
      readonly y: number
      readonly remaining: number
    }
  >
  getResourceRenderStats(): ReturnType<GameRenderer['getResourceStats']>
}

export interface MatchReadyState {
  readonly configReceived: boolean
  readonly snapshotReceived: boolean
  readonly rendererReady: boolean
  readonly firstFramePresented: boolean
  readonly rendererError: string | null
  readonly tick: number
  readonly ready: boolean
}

export interface ConstructionDiagnostic {
  readonly id: number
  readonly x: number
  readonly y: number
  readonly status: ConstructionStatus
  readonly progressTicks: number
  readonly totalTicks: number
  readonly builderId: number | null
  readonly builderPosition: { readonly x: number; readonly y: number } | null
  readonly builderOrder: SelectionUnitState['orderState'] | null
  readonly workPoint: null
  readonly constructionPosition: { readonly x: number; readonly y: number }
  readonly tick: number
}

declare global {
  interface Window {
    __rtsDebug?: RtsDebug
  }
}

export interface MatchDebugOptions {
  readonly renderer: GameRenderer
  readonly config: MatchConfig
  readonly isPlaytest: boolean
  readonly unitStates: ReadonlyMap<number, SelectionUnitState>
  readonly buildings: () => SnapshotMessage['buildings']
  readonly setSelection: (ids: readonly number[]) => void
  readonly getTick: () => number
  readonly fixedToRenderPixels: (value: number) => number
  readonly readyState: () => MatchReadyState
  readonly resourceAmounts: () => ReadonlyMap<number, number>
}

function constructionDiagnostic(options: MatchDebugOptions, id: number): ConstructionDiagnostic | null {
  const construction = options.buildings().find((building) => building.id === id)
  if (construction === undefined) {
    return null
  }
  const builderId = construction.builderId ?? null
  const builder = builderId === null ? undefined : options.unitStates.get(builderId)
  const builderPosition = builderId === null ? undefined : options.renderer.getUnitPositions().get(builderId)
  return {
    id: construction.id,
    x: construction.x,
    y: construction.y,
    status: construction.status,
    progressTicks: construction.progressTicks,
    totalTicks: construction.totalTicks,
    builderId,
    builderPosition: builderPosition ?? null,
    builderOrder: builder?.orderState ?? null,
    workPoint: null,
    constructionPosition: { x: construction.x, y: construction.y },
    tick: options.getTick()
  }
}

function constructionStates(
  buildings: readonly SnapshotMessage['buildings'][number][]
): RtsDebug['getConstructionStates'] extends () => infer T ? T : never {
  return Object.fromEntries(
    buildings.map((building) => [
      String(building.id),
      {
        x: building.x,
        y: building.y,
        status: building.status,
        ...(building.hp === undefined ? {} : { hp: building.hp, maxHp: building.maxHp })
      }
    ])
  )
}

function resources(config: MatchConfig, amounts: ReadonlyMap<number, number>): ReturnType<RtsDebug['getResources']> {
  return Object.fromEntries(
    config.map.resources.map((resource) => [
      String(resource.resourceId),
      {
        resourceId: resource.resourceId,
        kind: resource.kind,
        resourceType: resourceTypeForKind(resource.kind),
        x: resource.x,
        y: resource.y,
        remaining: amounts.get(resource.resourceId) ?? resource.initialAmount
      }
    ])
  )
}

export function createRtsDebug(options: MatchDebugOptions): RtsDebug {
  const {
    renderer,
    config,
    isPlaytest,
    unitStates,
    buildings,
    setSelection,
    getTick,
    fixedToRenderPixels,
    readyState,
    resourceAmounts
  } = options
  return {
    getPositions: () => Object.fromEntries([...renderer.getUnitPositions()].map(([id, pos]) => [String(id), pos])),
    getUnitOwners: () => Object.fromEntries([...unitStates].map(([id, state]) => [String(id), state.owner])),
    getUnitKinds: () => Object.fromEntries([...unitStates].map(([id, state]) => [String(id), state.kind])),
    getConstructionStates: () => constructionStates(buildings()),
    getAnimationFrame: (id) => renderer.getUnitAnimationFrame(id),
    getUnitHealth: (id) => renderer.getUnitHealth(id),
    getSpriteState: (id) => renderer.getUnitSpriteState(id),
    getSelection: () => renderer.getSelection(),
    getSelectionBoxState: () => renderer.getSelectionBoxState(),
    setSelection,
    worldToScreen: (x, y) => renderer.worldToScreen(fixedToRenderPixels(x), fixedToRenderPixels(y)),
    getZoom: () => renderer.getZoom(),
    getPing: () => renderer.getPing(),
    moveCamera: (x, y) => renderer.moveCamera(fixedToRenderPixels(x), fixedToRenderPixels(y)),
    getTick,
    getReadyState: readyState,
    getConstructionDiagnostic: (id) => constructionDiagnostic(options, id),
    getMapInfo: () => ({
      width: config.map.width,
      height: config.map.height,
      decorations: config.map.decorations?.length ?? 0,
      isPlaytest
    }),
    getResources: () => resources(config, resourceAmounts()),
    getResourceRenderStats: () => renderer.getResourceStats()
  }
}
