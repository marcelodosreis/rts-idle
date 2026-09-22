import type { BuildCatalogEntry, SnapshotMessage } from '@rts/protocol'
import type { GameRenderer, RenderFrame } from '@rts/renderer'
import type { MapDefinition } from '@rts/shared'
import type { HudConstruction, HudMineral, HudSelectionUnit } from '../hud/types'
import {
  projectSelectionUnits,
  type RenderedPosition,
  type SelectionUnitState
} from '../interaction/selection-projection'

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
      if (runtime.matchEnded) {
        return project(runtime)
      }
      const normalizedIds = [...new Set(ids)]
      runtime.selectedIds = normalizedIds
      runtime.selectedConstructionId = null
      runtime.selectedMineralId = null
      runtime.renderer?.setSelection(normalizedIds)
      return project(runtime)
    },
    selectConstruction(id) {
      if (runtime.matchEnded) {
        return project(runtime)
      }
      emptySelection(runtime)
      const construction = runtime.buildings.find((candidate) => candidate.id === id)
      if (construction === undefined || construction.owner !== 0) {
        return project(runtime)
      }
      runtime.selectedConstructionId = id
      return {
        ids: [],
        units: [],
        construction: {
          id: construction.id,
          buildingType: construction.buildingType,
          owner: construction.owner,
          status:
            construction.status !== 'COMPLETED' && construction.builderId == null ? 'PAUSED' : construction.status,
          progressTicks: construction.progressTicks,
          totalTicks: construction.totalTicks,
          builderId: construction.builderId ?? null
        },
        mineral: null
      }
    },
    selectMineral(id) {
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
  }
  return runtime
}
