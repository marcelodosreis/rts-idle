import type { AssetEntry } from '@rts/shared'
import { useCallback, useMemo, useState } from 'react'
import { buildCatalog, type Catalog, searchKeys } from '../catalog.js'
import { useLabContext } from '../lab-context'
import { DEFAULT_OPTIONS, type RenderOptions } from './canvas.js'

export interface BrowseSelection {
  readonly category: string | null
  readonly subcategory: string | null
  readonly query: string
  readonly key: string
}

/**
 * React state + derivations for the unified browser: the catalog, the current
 * selection, the render options, and the filtered key list (single source of
 * truth for the sidebar, breadcrumb, prev/next and position readout).
 */
export function useBrowse() {
  const ctx = useLabContext()

  const catalog: Catalog = useMemo(() => {
    const assets = new Map<string, AssetEntry>()
    for (const key of ctx.assets.keys()) {
      const entry = ctx.assets.entry(key)
      if (entry !== null) {
        assets.set(key, entry)
      }
    }
    return buildCatalog(assets)
  }, [ctx])

  const [selection, setSelection] = useState<BrowseSelection>({
    category: null,
    subcategory: null,
    query: '',
    key: ''
  })

  const [options, setOptions] = useState<RenderOptions>({ ...DEFAULT_OPTIONS })
  const [summary, setSummary] = useState('select an asset')

  const patchSelection = useCallback((patch: Partial<BrowseSelection>): void => {
    setSelection((prev) => ({ ...prev, ...patch }))
  }, [])

  const patchOptions = useCallback((patch: Partial<RenderOptions>): void => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  /** Keys in the current category/subcategory, then filtered by the query. */
  const filteredKeys: readonly string[] = useMemo(() => {
    let keys: readonly string[] = catalog.orderedKeys
    if (selection.category !== null) {
      const category = catalog.categories.find((c) => c.name === selection.category)
      keys =
        category?.subcategories
          .filter((s) => selection.subcategory === null || s.name === selection.subcategory)
          .flatMap((s) => s.keys) ?? []
    }
    return searchKeys(keys, selection.query)
  }, [catalog, selection.category, selection.subcategory, selection.query])

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
