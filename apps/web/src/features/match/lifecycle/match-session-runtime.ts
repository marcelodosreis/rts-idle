import type { BuildCatalogEntry, SnapshotBuilding, SnapshotMessage } from '@rts/protocol'
import type { GameRenderer, RenderFrame } from '@rts/renderer'
import type { MapDefinition } from '@rts/shared'
import {
  projectSelectionUnits,
  type RenderedPosition,
  type SelectionUnitState
} from '../selection/selection-projection'
import type { HudConstruction, HudMineral, HudSelectionUnit } from '../ui/types'

export interface MatchSessionRuntime {
  map: MapDefinition | null
  buildCatalog: readonly BuildCatalogEntry[]
  renderer: GameRenderer | null
  rendererReady: boolean
  pendingFrame: RenderFrame | null
  sessionActive: boolean
  lastTick: number
  matchEnded: boolean
  readonly unitStates: Map<number, SelectionUnitState>
  readonly unitPositions: Map<number, RenderedPosition>
  selectedIds: readonly number[]
  prevFramePositions: Map<number, RenderedPosition>
  buildings: SnapshotMessage['buildings']
  mineralNodes: SnapshotMessage['mineralNodes']
  selectedConstructionId: number | null
  selectedMineralId: number | null
  selectUnits(ids: readonly number[]): MatchSelection
  selectConstruction(id: number): MatchSelection
  selectMineral(id: number): MatchSelection
}

export interface MatchSelection {
  readonly ids: readonly number[]
  readonly units: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly mineral: HudMineral | null
}

function emptySelection(runtime: MatchSessionRuntime): MatchSelection {
  runtime.selectedIds = []
  runtime.selectedConstructionId = null
  runtime.selectedMineralId = null
  runtime.renderer?.setSelection([])
  return { ids: [], units: [], construction: null, mineral: null }
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
    mineral: null
  }
}

function toHudConstruction(construction: SnapshotBuilding): HudConstruction {
  return {
    id: construction.id,
    buildingType: construction.buildingType,
    owner: construction.owner,
    status: construction.status !== 'COMPLETED' && construction.builderId == null ? 'PAUSED' : construction.status,
    progressTicks: construction.progressTicks,
    totalTicks: construction.totalTicks,
    builderId: construction.builderId ?? null
  }
}

function selectUnits(runtime: MatchSessionRuntime, ids: readonly number[]): MatchSelection {
  if (runtime.matchEnded) {
    return project(runtime)
  }
  const normalizedIds = [...new Set(ids)]
  runtime.selectedIds = normalizedIds
  runtime.selectedConstructionId = null
  runtime.selectedMineralId = null
  runtime.renderer?.setSelection(normalizedIds)
  return project(runtime)
}

function selectConstruction(runtime: MatchSessionRuntime, id: number): MatchSelection {
  if (runtime.matchEnded) {
    return project(runtime)
  }
  emptySelection(runtime)
  const construction = runtime.buildings.find((candidate) => candidate.id === id)
  if (construction === undefined || construction.owner !== 0) {
    return project(runtime)
  }
  runtime.selectedConstructionId = id
  return { ids: [], units: [], construction: toHudConstruction(construction), mineral: null }
}

function selectMineral(runtime: MatchSessionRuntime, id: number): MatchSelection {
  if (runtime.matchEnded) {
    return project(runtime)
  }
  const node = runtime.mineralNodes.find((candidate) => candidate.id === id)
  if (node === undefined) {
    return emptySelection(runtime)
  }
  emptySelection(runtime)
  runtime.selectedMineralId = id
  return { ids: [], units: [], construction: null, mineral: { id: node.id, remaining: node.remaining } }
}

export function createMatchSessionRuntime(): MatchSessionRuntime {
  const runtime: MatchSessionRuntime = {
    map: null,
    buildCatalog: [],
    renderer: null,
    rendererReady: false,
    pendingFrame: null,
    sessionActive: true,
    lastTick: 0,
    matchEnded: false,
    unitStates: new Map(),
    unitPositions: new Map(),
    selectedIds: [],
    prevFramePositions: new Map(),
    buildings: [],
    mineralNodes: [],
    selectedConstructionId: null,
    selectedMineralId: null,
    selectUnits(ids) {
      return selectUnits(runtime, ids)
    },
    selectConstruction(id) {
      return selectConstruction(runtime, id)
    },
    selectMineral(id) {
      return selectMineral(runtime, id)
    }
  }
  return runtime
}
