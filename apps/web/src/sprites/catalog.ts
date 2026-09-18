import type { AssetEntry } from '@rts/shared'

/**
 * Manifest-derived catalog for the sprite lab browser. Groups every asset key
 * into stable categories and subcategories derived from the key's dot-prefix,
 * so nothing in the manifest is ever hidden from the UI (including unique
 * assets like rock1, rubber_duck, or resource stumps).
 */

export interface CatalogCategory {
  readonly name: string
  readonly subcategories: readonly CatalogSubcategory[]
  readonly count: number
}

export interface CatalogSubcategory {
  readonly name: string
  readonly keys: readonly string[]
  readonly count: number
}

export interface Catalog {
  readonly categories: readonly CatalogCategory[]
  readonly entries: ReadonlyMap<string, AssetEntry>
  /** Stable ordering used by prev/next navigation. */
  readonly orderedKeys: readonly string[]
}

/** Splits a key into its category/subcategory prefixes (e.g. `terrain`, `decorations`). */
function splitKey(key: string): { readonly category: string; readonly subcategory: string } {
  const parts = key.split('.')
  return { category: parts[0] ?? '', subcategory: parts[1] ?? '' }
}

/** Builds the catalog from a key→entry map. Pure; no DOM or I/O. */
export function buildCatalog(assets: ReadonlyMap<string, AssetEntry>): Catalog {
  const orderedKeys = [...assets.keys()].sort()
  const byCategory = new Map<string, Map<string, string[]>>()
  for (const key of orderedKeys) {
    const { category, subcategory } = splitKey(key)
    let subs = byCategory.get(category)
    if (subs === undefined) {
      subs = new Map()
      byCategory.set(category, subs)
    }
    const list = subs.get(subcategory)
    if (list === undefined) {
      subs.set(subcategory, [key])
    } else {
      list.push(key)
    }
  }

  const categories: CatalogCategory[] = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, subs]) => {
      const subcategories = [...subs.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sub, keys]) => ({ name: sub, keys: [...keys], count: keys.length }))
      return {
        name,
        subcategories,
        count: subcategories.reduce((total, sub) => total + sub.count, 0)
      }
    })

  return { categories, entries: assets, orderedKeys }
}

/** Filters the catalog keys by a case-insensitive substring query. */
export function searchKeys(orderedKeys: readonly string[], query: string): readonly string[] {
  const q = query.trim().toLowerCase()
  if (q === '') {
    return orderedKeys
  }
  return orderedKeys.filter((key) => key.toLowerCase().includes(q))
}
