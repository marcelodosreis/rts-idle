import type { WorldInteraction } from '@rts/renderer'
import { describe, expect, it, vi } from 'vitest'
import { createWorldInteractionHandler } from '../../../apps/web/src/features/match/services/create-world-interaction-handler'

function controller() {
  return {
    handleBuildPlacementClick: (): boolean => false,
    groundCommand: (): void => undefined,
    unitCommand: (): void => undefined,
    buildingCommand: (): void => undefined,
    mode: (): 'idle' => 'idle',
    resourceCommand: (): void => undefined
  }
}

describe('createWorldInteractionHandler', () => {
  it('clears an armed command when a primary ground click changes selection', () => {
    const clearMode = vi.fn()
    const selectAtWorldPoint = vi.fn()
    const handler = createWorldInteractionHandler({
      controller: controller(),
      updateSelection: vi.fn(),
      selectAtWorldPoint,
      selectBuilding: vi.fn(),
      selectResource: vi.fn(),
      selectBox: vi.fn(),
      clearMode,
      updatePreview: vi.fn()
    })

    handler({
      type: 'primary-activate',
      target: { kind: 'ground', position: { x: 4, y: 7 } }
    } satisfies WorldInteraction)

    expect(clearMode).toHaveBeenCalledOnce()
    expect(selectAtWorldPoint).toHaveBeenCalledWith(4, 7)
  })

  it('selects a unit on a primary click without issuing a heal command', () => {
    const updateSelection = vi.fn()
    const clearMode = vi.fn()
    const handler = createWorldInteractionHandler({
      controller: controller(),
      updateSelection,
      selectAtWorldPoint: vi.fn(),
      selectBuilding: vi.fn(),
      selectResource: vi.fn(),
      selectBox: vi.fn(),
      clearMode,
      updatePreview: vi.fn()
    })

    handler({
      type: 'primary-activate',
      target: { kind: 'unit', id: 5 }
    } satisfies WorldInteraction)

    expect(clearMode).toHaveBeenCalledOnce()
    expect(updateSelection).toHaveBeenCalledWith([5])
  })

  it('routes a secondary unit click to the contextual command handler', () => {
    const unitCommand = vi.fn()
    const handler = createWorldInteractionHandler({
      controller: { ...controller(), unitCommand },
      updateSelection: vi.fn(),
      selectAtWorldPoint: vi.fn(),
      selectBuilding: vi.fn(),
      selectResource: vi.fn(),
      selectBox: vi.fn(),
      clearMode: vi.fn(),
      updatePreview: vi.fn()
    })

    handler({
      type: 'secondary-activate',
      target: { kind: 'unit', id: 5 }
    } satisfies WorldInteraction)

    expect(unitCommand).toHaveBeenCalledWith(5)
  })
})
