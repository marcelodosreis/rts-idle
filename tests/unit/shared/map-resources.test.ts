import { FIXED_SCALE, normalizeMapDefinition, placementBoundsFromMap, validateBuildingPlacement } from '@rts/shared'
import { describe, expect, it } from 'vitest'

const TREE = {
  resourceId: 1,
  kind: 'TREE' as const,
  resourceType: 'WOOD' as const,
  x: FIXED_SCALE,
  y: FIXED_SCALE,
  variant: 0,
  initialAmount: 30,
  harvestAmount: 10,
  harvestTicks: 200,
  blocksNavigation: false
}

function mapWith(resource: object, tiles = ['land', 'land', 'land', 'land']): object {
  return { width: 2, height: 2, tiles, resources: [resource] }
}

describe('resource map validation', () => {
  it('accepts a tree on land and reserves its tile for construction', () => {
    const normalized = normalizeMapDefinition(mapWith(TREE))
    expect(normalized.ok).toBe(true)
    if (!normalized.ok) {
      return
    }

    const bounds = placementBoundsFromMap(normalized.map)
    expect(bounds.invalidTiles).toContainEqual({ x: 1, y: 1 })
    expect(validateBuildingPlacement(bounds, [], { x: 1, y: 1, width: 1, height: 1 })).toEqual({
      ok: false,
      reason: 'INVALID_TILE'
    })
  })

  it.each([
    ['water', mapWith(TREE, ['land', 'land', 'land', 'water'])],
    ['outside', mapWith({ ...TREE, x: 2 * FIXED_SCALE })],
    ['duplicate tile', mapWith({ ...TREE, resourceId: 2 })]
  ])('rejects invalid resource placement: %s', (_reason, value) => {
    const input = _reason === 'duplicate tile' ? { ...value, resources: [TREE, { ...TREE, resourceId: 2 }] } : value
    expect(normalizeMapDefinition(input).ok).toBe(false)
  })
})
