import type { SnapshotBuilding } from '@rts/protocol'
import type { CommandIntent } from '@rts/shared'
import type { CommandMode } from '../commands/useCommandModes'
import { buildingTypeForMode, isBuildMode, isRallyMode } from '../commands/useCommandModes'

export interface PlacementResult {
  readonly x: number
  readonly y: number
  readonly valid: boolean
  readonly reason?: string | null
}

export interface SelectedUnitState {
  readonly kind: string
  readonly owner: number
  readonly carrying?: boolean | undefined
}

export interface MatchInteractionContext {
  readonly isMatchEnded: () => boolean
  readonly selectedUnitIds: () => readonly number[]
  readonly selectedConstructionId: () => number | null
  readonly mode: () => CommandMode
  readonly unitStates: ReadonlyMap<number, SelectedUnitState>
  readonly buildings: () => readonly SnapshotBuilding[]
  readonly placementFor: (worldX: number, worldY: number) => PlacementResult | null
  readonly toCommandPoint: (worldX: number, worldY: number) => { readonly x: number; readonly y: number }
  readonly placementToCommandPoint: (placement: PlacementResult) => { readonly x: number; readonly y: number }
  readonly buildingToCommandPoint: (building: SnapshotBuilding) => { readonly x: number; readonly y: number }
  readonly sendCommand: (intent: CommandIntent) => void
  readonly clearMode: () => void
  readonly cancelPlacement: () => void
  readonly setBuildHint: (hint: string | null) => void
  readonly humanPlayer: number
}

/**
 * Interprets normalized renderer targets as RTS actions. It knows gameplay
 * semantics, but not DOM/Pixi events, coordinates, or transport details.
 */
export class MatchInteractionController {
  private readonly context: MatchInteractionContext

  constructor(context: MatchInteractionContext) {
    this.context = context
  }

  groundCommand(worldX: number, worldY: number): void {
    if (this.context.isMatchEnded()) {
      return
    }
    const commandMode = this.context.mode()
    if (isBuildMode(commandMode)) {
      this.context.cancelPlacement()
      return
    }
    if (isRallyMode(commandMode)) {
      const point = this.context.toCommandPoint(worldX, worldY)
      this.context.sendCommand({
        type: 'RALLY',
        payload: { producerId: commandMode.producerId, x: point.x, y: point.y }
      })
      this.context.clearMode()
      return
    }
    const producer = this.selectedRallyProducer()
    if (producer !== undefined) {
      const point = this.context.toCommandPoint(worldX, worldY)
      this.context.sendCommand({ type: 'RALLY', payload: { producerId: producer.id, x: point.x, y: point.y } })
      return
    }
    const unitIds = this.context.selectedUnitIds()
    if (unitIds.length === 0) {
      return
    }
    const point = this.context.toCommandPoint(worldX, worldY)
    const target = { unitIds, x: point.x, y: point.y }
    const mode = this.context.mode()
    if (mode === 'patrol') {
      this.context.sendCommand({ type: 'PATROL', payload: target })
      this.context.clearMode()
    } else if (mode === 'attack_move') {
      this.context.sendCommand({ type: 'ATTACK_MOVE', payload: target })
      this.context.clearMode()
    } else {
      this.context.sendCommand({ type: 'MOVE', payload: target })
    }
  }

  handleBuildPlacementClick(worldX: number, worldY: number): boolean {
    if (this.context.isMatchEnded()) {
      return true
    }
    const buildingType = buildingTypeForMode(this.context.mode())
    if (buildingType === null) {
      return false
    }
    const placement = this.context.placementFor(worldX, worldY)
    const workerId = this.selectedWorkers()[0]
    if (placement?.valid && workerId !== undefined) {
      const point = this.context.placementToCommandPoint(placement)
      this.context.sendCommand({
        type: 'BUILD',
        payload: {
          unitId: workerId,
          buildingType,
          x: point.x,
          y: point.y
        }
      })
      this.context.cancelPlacement()
    }
    if (placement !== null && !placement.valid) {
      this.context.setBuildHint(placement.reason ?? null)
    }
    return true
  }

  unitCommand(id: number): void {
    if (this.context.isMatchEnded()) {
      return
    }
    if (isBuildMode(this.context.mode())) {
      this.context.cancelPlacement()
      return
    }
    const unitIds = this.context.selectedUnitIds()
    if (unitIds.length === 0) {
      return
    }
    const isEnemy = (this.context.unitStates.get(id)?.owner ?? this.context.humanPlayer) !== this.context.humanPlayer
    if (this.context.mode() === 'attack' || isEnemy) {
      this.context.sendCommand({ type: 'ATTACK', payload: { unitIds, targetId: id } })
      this.context.clearMode()
    }
  }

  buildingCommand(id: number): void {
    if (this.context.isMatchEnded()) {
      return
    }
    const building = this.context.buildings().find((candidate) => candidate.id === id)
    if (building === undefined) {
      return
    }
    const ownedPawns = this.selectedWorkers()
    if (building.status === 'COMPLETED') {
      const carrying = ownedPawns.filter((unitId) => this.context.unitStates.get(unitId)?.carrying === true)
      if (building.owner === this.context.humanPlayer && carrying.length > 0) {
        this.context.sendCommand({ type: 'DEPOSIT', payload: { unitIds: carrying, buildingId: id } })
      }
      return
    }
    const workerId = ownedPawns[0]
    if (workerId === undefined) {
      return
    }
    this.context.sendCommand({
      type: 'BUILD',
      payload: {
        unitId: workerId,
        buildingType: building.buildingType,
        ...this.context.buildingToCommandPoint(building)
      }
    })
  }

  mineralCommand(nodeId: number): void {
    if (this.context.isMatchEnded()) {
      return
    }
    if (isBuildMode(this.context.mode())) {
      this.context.cancelPlacement()
      return
    }
    const unitIds = this.context.selectedUnitIds()
    if (unitIds.length === 0) {
      return
    }
    this.context.sendCommand({ type: 'GATHER', payload: { unitIds, nodeId } })
    this.context.clearMode()
  }

  private selectedWorkers(): number[] {
    return this.context
      .selectedUnitIds()
      .filter((id) => this.context.unitStates.get(id)?.kind === 'pawn')
      .filter((id) => this.context.unitStates.get(id)?.owner === this.context.humanPlayer)
  }

  private selectedRallyProducer(): SnapshotBuilding | undefined {
    const id = this.context.selectedConstructionId()
    if (id === null) {
      return undefined
    }
    const building = this.context.buildings().find((candidate) => candidate.id === id)
    if (
      building === undefined ||
      building.owner !== this.context.humanPlayer ||
      building.status !== 'COMPLETED' ||
      (building.buildingType !== 'BASE' && building.buildingType !== 'BARRACKS')
    ) {
      return undefined
    }
    return building
  }
}
