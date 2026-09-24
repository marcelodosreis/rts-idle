import { type MapDefinition, normalizeMapDefinition } from '@rts/shared'

/** LocalStorage key holding the map the editor hands to the game. */
export const PLAYTEST_STORAGE_KEY = 'rts.playtestMap'

export interface StorageReader {
  getItem(key: string): string | null
}

export interface StorageWriter {
  setItem(key: string, value: string): void
}

/**
 * Loads the authored map when the URL requests `?map=local`. Returns `null`
 * for any other URL, missing storage, invalid JSON, or a map that fails
 * validation, so the caller can fall back to the competitive map.
 */
export function readPlaytestMap(search: string, storage: StorageReader): MapDefinition | null {
  if (new URLSearchParams(search).get('map') !== 'local') {
    return null
  }
  const raw = storage.getItem(PLAYTEST_STORAGE_KEY)
  if (raw === null) {
    return null
  }
  try {
    const result = normalizeMapDefinition(JSON.parse(raw))
    return result.ok ? result.map : null
  } catch {
    return null
  }
}

/** Persists the current map for the `?map=local` playtest bridge. */
export function writePlaytestMap(storage: StorageWriter, map: MapDefinition): void {
  storage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(map))
}
