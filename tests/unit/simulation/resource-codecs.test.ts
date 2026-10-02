import { describe, expect, it } from 'vitest'
import { CanonicalReader } from '../../../packages/simulation/src/canonical/reader.js'
import {
  readPlayerResources,
  readResourceCost,
  writePlayerResources,
  writeResourceCost
} from '../../../packages/simulation/src/canonical/resource-codecs.js'
import { CanonicalWriter } from '../../../packages/simulation/src/canonical/writer.js'

describe('canonical resource codecs', () => {
  it('round-trips player resources and sparse costs in RESOURCE_TYPES order', () => {
    const writer = new CanonicalWriter()
    writePlayerResources(writer, { GOLD: 4, WOOD: 9 })
    writeResourceCost(writer, { WOOD: 3 })
    const reader = new CanonicalReader(writer.toBytes())

    expect(readPlayerResources(reader)).toEqual({ GOLD: 4, WOOD: 9 })
    expect(readResourceCost(reader)).toEqual({ WOOD: 3 })
  })
})
