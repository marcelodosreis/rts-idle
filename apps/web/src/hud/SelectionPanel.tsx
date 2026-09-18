import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type HudSelectionUnit, KIND_LABEL, OWNER_COLORS } from './types'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
}

function kindSummary(selection: readonly HudSelectionUnit[]): string {
  const counts = new Map<string, number>()
  for (const unit of selection) {
    counts.set(KIND_LABEL[unit.kind], (counts.get(KIND_LABEL[unit.kind]) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, count]) => (count > 1 ? `${label} ×${count}` : label)).join(' · ')
}

function hpColor(ratio: number): string {
  if (ratio > 0.5) {
    return 'bg-emerald-500'
  }
  if (ratio > 0.25) {
    return 'bg-yellow-500'
  }
  return 'bg-red-500'
}

function UnitChip({ unit }: { readonly unit: HudSelectionUnit }) {
  const hasHp = unit.hp !== undefined && unit.maxHp !== undefined && unit.maxHp > 0
  const ratio = hasHp ? Math.max(0, Math.min(1, unit.hp! / unit.maxHp!)) : 0
  return (
    <div
      className={`flex flex-col items-center rounded px-1 py-0.5 ${OWNER_COLORS[unit.owner] ?? 'bg-muted/30 text-foreground'}`}
      title={`${KIND_LABEL[unit.kind]} #${unit.id} p${unit.owner} ${unit.moving ? 'moving' : 'idle'}`}
    >
      <span className="text-[11px] font-bold leading-none">{KIND_LABEL[unit.kind].charAt(0)}</span>
      {hasHp && (
        <div className="mt-0.5 h-0.5 w-5 overflow-hidden rounded-full bg-black/30">
          <div className={`h-full ${hpColor(ratio)}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export function SelectionPanel({ selection }: SelectionPanelProps) {
  return (
    <Card className="flex min-h-0 w-[22rem] max-w-[34vw] flex-col overflow-hidden py-1">
      <CardHeader className="shrink-0 gap-0 px-2 py-0">
        <CardTitle className="text-[11px] text-muted-foreground">
          {selection.length === 0 ? 'No selection — click a unit' : `${selection.length} · ${kindSummary(selection)}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-0.5 px-2 py-0.5" aria-live="polite">
        {selection.length > 0 && selection.map((unit) => <UnitChip key={unit.id} unit={unit} />)}
      </CardContent>
    </Card>
  )
}
