import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type HudSelectionUnit, KIND_LABEL } from './types'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
}

export function SelectionPanel({ selection }: SelectionPanelProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden py-4">
      <CardHeader className="shrink-0 gap-0.5 px-4 py-0">
        <CardTitle className="text-sm">
          {selection.length === 0 ? 'No selection' : `${selection.length} selected`}
        </CardTitle>
        <CardDescription className="text-xs">
          {selection.length === 0 ? 'Click a unit on the battlefield to inspect it.' : 'Selected unit details'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 py-0" aria-live="polite">
        {selection.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nothing selected. Left-click a unit to see its state, then right-click to issue a move order.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selection.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {KIND_LABEL[unit.kind].charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {KIND_LABEL[unit.kind]} <span className="text-muted-foreground">#{unit.id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">player {unit.owner}</div>
                </div>
                <Badge variant={unit.moving ? 'secondary' : 'outline'}>{unit.moving ? 'moving' : 'idle'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
