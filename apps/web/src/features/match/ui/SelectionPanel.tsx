import { Gem, Hammer, Trees } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { constructionStatusLine, resourceRemainingLine } from '../selection/selection-panel-logic'
import type { HudFeedbackTarget } from './HudContextFeedback'
import { ProductionPanel } from './ProductionPanel'
import type { HudConstruction, HudResource, HudSelectionUnit } from './types'
import { UnitSelectionCard } from './UnitSelectionCard'
import { useTimedValue } from './useTimedValue'

export { constructionStatusLine, resourceRemainingLine } from '../selection/selection-panel-logic'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly resource: HudResource | null
  readonly humanPlayer: number
  readonly feedbackTarget: HudFeedbackTarget | null
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
  humanPlayer,
  queueAttention = false
}: {
  readonly construction: HudConstruction
  readonly humanPlayer: number
  readonly queueAttention?: boolean
}) {
  const completed = construction.status === 'COMPLETED'
  const previousStatus = useRef(construction.status)
  const completedFeedback = useTimedValue<boolean>(260)
  const showCompletedFeedback = completedFeedback.show
  useEffect(() => {
    if (previousStatus.current !== 'COMPLETED' && construction.status === 'COMPLETED') {
      showCompletedFeedback(true)
    }
    previousStatus.current = construction.status
  }, [construction.status, showCompletedFeedback])
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-1 overflow-hidden ${
        completedFeedback.value === true ? 'motion-safe:animate-[hud-production-confirm_260ms_ease-out]' : ''
      }`}
      data-testid="construction-panel"
      data-construction-feedback={completedFeedback.value === true ? 'completed' : 'idle'}
    >
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
      {completed && <ProductionPanel construction={construction} queueAttention={queueAttention} />}
    </div>
  )
}

function ResourceContext({ resource }: { readonly resource: HudResource }) {
  const naturalTree = resource.kind === 'TREE'
  const Icon = naturalTree ? Trees : Gem
  return (
    <div className="flex flex-1 items-center gap-3 overflow-hidden" data-testid="resource-panel">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-lg border ${
          naturalTree
            ? 'border-lime-500/30 bg-lime-500/10 text-lime-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        }`}
        data-testid="neutral-resource-icon"
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{naturalTree ? 'Tree' : 'Gold Mine'}</h3>
        <p
          className={`font-medium tabular-nums ${naturalTree ? 'text-lime-300' : 'text-amber-300'}`}
          data-testid="resource-remaining"
        >
          {resourceRemainingLine(resource)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Neutral resource · {naturalTree ? 'Tree' : 'Gold Mine'} #{resource.id}
        </p>
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

export function SelectionPanel({ selection, construction, resource, humanPlayer, feedbackTarget }: SelectionPanelProps) {
  let content = <EmptyContext />
  if (construction !== null) {
    content = (
      <ConstructionContext
        construction={construction}
        humanPlayer={humanPlayer}
        queueAttention={feedbackTarget === 'queue'}
      />
    )
  } else if (resource !== null) {
    content = <ResourceContext resource={resource} />
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
      <CardContent className="flex min-h-0 flex-1 overflow-hidden px-3">
        <div
          key={selectionContextKey(selection, construction, resource)}
          data-testid="selection-context-content"
          data-selection-context={selectionContextKey(selection, construction, resource)}
          className="flex min-h-0 w-full motion-safe:animate-[hud-context-enter_180ms_ease-out]"
        >
          {content}
        </div>
      </CardContent>
    </Card>
  )
}

function selectionContextKey(
  selection: readonly HudSelectionUnit[],
  construction: HudConstruction | null,
  resource: HudResource | null
): string {
  if (construction !== null) {
    return `building:${construction.id}`
  }
  if (resource !== null) {
    return `resource:${resource.id}`
  }
  return selection.length === 0 ? 'none' : `units:${selection.map((unit) => unit.id).join(',')}`
}
