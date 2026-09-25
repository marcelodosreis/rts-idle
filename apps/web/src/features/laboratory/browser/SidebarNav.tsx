import { useMemo, useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { AssetKeyTree, groupAssets } from './asset-key-tree.js'
import type { Catalog } from './catalog.js'
import { CategoryCard } from './sidebar-category-card.js'
import type { BrowseSelection } from './use-browse.js'

export interface SidebarNavProps {
  readonly catalog: Catalog
  readonly selection: BrowseSelection
  readonly filteredKeys: readonly string[]
  readonly onPatch: (patch: Partial<BrowseSelection>) => void
  readonly onSelectKey: (key: string) => void
}

function SearchBox({ query, onQuery }: { readonly query: string; readonly onQuery: (value: string) => void }) {
  return (
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
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          aria-label="Search assets"
          className="h-8 pl-8 text-sm"
        />
      </div>
    </div>
  )
}

function CategoryList({
  catalog,
  selection,
  expanded,
  onPatch
}: {
  readonly catalog: Catalog
  readonly selection: BrowseSelection
  readonly expanded: string | null
  readonly onPatch: (patch: Partial<BrowseSelection>) => void
}) {
  return (
    <ScrollArea className="min-h-[180px] flex-[0_1_40%] border-b border-border/50">
      <div className="p-2">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Types</span>
        </div>
        <button
          type="button"
          className={
            expanded === null
              ? 'flex w-full items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-left text-sm font-medium transition-all'
              : 'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all hover:bg-muted/40'
          }
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
            onToggle={() => onPatch({ category: expanded === category.name ? null : category.name, subcategory: null })}
            subcategories={category.subcategories}
            selection={selection}
            onSelectSubcategory={(sub) => onPatch({ subcategory: sub })}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

function AssetList({
  groups,
  count,
  selection,
  focusedKey,
  onFocus,
  onSelectKey
}: {
  readonly groups: ReturnType<typeof groupAssets>
  readonly count: number
  readonly selection: BrowseSelection
  readonly focusedKey: string | null
  readonly onFocus: (key: string | null) => void
  readonly onSelectKey: (key: string) => void
}) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assets</span>
        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          {count}
        </Badge>
      </div>
      <ScrollArea className="min-h-[300px] min-w-0 flex-1">
        <div className="p-1" role="listbox" aria-label="Assets">
          {count === 0 && <div className="py-8 text-center text-sm text-muted-foreground">no assets match</div>}
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
                onFocus={onFocus}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  )
}

export function SidebarNav({ catalog, selection, filteredKeys, onPatch, onSelectKey }: SidebarNavProps) {
  const expanded = selection.category
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const selectedCategory = useMemo(
    () => catalog.categories.find((candidate) => candidate.name === selection.category) ?? null,
    [catalog, selection.category]
  )
  const groups = useMemo(() => groupAssets(filteredKeys), [filteredKeys])

  return (
    <aside
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card"
      aria-label="Asset browser"
    >
      <SearchBox query={selection.query} onQuery={(query) => onPatch({ query })} />
      <CategoryList catalog={catalog} selection={selection} expanded={expanded} onPatch={onPatch} />
      <AssetList
        groups={groups}
        count={filteredKeys.length}
        selection={selection}
        focusedKey={focusedKey}
        onFocus={setFocusedKey}
        onSelectKey={onSelectKey}
      />
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
