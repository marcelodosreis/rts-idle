import { UINT32_MAX } from '@rts/shared'
import { describe, expect, it } from 'vitest'
import { CanonicalReader } from '../../../packages/simulation/src/canonical/reader.js'
import {
  readPlayerResources,
  readResourceCost,
  writePlayerResources,
  writeResourceCost
} from '../../../packages/simulation/src/canonical/resource-codecs.js'
import { CanonicalWriter } from '../../../packages/simulation/src/canonical/writer.js'
import { ResourceCatalog } from '../../../packages/simulation/src/resources/resource-catalog.js'

describe('canonical resource codecs', () => {
  it('rejects canonical i32 overflow instead of truncating it', () => {
    const writer = new CanonicalWriter()

    writer.writeI32(-2_147_483_648)
    writer.writeI32(2_147_483_647)

    expect(() => writer.writeI32(-2_147_483_649)).toThrow(/signed 32-bit integer/)
    expect(() => writer.writeI32(2_147_483_648)).toThrow(/signed 32-bit integer/)
  })

  it('rejects canonical u32 overflow instead of truncating it', () => {
    const writer = new CanonicalWriter()

    writer.writeU32(0)
    writer.writeU32(UINT32_MAX)

    expect(() => writer.writeU32(-1)).toThrow(/unsigned 32-bit integer/)
    expect(() => writer.writeU32(UINT32_MAX + 1)).toThrow(/unsigned 32-bit integer/)
    expect(() => writer.writeU32(2 ** 40)).toThrow(/unsigned 32-bit integer/)
    expect(() => writer.writeU32(1.5)).toThrow(/unsigned 32-bit integer/)
    expect(writer.toBytes()).toHaveLength(8)
  })

  it('rejects resource ids outside the canonical u32 range before catalog creation', () => {
    const definition = {
      kind: 'TREE' as const,
      x: 0,
      y: 0,
      variant: 0,
      initialAmount: 1,
      harvestAmount: 1,
      harvestTicks: 1,
      blocksNavigation: false
    }

    expect(() => new ResourceCatalog([{ ...definition, resourceId: UINT32_MAX }])).not.toThrow()
    expect(() => new ResourceCatalog([{ ...definition, resourceId: UINT32_MAX + 1 }])).toThrow(
      /unsigned 32-bit integer/
    )
    expect(() => new ResourceCatalog([{ ...definition, resourceId: -1 }])).toThrow(/unsigned 32-bit integer/)
    expect(() => new ResourceCatalog([{ ...definition, resourceId: 2 ** 40 }])).toThrow(/unsigned 32-bit integer/)
  })

  it('round-trips player resources and sparse costs in RESOURCE_TYPES order', () => {
    const writer = new CanonicalWriter()
    writePlayerResources(writer, { GOLD: 4, WOOD: 9 })
    writeResourceCost(writer, { WOOD: 3 })
    const reader = new CanonicalReader(writer.toBytes())

    expect(readPlayerResources(reader)).toEqual({ GOLD: 4, WOOD: 9 })
    expect(readResourceCost(reader)).toEqual({ WOOD: 3 })
  })
})
