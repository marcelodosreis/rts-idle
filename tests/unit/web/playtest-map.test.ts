import type { MapDefinition } from '@rts/game-data'
import { describe, expect, it } from 'vitest'
import {
  PLAYTEST_STORAGE_KEY,
  readPlaytestMap,
  writePlaytestMap
} from '../../../apps/web/src/shared/config/playtest-map.js'

function fakeStorage(initial: ReadonlyMap<string, string> = new Map()) {
  const data = new Map(initial)
  return {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value)
    }
  }
}

const MAP: MapDefinition = { width: 1, height: 1, tiles: ['land'] }

describe('playtest map bridge', () => {
  it('returns null unless the URL requests ?map=local', () => {
    const storage = fakeStorage(new Map([[PLAYTEST_STORAGE_KEY, JSON.stringify(MAP)]]))
    expect(readPlaytestMap('', storage)).toBeNull()
    expect(readPlaytestMap('?scenario=8v8', storage)).toBeNull()
  })

  it('reads and validates the stored map', () => {
    const storage = fakeStorage(new Map([[PLAYTEST_STORAGE_KEY, JSON.stringify(MAP)]]))
    expect(readPlaytestMap('?map=local', storage)).toEqual(MAP)
  })

  it('returns null for missing, invalid, or malformed data', () => {
    expect(readPlaytestMap('?map=local', fakeStorage())).toBeNull()
    expect(readPlaytestMap('?map=local', fakeStorage(new Map([[PLAYTEST_STORAGE_KEY, '{oops']])))).toBeNull()
    expect(
      readPlaytestMap('?map=local', fakeStorage(new Map([[PLAYTEST_STORAGE_KEY, JSON.stringify({ width: 0 })]])))
    ).toBeNull()
  })

  it('writes the map under the playtest key', () => {
    const storage = fakeStorage()
    writePlaytestMap(storage, MAP)
    expect(readPlaytestMap('?map=local', storage)).toEqual(MAP)
  })
})
