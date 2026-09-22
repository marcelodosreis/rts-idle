import type { AssetEntry } from '@rts/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  // Auto-select the first asset of the list whenever the selected type
  // (category/subcategory) changes, including the initial mount, so the canvas
  // is never left empty. The type guard keeps query edits from hijacking the
  // current selection.
  const typeRef = useRef('')
  useEffect(() => {
    const type = `${selection.category ?? ''}\u0000${selection.subcategory ?? ''}`
    if (typeRef.current === type) {
      return
    }
    typeRef.current = type
    const first = filteredKeys[0]
    if (first === undefined) {
      return
    }
    setSelection((prev) => (prev.key === first ? prev : { ...prev, key: first }))
  }, [filteredKeys, selection.category, selection.subcategory])

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
