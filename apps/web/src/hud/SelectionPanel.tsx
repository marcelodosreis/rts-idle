import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type HudSelectionUnit, KIND_LABEL, OWNER_COLORS } from './types'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
}

/** Groups the selected units by kind for a quick "what am I controlling" hint. */
function kindSummary(selection: readonly HudSelectionUnit[]): string {
  const counts = new Map<string, number>()
  for (const unit of selection) {
    counts.set(KIND_LABEL[unit.kind], (counts.get(KIND_LABEL[unit.kind]) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, count]) => (count > 1 ? `${label} ×${count}` : label)).join(' · ')
}

function HealthBar({ unit }: { readonly unit: HudSelectionUnit }) {
  if (unit.hp === undefined || unit.maxHp === undefined || unit.maxHp <= 0) {
    return null
  }
  const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp))
  let color = 'bg-red-500'
  if (ratio > 0.5) {
    color = 'bg-emerald-500'
  } else if (ratio > 0.25) {
    color = 'bg-yellow-500'
  }
  return (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
      <div className={`h-full ${color}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  )
}

/**
 * A compact selection card: a faction-colored icon that expands to the unit's
 * details on hover, so a large selection stays scrollable and doesn't fill the
 * dock. The card color is the unit's faction (owner slot), not its class.
 */
function UnitCard({ unit }: { readonly unit: HudSelectionUnit }) {
  return (
    <div
      className={`group relative flex shrink-0 cursor-default items-center gap-2 rounded-lg border px-1.5 py-1 transition-all ${OWNER_COLORS[unit.owner] ?? 'border-border/60 bg-muted/30 text-foreground'}`}
      title={`${KIND_LABEL[unit.kind]} #${unit.id}`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background/40 text-xs font-bold">
        {KIND_LABEL[unit.kind].charAt(0)}
      </span>
      <div className="hidden min-w-0 flex-col group-hover:flex">
        <div className="truncate text-xs font-medium">
          {KIND_LABEL[unit.kind]} <span className="text-muted-foreground">#{unit.id}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">p{unit.owner}</span>
          <Badge variant={unit.moving ? 'secondary' : 'outline'} className="px-1 text-[10px]">
            {unit.moving ? 'moving' : 'idle'}
          </Badge>
        </div>
        <HealthBar unit={unit} />
      </div>
    </div>
  )
}

export function SelectionPanel({ selection }: SelectionPanelProps) {
  return (
    <Card className="flex min-h-0 w-[30rem] max-w-[42vw] flex-col overflow-hidden py-4">
      <CardHeader className="shrink-0 gap-0.5 px-4 py-0">
        <CardTitle className="text-sm">
          {selection.length === 0 ? 'No selection' : `${selection.length} selected`}
        </CardTitle>
        <CardDescription className="text-xs">
          {selection.length === 0 ? (
            'Click a unit on the battlefield to inspect it.'
          ) : (
            <span aria-live="polite">
              Controlling: <span className="font-medium text-foreground">{kindSummary(selection)}</span>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 py-0" aria-live="polite">
        {selection.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Nothing selected. Left-click a unit to see its state, then right-click to issue an order.
          </p>
        ) : (
          <div className="flex flex-wrap content-start gap-2">
            {selection.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
