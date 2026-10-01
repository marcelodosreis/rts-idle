import type { BuildCatalogEntry, SnapshotBuilding, SnapshotResource } from '@rts/protocol'
import type { GameRenderer, RenderFrame } from '@rts/renderer'
import type { MapDefinition } from '@rts/shared'
import {
  projectSelectionUnits,
  type RenderedPosition,
  type SelectionUnitState
} from '../lib/selection-projection'
import type { HudConstruction, HudResource, HudSelectionUnit } from '../types/hud-types'

export interface MatchSessionRuntime {
  map: MapDefinition | null
  buildCatalog: readonly BuildCatalogEntry[]
  renderer: GameRenderer | null
  rendererReady: boolean
  configReceived: boolean
  snapshotReceived: boolean
  firstFramePresented: boolean
  rendererError: string | null
  pendingFrame: RenderFrame | null
  sessionActive: boolean
  lastTick: number
  matchEnded: boolean
  readonly unitStates: Map<number, SelectionUnitState>
  readonly unitPositions: Map<number, RenderedPosition>
  selectedIds: readonly number[]
  prevFramePositions: Map<number, RenderedPosition>
  buildings: readonly SnapshotBuilding[]
  resources: readonly SnapshotResource[]
  readonly resourceAmounts: Map<number, number>
  selectedConstructionId: number | null
  selectedResourceId: number | null
  selectUnits(ids: readonly number[]): MatchSelection
  selectConstruction(id: number): MatchSelection
  selectResource(id: number): MatchSelection
}

export interface MatchSelection {
  readonly ids: readonly number[]
  readonly units: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly resource: HudResource | null
}

function emptySelection(runtime: MatchSessionRuntime): MatchSelection {
  runtime.selectedIds = []
  runtime.selectedConstructionId = null
  runtime.selectedResourceId = null
  runtime.renderer?.setSelection([])
  runtime.renderer?.setSelectedRallyProducer(null)
  runtime.renderer?.setSelectedRallyPoint(null)
  return { ids: [], units: [], construction: null, resource: null }
}

function project(runtime: MatchSessionRuntime): MatchSelection {
  return {
    ids: runtime.selectedIds,
    units: projectSelectionUnits(
      runtime.unitStates,
      runtime.unitPositions,
      runtime.prevFramePositions,
      runtime.selectedIds
    ),
    construction: null,
    resource: null
  }
}

function toHudConstruction(construction: SnapshotBuilding): HudConstruction {
  return {
    id: construction.id,
    buildingType: construction.buildingType,
    ...(construction.tier === undefined ? {} : { tier: construction.tier }),
    owner: construction.owner,
    status: construction.status !== 'COMPLETED' && construction.builderId == null ? 'PAUSED' : construction.status,
    progressTicks: construction.progressTicks,
    totalTicks: construction.totalTicks,
    builderId: construction.builderId ?? null,
    tierUpgrade: construction.tierUpgrade ?? null,
    rallyPoint: construction.rallyPoint ?? null,
    ...(construction.hp === undefined ? {} : { hp: construction.hp, maxHp: construction.maxHp }),
    ...(construction.production === undefined ? {} : { production: construction.production })
  }
}

function selectUnits(runtime: MatchSessionRuntime, ids: readonly number[]): MatchSelection {
  if (runtime.matchEnded) {
    return project(runtime)
  }
  const normalizedIds = [...new Set(ids)]
  runtime.selectedIds = normalizedIds
  runtime.selectedConstructionId = null
  runtime.selectedResourceId = null
  runtime.renderer?.setSelection(normalizedIds)
  runtime.renderer?.setSelectedRallyProducer(null)
  runtime.renderer?.setSelectedRallyPoint(null)
  return project(runtime)
}

function selectConstruction(runtime: MatchSessionRuntime, id: number): MatchSelection {
  if (runtime.matchEnded) {
    return project(runtime)
  }
  emptySelection(runtime)
  const construction = runtime.buildings.find((candidate) => candidate.id === id)
  if (construction === undefined) {
    return project(runtime)
  }
  runtime.selectedConstructionId = id
  return { ids: [], units: [], construction: toHudConstruction(construction), resource: null }
}

/**
 * Projects a selected resource for the HUD. The map carries the resource
 * definition, so the kind is resolved here; selecting a resource must never
 * render a frame without it (that flashed Gold Mine before Tree).
 */
export function hudResourceFor(runtime: MatchSessionRuntime, id: number): HudResource | null {
  const remaining = runtime.resourceAmounts.get(id)
  if (remaining === undefined) {
    return null
  }
  const definition = runtime.map?.resources.find((resource) => resource.resourceId === id)
  return { id, remaining, ...(definition === undefined ? {} : { kind: definition.kind }) }
}

function selectResource(runtime: MatchSessionRuntime, id: number): MatchSelection {
  if (runtime.matchEnded) {
    return project(runtime)
  }
  const resource = hudResourceFor(runtime, id)
  if (resource === null) {
    return emptySelection(runtime)
  }
  emptySelection(runtime)
  runtime.selectedResourceId = id
  return { ids: [], units: [], construction: null, resource }
}

export function createMatchSessionRuntime(): MatchSessionRuntime {
  const runtime: MatchSessionRuntime = {
    map: null,
    buildCatalog: [],
    renderer: null,
    rendererReady: false,
    configReceived: false,
    snapshotReceived: false,
    firstFramePresented: false,
    rendererError: null,
    pendingFrame: null,
    sessionActive: true,
    lastTick: 0,
    matchEnded: false,
    unitStates: new Map(),
    unitPositions: new Map(),
    selectedIds: [],
    prevFramePositions: new Map(),
    buildings: [],
    resources: [],
    resourceAmounts: new Map(),
    selectedConstructionId: null,
    selectedResourceId: null,
    selectUnits(ids) {
      return selectUnits(runtime, ids)
    },
    selectConstruction(id) {
      return selectConstruction(runtime, id)
    },
    selectResource(id) {
      return selectResource(runtime, id)
    }
  }
  return runtime
}
