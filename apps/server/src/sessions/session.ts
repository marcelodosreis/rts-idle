import type {
  EconomyPhase,
  OrderState,
  SnapshotBuilding,
  SnapshotEconomy,
  SnapshotMineralNode,
  SnapshotPlayer,
  SnapshotUnit
} from '@rts/protocol'
import type { PlayerId, SimulationEvent } from '@rts/shared'
import {
  Building,
  Cargo,
  type CommandRejectedError,
  createSimulation,
  GATHER_TICKS_PER_MINERAL,
  Health,
  Kind,
  MineralNode,
  Movement,
  type Order,
  Orders,
  Owner,
  Position,
  type RulesIdentity,
  type ScheduledCommand,
  type SimulationHost,
  type SimulationOptions,
  type SimulationSnapshot,
  simulationFromSnapshot
} from '@rts/simulation'

export interface SessionResult {
  readonly tick: number
  readonly rejected: readonly CommandRejectedError[]
  readonly events: readonly SimulationEvent[]
}

/**
 * Derives a unit's high-level behavior state from its front order and whether
 * it is currently moving (drives the renderer's idle/run/attack animation).
 * ATTACK and ATTACK_MOVE take precedence because a chasing unit is attacking
 * even while moving.
 */
function deriveOrderState(front: Order | undefined, hasMovement: boolean): OrderState {
  if (front?.type === 'ATTACK') {
    return 'attacking'
  }
  if (front?.type === 'ATTACK_MOVE') {
    return 'attack_move'
  }
  if (front?.type === 'HOLD') {
    return 'hold'
  }
  if (front?.type === 'PATROL') {
    return 'patrol'
  }
  if (hasMovement) {
    return 'moving'
  }
  return 'idle'
}

function deriveEconomy(
  front: Order | undefined,
  cargo: { readonly amount: number; readonly capacity: number } | undefined
): SnapshotEconomy | undefined {
  if (front?.type !== 'GATHER' || cargo === undefined) {
    return undefined
  }
  const phaseByOrder: Readonly<Record<typeof front.phase, EconomyPhase>> = {
    TO_NODE: 'to_node',
    GATHERING: 'gathering',
    TO_BASE: 'to_base',
    WAITING_FOR_BASE: 'waiting_for_base'
  }
  return {
    phase: phaseByOrder[front.phase],
    cargoAmount: cargo.amount,
    cargoCapacity: cargo.capacity,
    progressTicks: front.progressTicks,
    progressMax: GATHER_TICKS_PER_MINERAL,
    nodeId: front.nodeId
  }
}

/**
 * Authoritative game session: the only path through which the transport can
 * submit commands and observe the running simulation (single-writer boundary).
 */
export class GameSession {
  private simulation: SimulationHost
  private readonly pending: ScheduledCommand[] = []

  private constructor(simulation: SimulationHost) {
    this.simulation = simulation
  }

  static create(options: SimulationOptions): GameSession {
    return new GameSession(createSimulation(options))
  }

  static fromSnapshot(snapshot: SimulationSnapshot): GameSession {
    return new GameSession(simulationFromSnapshot(snapshot))
  }

  submit(asPlayerId: PlayerId, commands: readonly ScheduledCommand[]): void {
    for (const command of commands) {
      if (command.playerId !== asPlayerId) {
        throw new Error(`GameSession: player ${asPlayerId} cannot submit commands for player ${command.playerId}`)
      }
      this.pending.push(command)
    }
  }

  advance(): SessionResult {
    const result = this.simulation.step(this.pending)
    this.pending.length = 0
    return { tick: result.tick, rejected: result.rejected, events: result.events }
  }

  snapshot(): SimulationSnapshot {
    return this.simulation.exportSnapshot()
  }

  /** Current match phase ('RUNNING' or 'FINISHED'), projected for the client. */
  phase(): 'RUNNING' | 'FINISHED' {
    return this.simulation.inspectState().phase
  }

  hashState(): string {
    return this.simulation.hashState()
  }

  projectUnits(): readonly SnapshotUnit[] {
    const world = this.simulation.inspectState().world
    const positions = world.store(Position)
    const owners = world.store(Owner)
    const healths = world.store(Health)
    const kinds = world.store(Kind)
    const orders = world.store(Orders)
    const movements = world.store(Movement)
    const cargos = world.store(Cargo)
    return world
      .aliveIds()
      .filter((id) => kinds.has(id))
      .map((id) => {
        const pos = positions.get(id)
        const owner = owners.get(id)
        if (pos === undefined || owner === undefined) {
          throw new Error(`GameSession: entity ${id} is missing position or owner`)
        }
        const health = healths.get(id)
        const front = orders.get(id)?.queue[0]
        const economy = deriveEconomy(front, cargos.get(id))
        const unit: SnapshotUnit = {
          id,
          x: pos.x,
          y: pos.y,
          owner: owner.owner,
          kind: kinds.get(id) ?? 'pawn',
          orderState: deriveOrderState(front, movements.get(id) !== undefined),
          ...(economy === undefined ? {} : { economy }),
          ...(health === undefined ? {} : { hp: health.current, maxHp: health.max })
        }
        return unit
      })
  }

  projectBuildings(): readonly SnapshotBuilding[] {
    const world = this.simulation.inspectState().world
    const buildings = world.store(Building)
    const positions = world.store(Position)
    const owners = world.store(Owner)
    return world
      .aliveIds()
      .filter((id) => buildings.has(id))
      .map((id) => {
        const position = positions.get(id)
        const owner = owners.get(id)
        const building = buildings.get(id)
        if (position === undefined || owner === undefined || building === undefined) {
          throw new Error(`GameSession: building ${id} is missing projection data`)
        }
        return {
          id,
          buildingType: building.buildingType,
          x: position.x,
          y: position.y,
          owner: owner.owner,
          builderId: building.builderId,
          footprint: { width: building.footprint.width, height: building.footprint.height },
          status: building.status,
          progressTicks: building.progressTicks,
          totalTicks: building.totalTicks
        }
      })
  }

  projectMineralNodes(): readonly SnapshotMineralNode[] {
    const world = this.simulation.inspectState().world
    const nodes = world.store(MineralNode)
    const positions = world.store(Position)
    return world
      .aliveIds()
      .filter((id) => nodes.has(id))
      .map((id) => {
        const position = positions.get(id)
        const node = nodes.get(id)
        if (position === undefined || node === undefined) {
          throw new Error(`GameSession: Mineral Node ${id} is missing position or state`)
        }
        return { id, x: position.x, y: position.y, remaining: node.remaining }
      })
  }

  projectPlayers(): readonly SnapshotPlayer[] {
    return this.simulation.inspectState().players.map((player) => ({
      id: player.id,
      defeated: player.defeated,
      gold: player.gold
    }))
  }

  identity(): RulesIdentity {
    return this.simulation.rulesIdentity()
  }
}
