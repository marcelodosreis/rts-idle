import { useMemo, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import type { Catalog } from './catalog.js'
import { groupKeysByDepth } from './catalog.js'
import type { BrowseSelection } from './use-browse.js'

export interface SidebarNavProps {
  readonly catalog: Catalog
  readonly selection: BrowseSelection
  readonly filteredKeys: readonly string[]
  readonly onPatch: (patch: Partial<BrowseSelection>) => void
  readonly onSelectKey: (key: string) => void
}

/** Category metadata for visual styling. */
const CATEGORY_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  buildings: { icon: '🏛️', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  decorations: { icon: '🌿', color: 'text-green-400', bg: 'bg-green-500/10' },
  fx: { icon: '✨', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  terrain: { icon: '⛰️', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  units: { icon: '⚔️', color: 'text-red-400', bg: 'bg-red-500/10' }
}

const DEFAULT_STYLE = { icon: '📦', color: 'text-gray-400', bg: 'bg-gray-500/10' }

interface AssetGroup {
  readonly name: string
  readonly keys: readonly string[]
}

/** Groups assets by their second-level prefix for better visual organization. */
function groupAssets(keys: readonly string[]): readonly AssetGroup[] {
  const groups = new Map<string, string[]>()
  for (const key of keys) {
    const parts = key.split('.')
    const group = parts[1] ?? ''
    const list = groups.get(group)
    if (list === undefined) {
      groups.set(group, [key])
    } else {
      list.push(key)
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, groupKeys]) => ({ name, keys: groupKeys }))
}

function AssetKeyTree({
  keys,
  depth,
  selectedKey,
  focusedKey,
  onSelect,
  onFocus
}: {
  readonly keys: readonly string[]
  readonly depth: number
  readonly selectedKey: string
  readonly focusedKey: string | null
  readonly onSelect: (key: string) => void
  readonly onFocus: (key: string | null) => void
}) {
  const groups = useMemo(() => groupKeysByDepth(keys, depth), [keys, depth])

  if (groups.length === 0) {
    return (
      <>
        {keys.map((key) => {
          const isSelected = selectedKey === key
          const parts = key.split('.')
          const shortName = parts[parts.length - 1] ?? key
          const category = parts[0] ?? ''
          const style = CATEGORY_STYLES[category] ?? DEFAULT_STYLE

          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isSelected}
              ref={(el) => {
                if (isSelected && el) {
                  el.scrollIntoView({ block: 'nearest' })
                }
              }}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-all',
                isSelected
                  ? `${style.bg} font-medium text-foreground`
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                focusedKey === key && 'ring-1 ring-ring'
              )}
              onClick={() => onSelect(key)}
              onFocus={() => onFocus(key)}
              onBlur={() => onFocus(null)}
            >
              <span className={cn('text-xs', style.color)}>{style.icon}</span>
              <span className="flex-1 truncate text-[12px]">{shortName}</span>
            </button>
          )
        })}
      </>
    )
  }

  const groupedSet = new Set(groups.flatMap((g) => g.keys))

  return (
    <>
      {groups.map((group) => (
        <div key={group.name} className="ml-2 mt-0.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5">
            <span className="text-[10px] font-medium text-muted-foreground/70">{group.name}</span>
            <span className="text-[9px] tabular-nums text-muted-foreground/40">{group.keys.length}</span>
          </div>
          <AssetKeyTree
            keys={group.keys}
            depth={depth + 1}
            selectedKey={selectedKey}
            focusedKey={focusedKey}
            onSelect={onSelect}
            onFocus={onFocus}
          />
        </div>
      ))}
      {keys
        .filter((k) => !groupedSet.has(k))
        .map((key) => {
          const isSelected = selectedKey === key
          const parts = key.split('.')
          const shortName = parts[parts.length - 1] ?? key
          const category = parts[0] ?? ''
          const style = CATEGORY_STYLES[category] ?? DEFAULT_STYLE

          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isSelected}
              ref={(el) => {
                if (isSelected && el) {
                  el.scrollIntoView({ block: 'nearest' })
                }
              }}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-all',
                isSelected
                  ? `${style.bg} font-medium text-foreground`
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                focusedKey === key && 'ring-1 ring-ring'
              )}
              onClick={() => onSelect(key)}
              onFocus={() => onFocus(key)}
              onBlur={() => onFocus(null)}
            >
              <span className={cn('text-xs', style.color)}>{style.icon}</span>
              <span className="flex-1 truncate text-[12px]">{shortName}</span>
            </button>
          )
        })}
    </>
  )
}

