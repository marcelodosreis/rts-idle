import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from './asset-key-tree.js'
import type { BrowseSelection } from './use-browse.js'

export interface CategoryCardProps {
  readonly name: string
  readonly count: number
  readonly isExpanded: boolean
  readonly onToggle: () => void
  readonly subcategories: readonly { readonly name: string; readonly count: number }[]
  readonly selection: BrowseSelection
  readonly onSelectSubcategory: (sub: string | null) => void
}

function SubcategoryList({
  subcategories,
  selection,
  onSelectSubcategory
}: Pick<CategoryCardProps, 'subcategories' | 'selection' | 'onSelectSubcategory'>) {
  return (
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
  )
}

/** Expandable category with its subcategory filter list. */
export function CategoryCard({
  name,
  count,
  isExpanded,
  onToggle,
  subcategories,
  selection,
  onSelectSubcategory
}: CategoryCardProps) {
  const style = CATEGORY_STYLES[name] ?? DEFAULT_CATEGORY_STYLE
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
        <SubcategoryList
          subcategories={subcategories}
          selection={selection}
          onSelectSubcategory={onSelectSubcategory}
        />
      )}
    </div>
  )
}
