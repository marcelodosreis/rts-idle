import type { MapDefinition } from '@rts/game-data'
import { describe, expect, it } from 'vitest'
import {
  EDITOR_STORAGE_KEY,
  loadEditorMap,
  parseMapJson,
  saveEditorMap
} from '../../apps/web/src/sprites/tabs/terrain-persistence.js'

const MAP: MapDefinition = {
  width: 2,
  height: 2,
  tiles: ['water', 'water', 'water', 'land'],
  decorations: [{ x: 1, y: 1, kind: 'tree', variant: 2 }],
  decorationCounts: { bush: 3 }
}

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value)
    },
    removeItem: (key: string): void => {
      data.delete(key)
    }
  }
}

describe('parseMapJson', () => {
  it('accepts a valid map', () => {
    const result = parseMapJson(JSON.stringify(MAP))
    expect(result.ok).toBe(true)
    expect(result.map).toEqual(MAP)
  })

  it('reports non-JSON input', () => {
    expect(parseMapJson('nope').errors).toEqual(['not valid JSON'])
  })

  it('reports schema errors', () => {
    const result = parseMapJson(JSON.stringify({ width: 0 }))
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('editor autosave', () => {
  it('saves and restores a map', () => {
    const storage = fakeStorage()
    saveEditorMap(storage, MAP)
    expect(storage.getItem(EDITOR_STORAGE_KEY)).not.toBeNull()
    expect(loadEditorMap(storage)).toEqual(MAP)
  })

  it('returns null when nothing is saved or the saved map is invalid', () => {
    expect(loadEditorMap(fakeStorage())).toBeNull()
    expect(loadEditorMap(fakeStorage({ [EDITOR_STORAGE_KEY]: '{"width":0}' }))).toBeNull()
  })
})
