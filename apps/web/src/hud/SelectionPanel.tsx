import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

function economyLabel(unit: HudSelectionUnit): string | null {
  if (unit.economy === undefined) {
    return null
  }
  if (unit.economy.phase === 'gathering') {
    return `Mining ${unit.economy.progressTicks}/${unit.economy.progressMax}`
  }
  if (unit.economy.phase === 'to_base') {
    return `Returning ${unit.economy.cargoAmount}/${unit.economy.cargoCapacity}`
  }
  if (unit.economy.phase === 'to_node') {
    return 'Going to mineral'
  }
  return `Waiting for Base ${unit.economy.cargoAmount}/${unit.economy.cargoCapacity}`
}

function UnitChip({ unit }: { readonly unit: HudSelectionUnit }) {
  const hasHp = unit.hp !== undefined && unit.maxHp !== undefined && unit.maxHp > 0
  const ratio = hasHp ? Math.max(0, Math.min(1, unit.hp! / unit.maxHp!)) : 0
  const hpPercent = Math.round(ratio * 100)
  const unitLabel = `${KIND_LABEL[unit.kind]} #${unit.id}`
  const economyText = economyLabel(unit)

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <button
          type="button"
          className={`flex cursor-help flex-col items-center rounded border-0 px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring ${OWNER_COLORS[unit.owner] ?? 'bg-muted/30 text-foreground'}`}
          aria-label={`${unitLabel}, owner ${unit.owner}, ${economyText ?? (unit.moving ? 'moving' : 'idle')}${hasHp ? `, ${hpPercent}% health` : ''}`}
        >
          <span className="text-[11px] font-bold leading-none">{KIND_LABEL[unit.kind].charAt(0)}</span>
          {hasHp && (
            <div className="mt-0.5 h-0.5 w-5 overflow-hidden rounded-full bg-black/30">
              <div className={`h-full ${hpColor(ratio)}`} style={{ width: `${hpPercent}%` }} />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="space-y-0.5">
        <p className="font-semibold">{unitLabel}</p>
        <p>Owner: P{unit.owner}</p>
        <p>Status: {economyText ?? (unit.moving ? 'Moving' : 'Idle')}</p>
        {unit.economy !== undefined && (
          <div className="space-y-0.5">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full ${unit.economy.phase === 'gathering' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{
                  width: `${Math.round(
                    100 *
                      (unit.economy.phase === 'gathering'
                        ? unit.economy.progressTicks / Math.max(1, unit.economy.progressMax)
                        : unit.economy.cargoAmount / Math.max(1, unit.economy.cargoCapacity))
                  )}%`
                }}
              />
            </div>
            <p>{economyText}</p>
          </div>
        )}
        {hasHp && (
          <p>
            HP: {unit.hp}/{unit.maxHp} ({hpPercent}%)
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export function SelectionPanel({ selection }: SelectionPanelProps) {
  const activeEconomy = selection.map(economyLabel).find((label) => label !== null) ?? null
  return (
    <Card className="flex min-h-0 w-full max-w-[22rem] flex-col overflow-hidden py-1">
      <CardHeader className="shrink-0 gap-0.5 px-2 py-0">
        <CardTitle className="truncate text-[11px] text-muted-foreground">
          {selection.length === 0 ? 'No selection — click a unit' : `${selection.length} · ${kindSummary(selection)}`}
        </CardTitle>
        <p data-testid="economy-status" className="h-4 truncate text-[11px] font-medium text-amber-300 empty:invisible">
          {activeEconomy}
        </p>
      </CardHeader>
      <CardContent className="flex flex-nowrap gap-0.5 overflow-x-auto px-2 py-0.5" aria-live="polite">
        {selection.length > 0 && selection.map((unit) => <UnitChip key={unit.id} unit={unit} />)}
      </CardContent>
    </Card>
  )
}
