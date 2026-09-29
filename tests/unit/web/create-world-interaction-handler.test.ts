import type { WorldInteraction } from '@rts/renderer'
import { describe, expect, it, vi } from 'vitest'
import { createWorldInteractionHandler } from '../../../apps/web/src/features/match/selection/create-world-interaction-handler.js'

describe('createWorldInteractionHandler', () => {
  it('clears an armed command when a primary ground click changes selection', () => {
    const clearMode = vi.fn()
    const selectAtWorldPoint = vi.fn()
    const handler = createWorldInteractionHandler({
      controller: { handleBuildPlacementClick: () => false },
      updateSelection: vi.fn(),
      selectAtWorldPoint,
      selectBuilding: vi.fn(),
      selectMineral: vi.fn(),
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
})
