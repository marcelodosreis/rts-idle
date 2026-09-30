import { Gem, Hammer } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { constructionStatusLine, mineralRemainingLine } from '../selection/selection-panel-logic'
import { ProductionPanel } from './ProductionPanel'
import type { HudConstruction, HudMineral, HudSelectionUnit } from './types'
import { UnitSelectionCard } from './UnitSelectionCard'

export { constructionStatusLine, mineralRemainingLine } from '../selection/selection-panel-logic'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly mineral: HudMineral | null
  readonly humanPlayer: number
}

function percentage(value: number, maximum: number): number {
  return Math.round((100 * Math.max(0, Math.min(value, maximum))) / Math.max(1, maximum))
}

function constructionLabel(construction: HudConstruction): string {
  if (construction.buildingType === 'CASTLE') {
    return `Castle ${construction.tier === 2 ? 'II' : 'I'}`
  }
  if (construction.buildingType === 'BARRACKS') {
    return 'Barracks'
  }
  if (construction.buildingType === 'ARCHERY') {
    return 'Archery'
  }
  if (construction.buildingType === 'MONASTERY') {
    return 'Monastery'
  }
  if (construction.buildingType === 'HOUSE') {
    return 'House'
  }
  return 'Tower'
}

function constructionStatus(construction: HudConstruction): string {
  if (construction.tierUpgrade !== undefined && construction.tierUpgrade !== null) {
    return 'Upgrading'
  }
  if (construction.status === 'COMPLETED') {
    return 'Ready'
  }
  if (construction.status === 'PAUSED') {
    return 'Paused'
  }
  if (construction.status === 'UNDER_CONSTRUCTION') {
    return 'Under construction'
  }
  return 'Foundation'
}

function HealthStatus({
  current,
  maximum,
  label
}: {
  readonly current: number
  readonly maximum: number
  readonly label: string
}) {
  const value = percentage(current, maximum)
  return (
    <div className="space-y-0.5" data-testid="construction-health">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {current}/{maximum}
        </span>
      </div>
      <Progress
        value={value}
        aria-label={`${label}: ${current} of ${maximum}`}
        className="h-1.5 [&>[data-slot=progress-indicator]]:bg-emerald-500"
      />
    </div>
  )
}

function ConstructionProgress({ construction }: { readonly construction: HudConstruction }) {
  const upgrade = construction.tierUpgrade
  const progress = upgrade ?? { progressTicks: construction.progressTicks, totalTicks: construction.totalTicks }
  if (construction.status === 'COMPLETED' && (upgrade === undefined || upgrade === null)) {
    return null
  }
  const value = percentage(progress.progressTicks, progress.totalTicks)
  return (
    <div className="space-y-0.5" data-testid="construction-progress-bar">
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{upgrade === undefined || upgrade === null ? 'Construction' : 'Castle II upgrade'}</span>
        <span className="tabular-nums" data-testid="construction-status">
          {value}%
        </span>
      </div>
      <Progress value={value} aria-label={`${constructionLabel(construction)} progress`} className="h-1.5" />
    </div>
  )
}

function ConstructionContext({
  construction,
  humanPlayer
}: {
  readonly construction: HudConstruction
  readonly humanPlayer: number
}) {
  const completed = construction.status === 'COMPLETED'
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden" data-testid="construction-panel">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-muted/40">
          <Hammer className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{constructionLabel(construction)}</h3>
          <p className="truncate text-[10px] text-muted-foreground">{constructionStatusLine(construction)}</p>
        </div>
        {construction.owner !== humanPlayer && (
          <Badge variant="outline" className="px-1.5 py-0 text-[9px] text-destructive">
            Enemy
          </Badge>
        )}
        <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
          {constructionStatus(construction)}
        </Badge>
      </div>
      {construction.hp !== undefined && construction.maxHp !== undefined && (
        <HealthStatus current={construction.hp} maximum={construction.maxHp} label="HP" />
      )}
      <ConstructionProgress construction={construction} />
      {completed && <ProductionPanel construction={construction} />}
    </div>
  )
}

function MineralContext({ mineral }: { readonly mineral: HudMineral }) {
  return (
    <div className="flex flex-1 items-center gap-3 overflow-hidden" data-testid="mineral-panel">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
        <Gem className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">Mineral Node</h3>
        <p className="font-medium tabular-nums text-cyan-300" data-testid="mineral-remaining">
          {mineralRemainingLine(mineral)}
        </p>
        <p className="text-[10px] text-muted-foreground">Neutral resource · Node #{mineral.id}</p>
      </div>
    </div>
  )
}

function EmptyContext() {
  return (
    <div className="grid flex-1 place-content-center gap-1 text-center">
      <p className="text-sm font-semibold">No selection</p>
      <p className="max-w-64 text-xs text-muted-foreground">Select a unit or structure to see its details.</p>
    </div>
  )
}

export function SelectionPanel({ selection, construction, mineral, humanPlayer }: SelectionPanelProps) {
  let content = <EmptyContext />
  if (construction !== null) {
    content = <ConstructionContext construction={construction} humanPlayer={humanPlayer} />
  } else if (mineral !== null) {
    content = <MineralContext mineral={mineral} />
  } else if (selection.length > 0) {
    content = <UnitSelectionCard selection={selection} humanPlayer={humanPlayer} />
  }
  return (
    <Card
      className="h-full min-h-0 w-full min-w-0 flex-1 gap-1.5 overflow-hidden py-2"
      data-testid="current-context-card"
    >
      <CardHeader className="shrink-0 px-3">
        <CardTitle className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          CURRENT CONTEXT
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 overflow-hidden px-3" aria-live="polite">
        {content}
      </CardContent>
    </Card>
  )
}
