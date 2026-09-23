import type { WorldInteraction } from '@rts/renderer'
import type { MatchInteractionController } from './match-interaction-controller'

export interface WorldInteractionHandlerOptions {
  readonly controller: MatchInteractionController
  readonly updateSelection: (ids: readonly number[]) => void
  readonly selectAtWorldPoint: (x: number, y: number) => void
  readonly selectBuilding: (id: number) => void
  readonly selectMineral: (id: number) => void
  readonly selectBox: (from: WorldInteraction & { type: 'selection-end' }) => void
  readonly updatePreview: (x: number, y: number) => void
}

export function createWorldInteractionHandler(
  options: WorldInteractionHandlerOptions
): (interaction: WorldInteraction) => void {
  const handlePrimary = (interaction: Extract<WorldInteraction, { type: 'primary-activate' }>): void => {
    const target = interaction.target
    if (target.kind === 'unit') {
      options.updateSelection([target.id])
    } else if (target.kind === 'building') {
      options.selectBuilding(target.id)
    } else if (target.kind === 'mineral') {
      options.selectMineral(target.id)
    } else if (!options.controller.handleBuildPlacementClick(target.position.x, target.position.y)) {
      options.selectAtWorldPoint(target.position.x, target.position.y)
    }
  }

  const handleSecondary = (interaction: Extract<WorldInteraction, { type: 'secondary-activate' }>): void => {
    const target = interaction.target
    if (target.kind === 'ground') {
      options.controller.groundCommand(target.position.x, target.position.y)
    } else if (target.kind === 'unit') {
      options.controller.unitCommand(target.id)
    } else if (target.kind === 'building') {
      options.controller.buildingCommand(target.id)
    } else {
      options.controller.mineralCommand(target.id)
    }
  }

  return (interaction) => {
    if (interaction.type === 'selection-end') {
      options.selectBox(interaction)
    } else if (interaction.type === 'pointer-move') {
      options.updatePreview(interaction.position.x, interaction.position.y)
    } else if (interaction.type === 'primary-activate') {
      handlePrimary(interaction)
    } else if (interaction.type === 'secondary-activate') {
      handleSecondary(interaction)
    }
  }
}
