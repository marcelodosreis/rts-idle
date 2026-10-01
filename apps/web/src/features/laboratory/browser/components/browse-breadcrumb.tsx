import { cn } from '@/shared/lib/utils'

export interface BrowseBreadcrumbProps {
  readonly parts: readonly string[]
  readonly keys: readonly string[]
  readonly hasSelection: boolean
}

/** Asset-key breadcrumb with a folder icon. */
export function BrowseBreadcrumb({ parts, keys, hasSelection }: BrowseBreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-2 text-xs">
      <svg
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      {parts.length === 0 || !hasSelection ? (
        <span className="text-muted-foreground">Select an asset</span>
      ) : (
        parts.map((part, index) => (
          <span key={keys[index] ?? part} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-muted-foreground/40">/</span>}
            <span
              className={cn(
                'truncate',
                index === parts.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {part}
            </span>
          </span>
        ))
      )}
    </div>
  )
}
