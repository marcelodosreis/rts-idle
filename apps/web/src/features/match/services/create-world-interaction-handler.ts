import type { WorldInteraction } from '@rts/renderer'
import { assertNever } from '@rts/shared'
import type { CommandMode } from '../hooks/use-command-modes'

interface BuildPlacementController {
  readonly handleBuildPlacementClick: (worldX: number, worldY: number) => boolean
  readonly groundCommand: (worldX: number, worldY: number) => void
  readonly unitCommand: (id: number) => void
  readonly autoHealTarget: (id: number) => boolean
  readonly buildingCommand: (id: number) => void
  readonly mineralCommand: (id: number) => void
  readonly mode: () => CommandMode
}

export interface WorldInteractionHandlerOptions {
  readonly controller: BuildPlacementController
  readonly updateSelection: (ids: readonly number[]) => void
  readonly selectAtWorldPoint: (x: number, y: number) => void
  readonly selectBuilding: (id: number) => void
  readonly selectMineral: (id: number) => void
  readonly selectBox: (from: WorldInteraction & { type: 'selection-end' }) => void
  readonly clearMode: () => void
  readonly updatePreview: (x: number, y: number) => void
}

function handlePrimary(
  options: WorldInteractionHandlerOptions,
  interaction: Extract<WorldInteraction, { type: 'primary-activate' }>
): void {
  const target = interaction.target
  switch (target.kind) {
    case 'unit':
      if (options.controller.autoHealTarget(target.id)) {
        return
      }
      options.clearMode()
      options.updateSelection([target.id])
      return
    case 'building':
      if (options.controller.mode() === 'attack') {
        options.controller.buildingCommand(target.id)
        return
      }
      options.clearMode()
      options.selectBuilding(target.id)
      return
    case 'mineral':
      options.clearMode()
      options.selectMineral(target.id)
      return
    case 'ground':
      if (!options.controller.handleBuildPlacementClick(target.position.x, target.position.y)) {
        options.clearMode()
        options.selectAtWorldPoint(target.position.x, target.position.y)
      }
      return
    default:
      assertNever(target, 'handlePrimary')
  }
}

function handleSecondary(
  options: WorldInteractionHandlerOptions,
  interaction: Extract<WorldInteraction, { type: 'secondary-activate' }>
): void {
  const target = interaction.target
  switch (target.kind) {
    case 'ground':
      options.controller.groundCommand(target.position.x, target.position.y)
      return
    case 'unit':
      options.controller.unitCommand(target.id)
      return
    case 'building':
      options.controller.buildingCommand(target.id)
      return
    case 'mineral':
      options.controller.mineralCommand(target.id)
      return
    default:
      assertNever(target, 'handleSecondary')
  }
}

export function createWorldInteractionHandler(
  options: WorldInteractionHandlerOptions
): (interaction: WorldInteraction) => void {
  return (interaction) => {
    switch (interaction.type) {
      case 'selection-end':
        options.selectBox(interaction)
        return
      case 'pointer-move':
        options.updatePreview(interaction.position.x, interaction.position.y)
        return
      case 'primary-activate':
        handlePrimary(options, interaction)
        return
      case 'secondary-activate':
        handleSecondary(options, interaction)
        return
      case 'selection-start':
      case 'selection-update':
      case 'cancel':
        return
      default:
        assertNever(interaction, 'createWorldInteractionHandler')
    }
  }
}