function CategoryCard({
  name,
  count,
  isExpanded,
  onToggle,
  subcategories,
  selection,
  onSelectSubcategory
}: {
  readonly name: string
  readonly count: number
  readonly isExpanded: boolean
  readonly onToggle: () => void
  readonly subcategories: readonly { readonly name: string; readonly count: number }[]
  readonly selection: BrowseSelection
  readonly onSelectSubcategory: (sub: string | null) => void
}) {
  const style = CATEGORY_STYLES[name] ?? DEFAULT_STYLE

  return (
    <div className="mb-1">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all',
          isExpanded ? `${style.bg} font-medium` : 'hover:bg-muted/40'
        )}
        onClick={onToggle}
      >
        <span className={cn('text-base', style.color)}>{style.icon}</span>
        <span className="flex-1 capitalize">{name}</span>
        <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
          {count}
        </Badge>
        <svg
          className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {isExpanded && subcategories.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-border/30 pl-2">
          {subcategories.map((sub) => {
            const active = selection.subcategory === sub.name
            return (
              <button
                key={sub.name}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-0.5 text-left text-[12px] transition-colors',
                  active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/30'
                )}
                onClick={() => onSelectSubcategory(active ? null : sub.name)}
              >
                <span className="truncate">{sub.name}</span>
                <span className="ml-2 shrink-0 text-[10px] tabular-nums text-muted-foreground/60">{sub.count}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SidebarNav({ catalog, selection, filteredKeys, onPatch, onSelectKey }: SidebarNavProps) {
  const expanded = selection.category

  const selectedCategory = useMemo(
    () => catalog.categories.find((c) => c.name === selection.category) ?? null,
    [catalog, selection.category]
  )

  const [focusedKey, setFocusedKey] = useState<string | null>(null)

  const groups = useMemo(() => groupAssets(filteredKeys), [filteredKeys])

  return (
    <aside
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card"
      aria-label="Asset browser"
    >
      {/* Search */}
      <div className="shrink-0 border-b border-border/50 p-2.5">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <Input
            type="search"
            placeholder="Search…"
            value={selection.query}
            onChange={(e) => onPatch({ query: e.target.value })}
            aria-label="Search assets"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <ScrollArea className="min-h-[180px] flex-[0_1_40%] border-b border-border/50">
        <div className="p-2">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Types</span>
          </div>

          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all',
              expanded === null ? 'bg-muted font-medium' : 'hover:bg-muted/40'
            )}
            onClick={() => onPatch({ category: null, subcategory: null })}
          >
            <span className="text-sm">📋</span>
            <span className="flex-1">All</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
              {catalog.orderedKeys.length}
            </Badge>
          </button>

          {catalog.categories.map((category) => (
            <CategoryCard
              key={category.name}
              name={category.name}
              count={category.count}
              isExpanded={expanded === category.name}
              onToggle={() =>
                onPatch({
                  category: expanded === category.name ? null : category.name,
                  subcategory: null
                })
              }
              subcategories={category.subcategories}
              selection={selection}
              onSelectSubcategory={(sub) => onPatch({ subcategory: sub })}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Asset list header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assets</span>
        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          {filteredKeys.length}
        </Badge>
      </div>

      {/* Asset list */}
      <ScrollArea className="min-h-[300px] min-w-0 flex-1">
        <div className="p-1" role="listbox" aria-label="Assets">
          {filteredKeys.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">no assets match</div>
          )}
          {groups.map((group) => (
            <div key={group.name} className="mb-1">
              {group.keys.length > 1 && (
                <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-card/90 px-2 py-0.5 backdrop-blur-sm">
                  <span className="text-[10px] font-medium text-muted-foreground/70">{group.name}</span>
                  <span className="text-[9px] tabular-nums text-muted-foreground/40">{group.keys.length}</span>
                </div>
              )}
              <AssetKeyTree
                keys={group.keys}
                depth={2}
                selectedKey={selection.key}
                focusedKey={focusedKey}
                onSelect={onSelectKey}
                onFocus={setFocusedKey}
              />
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      {selectedCategory !== null && (
        <div className="shrink-0 border-t border-border/50 px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground">
            {selection.category}
            {selection.subcategory !== null && (
              <>
                <span className="mx-1 text-muted-foreground/40">/</span>
                {selection.subcategory}
              </>
            )}
          </span>
        </div>
      )}
    </aside>
  )
}
