import type { AssetEntry } from '@rts/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLabContext } from '../shared/lab-context'
import { DEFAULT_OPTIONS, type RenderOptions } from './canvas.js'
import { buildCatalog, type Catalog, searchKeys } from './catalog.js'

export interface BrowseSelection {
  readonly category: string | null
  readonly subcategory: string | null
  readonly query: string
  readonly key: string
}

const EMPTY_SELECTION: BrowseSelection = { category: null, subcategory: null, query: '', key: '' }

function catalogFromAssets(assets: { keys(): Iterable<string>; entry(key: string): AssetEntry | null }): Catalog {
  const entries = new Map<string, AssetEntry>()
  for (const key of assets.keys()) {
    const entry = assets.entry(key)
    if (entry !== null) {
      entries.set(key, entry)
    }
  }
  return buildCatalog(entries)
}

/** Keys in the current category/subcategory, then filtered by the query. */
function keysForSelection(catalog: Catalog, selection: BrowseSelection): readonly string[] {
  if (selection.category === null) {
    return searchKeys(catalog.orderedKeys, selection.query)
  }
  const category = catalog.categories.find((candidate) => candidate.name === selection.category)
  const keys =
    category?.subcategories
      .filter((sub) => selection.subcategory === null || sub.name === selection.subcategory)
      .flatMap((sub) => sub.keys) ?? []
  return searchKeys(keys, selection.query)
}

function typeKey(selection: BrowseSelection): string {
  return `${selection.category ?? ''}\u0000${selection.subcategory ?? ''}`
}

/**
 * React state + derivations for the unified browser: the catalog, the current
 * selection, the render options, and the filtered key list (single source of
 * truth for the sidebar, breadcrumb, prev/next and position readout).
 */
export function useBrowse() {
  const ctx = useLabContext()
  const catalog = useMemo(() => catalogFromAssets(ctx.assets), [ctx])
  const [selection, setSelection] = useState<BrowseSelection>(EMPTY_SELECTION)
  const [options, setOptions] = useState<RenderOptions>({ ...DEFAULT_OPTIONS })
  const [summary, setSummary] = useState('select an asset')

  const patchSelection = useCallback((patch: Partial<BrowseSelection>): void => {
    setSelection((prev) => ({ ...prev, ...patch }))
  }, [])

  const patchOptions = useCallback((patch: Partial<RenderOptions>): void => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  const filteredKeys = useMemo(() => keysForSelection(catalog, selection), [catalog, selection])
  useAutoSelectFirstAsset(filteredKeys, selection, setSelection)

  return {
    ctx,
    catalog,
    selection,
    setSelection,
    patchSelection,
    options,
    setOptions,
    patchOptions,
    summary,
    setSummary,
    filteredKeys
  }
}

export type BrowseState = ReturnType<typeof useBrowse>

/**
 * Auto-selects the first asset whenever the selected type changes (including
 * mount) so the canvas is never empty. The type guard keeps query edits from
 * hijacking the current selection.
 */
function useAutoSelectFirstAsset(
  filteredKeys: readonly string[],
  selection: BrowseSelection,
  setSelection: (updater: (prev: BrowseSelection) => BrowseSelection) => void
): void {
  const typeRef = useRef('')
  useEffect(() => {
    const type = typeKey(selection)
    if (typeRef.current === type) {
      return
    }
    typeRef.current = type
    const first = filteredKeys[0]
    if (first === undefined) {
      return
    }
    if (selection.key !== '' && filteredKeys.includes(selection.key)) {
      return
    }
    setSelection((prev) => (prev.key === first ? prev : { ...prev, key: first }))
  }, [filteredKeys, selection, setSelection])
}
