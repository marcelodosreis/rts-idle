import { describe, expect, it } from 'vitest'

// Public-surface contract (master plan §4.3 "explicit exports in manifests").
//
// VALUE exports (functions/classes/consts) are asserted at runtime below:
// importing a missing name makes Vitest fail module resolution, and `in`
// catches silent renames. TYPE exports (interfaces/aliases) are erased at
// runtime; they are enforced by the consumer typechecks (server, web, tools)
// and this list documents them.
//
// @rts/shared types: Fixed, GridPosition, EntityId, PlayerId, RngState, RngResult, RngIntResult,
//   SimulationEvent, CommandIntent, MovePayload, GatherPayload, BuildPayload, BuildingType, UnitKind
// @rts/protocol types: MoveMessage, CommandMessage, SnapshotMessage, SnapshotUnit, SnapshotBase,
//   SnapshotMineralNode, SnapshotPlayer, OrderState, ErrorMessage
// @rts/simulation types: ScheduledCommand, CommandErrorCode, Order, RulesIdentity, TickResult,
//   SimulationOptions, ComponentType, PositionData, OwnerData, MovementData, OrdersData, HealthData,
//   CombatData, KindData, MineralNodeData, BaseData, BarracksData, ConstructionData, CargoData, GatherPhase, SimulationHost,
//   SimulationSnapshot, FormationOffset, GameState, PlayerState, UnitCombatStats
// @rts/renderer types: GameRenderer, RenderFrame, RenderUnit, RenderBase, RenderMineralNode,
//   RenderPlayer, RendererOptions, RendererCallbacks

import * as protocol from '@rts/protocol'
import * as renderer from '@rts/renderer'
import * as shared from '@rts/shared'
import * as simulation from '@rts/simulation'

const VALUE_EXPORTS: readonly (readonly [string, readonly string[]])[] = [
  [
    'shared',
    [
      'version',
      'FIXED_SCALE',
      'ONE_TILE',
      'tilesToFixed',
      'fixedToTiles',
      'gridPosition',
      'distSquaredFixed',
      'intSqrt',
      'START_ENTITY_ID',
      'MAX_ENTITY_ID',
      'peekEntityId',
      'allocateEntityId',
      'createRng',
      'rngNext',
      'rngNextInt',
      'rotateLeft',
      'splitmix32',
      'UINT32_MAX'
    ]
  ],
  ['protocol', ['version', 'isCommandMessage', 'isMoveMessage', 'isSnapshotMessage', 'isErrorMessage']],
  [
    'simulation',
    [
      'version',
      'MAX_UNITS_PER_COMMAND',
      'MAX_ORDER_QUEUE_DEPTH',
      'createRulesIdentity',
      'CommandRejectedError',
      'Position',
      'Owner',
      'Movement',
      'Orders',
      'Health',
      'Combat',
      'Kind',
      'MineralNode',
      'Base',
      'Construction',
      'Cargo',
      'ComponentStore',
      'World',
      'createWorld',
      'createSimulation',
      'simulationFromSnapshot',
      'FORMATION_SPACING',
      'formationOffset',
      'serializeState',
      'deserializeState',
      'hashBytes',
      'hashState',
      'UNIT_COMBAT_STATS',
      'UNIT_STATS_BY_KIND',
      'unitStatsFor',
      'GATHER_TICKS_PER_MINERAL',
      'MINERAL_CARGO_CAPACITY',
      'SYSTEM_PIPELINE',
      'runSystems',
      'checkInvariants',
      'InvariantError'
    ]
  ],
  [
    'renderer',
    [
      'version',
      'PixiRenderer',
      'autotileTile',
      'cliffBase',
      'stairTile',
      'gridToMapDefinition',
      'mapDefinitionToGrid',
      'dressTerrain',
      'DEFAULT_DRESSING_VARIANTS',
      'DEFAULT_DRESSING_COUNTS',
      'DRESSING_ASSET_KEYS'
    ]
  ]
]

const NAMESPACES: Record<string, Record<string, unknown>> = {
  shared: shared as unknown as Record<string, unknown>,
  protocol: protocol as unknown as Record<string, unknown>,
  simulation: simulation as unknown as Record<string, unknown>,
  renderer: renderer as unknown as Record<string, unknown>
}

describe('public API surface', () => {
  for (const [packageName, exports] of VALUE_EXPORTS) {
    it(`@rts/${packageName} exposes its documented value exports`, () => {
      const namespace = NAMESPACES[packageName]
      for (const name of exports) {
        expect(name in namespace, `@rts/${packageName} should export ${name}`).toBe(true)
      }
    })
  }
})
