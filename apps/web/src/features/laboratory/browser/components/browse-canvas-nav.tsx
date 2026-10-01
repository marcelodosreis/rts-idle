import { Button } from '@/shared/ui/button'

export interface BrowseCanvasNavProps {
  readonly position: string
  readonly hasSelection: boolean
  readonly onStep: (delta: number) => void
}

function Chevron({ points }: { readonly points: string }) {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polyline points={points} />
    </svg>
  )
}

/** Prev/next asset navigation strip below the canvas. */
export function BrowseCanvasNav({ position, hasSelection, onStep }: BrowseCanvasNavProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
      <Button variant="ghost" size="sm" onClick={() => onStep(-1)} disabled={!hasSelection} className="gap-1 text-xs">
        <Chevron points="15 18 9 12 15 6" />
        Prev
      </Button>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{position}</span>
      <Button variant="ghost" size="sm" onClick={() => onStep(1)} disabled={!hasSelection} className="gap-1 text-xs">
        Next
        <Chevron points="9 18 15 12 9 6" />
      </Button>
    </div>
  )
}
