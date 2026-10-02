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
//   SimulationEvent, SimulationEventType, CommandIntent, CommandType, MovePayload, GatherPayload, BuildPayload,
//   BuildingType, BuildingStatus, UnitKind, StairDirection, AssetKind, AssetKey, MatchResult
// @rts/protocol types: MatchRequest, MatchConfig, CommandMessage, SnapshotMessage, SnapshotUnit,
//   SnapshotResource, SnapshotPlayer, OrderState, EconomyPhase, ConstructionStatus, MatchPhase, ErrorMessage
// @rts/simulation types: ScheduledCommand, CommandErrorCode, Order, RulesIdentity, TickResult,
//   SimulationOptions, ComponentType, PositionData, OwnerData, MovementData, OrdersData, HealthData,
//   CombatData, KindData, ResourceData, BuildingData, CargoData, GatherPhase, SimulationHost,
//   SimulationSnapshot, FormationOffset, GameState, PlayerState, UnitCombatStats
// @rts/renderer types: GameRenderer, RenderFrame, RenderUnit, RenderBuilding,
//   RenderResource, RendererOptions, RendererCallbacks, InputProfile, WorldInteraction,
//   SpriteAnim, SpriteShape, FrameAnim, UnitSpriteState, BuildingVisualKind

import * as protocol from '@rts/protocol'
import type {
  GameRenderer,
  InputProfile,
  RenderBuilding,
  RendererCallbacks,
  RendererOptions,
  RenderFrame,
  RenderResource,
  RenderUnit,
  WorldInteraction
} from '@rts/renderer'
import * as renderer from '@rts/renderer'
import * as shared from '@rts/shared'
import * as simulation from '@rts/simulation'

type Assert<T extends true> = T
type RendererPublicTypeAssertions = [
  Assert<GameRenderer extends { mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void> } ? true : false>,
  Assert<GameRenderer extends { present(frame: RenderFrame): void; dispose(): void } ? true : false>,
  Assert<RendererOptions extends { worldWidth: number; worldHeight: number } ? true : false>,
  Assert<RenderFrame extends { tick: number; units: readonly RenderUnit[] } ? true : false>,
  Assert<RenderBuilding extends object ? true : false>,
  Assert<RenderResource extends { resourceId: number; remaining: number } ? true : false>,
  Assert<InputProfile extends string ? true : false>,
  Assert<WorldInteraction extends { type: string } ? true : false>
]

const rendererPublicTypeAssertions: RendererPublicTypeAssertions = [true, true, true, true, true, true, true, true]
void rendererPublicTypeAssertions

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
      'UINT32_MAX',
      'assertNever',
      'isRecord',
      'field',
      'isInteger',
      'isNonNegativeInteger',
      'isOptionalNonNegativeInteger',
      'ASSET_KINDS',
      'isAssetKind',
      'isAssetKey',
      'toAssetKey',
      'MATCH_RESULTS',
      'BUILDING_STATUSES',
      'COMMAND_TYPES',
      'STAIR_DIRECTIONS',
      'SIMULATION_EVENT_TYPES',
      'UNIT_KINDS',
      'BUILDING_TYPES',
      'MAP_TILE_KINDS',
      'DRESSING_KINDS'
    ]
  ],
  [
    'protocol',
    [
      'version',
      'isCommandMessage',
      'isMatchRequest',
      'isMatchConfig',
      'isSnapshotMessage',
      'isSnapshotResyncRequest',
      'isErrorMessage',
      'MATCH_PHASES',
      'BUILDING_STATUSES',
      'ORDER_STATES',
      'ECONOMY_PHASES',
      'MATCH_AGGRESSIONS'
    ]
  ],
  [
    'simulation',
    [
      'version',
      'MAX_UNITS_PER_COMMAND',
      'createRulesIdentity',
      'CommandRejectedError',
      'Position',
      'Owner',
      'Movement',
      'Orders',
      'Health',
      'Combat',
      'Kind',
      'ResourceCatalog',
      'Building',
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
      'GATHER_TICKS_PER_RESOURCE',
      'RESOURCE_CARGO_CAPACITY',
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
      'DRESSING_ASSET_KEYS',
      'SPRITE_ANIMS',
      'SPRITE_SHAPES',
      'FRAME_ANIMS',
      'BUILDING_VISUAL_KINDS'
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

  it('does not expose removed building compatibility aliases', () => {
    for (const legacyName of ['Base', 'Barracks', 'Construction'] as const) {
      expect(legacyName in simulation, `@rts/simulation must not expose ${legacyName}`).toBe(false)
    }
  })
})
