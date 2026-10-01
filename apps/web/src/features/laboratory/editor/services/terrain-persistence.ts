import { type MapDefinition, normalizeMapDefinition } from '@rts/shared'

/** LocalStorage key for the editor's debounced autosave. */
export const EDITOR_STORAGE_KEY = 'rts.editorLevel'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface ParseResult {
  readonly ok: boolean
  readonly map?: MapDefinition
  readonly errors: readonly string[]
}

/** Parses untrusted JSON text into a validated `MapDefinition`. */
export function parseMapJson(text: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['not valid JSON'] }
  }
  const result = normalizeMapDefinition(value)
  if (result.ok) {
    return { ok: true, map: result.map, errors: [] }
  }
  return { ok: false, errors: result.errors }
}

/** Debounced-autosave writer for the current editor map. */
export function saveEditorMap(storage: StorageLike, map: MapDefinition): void {
  storage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(map))
}

/** Restores the autosaved map, or `null` when absent or invalid. */
export function loadEditorMap(storage: StorageLike): MapDefinition | null {
  const raw = storage.getItem(EDITOR_STORAGE_KEY)
  if (raw === null) {
    return null
  }
  const result = parseMapJson(raw)
  return result.ok && result.map !== undefined ? result.map : null
}

/** Triggers a `.json` download of the map in the browser. */
export function downloadMapJson(map: MapDefinition, filename = 'map.json'): void {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next task so the browser can start the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
