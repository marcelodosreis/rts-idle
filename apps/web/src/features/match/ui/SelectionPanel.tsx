import type { BuildCatalogEntry, ProductionCatalogEntry } from '@rts/protocol'
import { PROGRESS_PALETTE } from '@rts/renderer'
import { economyProgressTone, type TrainableUnitKind } from '@rts/shared'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  canCancelConstruction,
  cancelRefundEstimate,
  constructionStatusLine,
  mineralRemainingLine
} from '../selection/selection-panel-logic'
import { ProductionPanel } from './ProductionPanel'
import {
  type HudConstruction,
  type HudMineral,
  type HudResources,
  type HudSelectionUnit,
  KIND_LABEL,
  OWNER_COLORS
} from './types'

export { constructionStatusLine, mineralRemainingLine } from '../selection/selection-panel-logic'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
  readonly compact: boolean
  readonly construction: HudConstruction | null
  readonly mineral: HudMineral | null
  readonly buildings: readonly BuildCatalogEntry[]
  readonly humanPlayer: number
  readonly onCancelConstruction: (buildingId: number) => void
  readonly onCancelProduction: (producerId: number, queueIndex: number) => void
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly onSetRally: (producerId: number) => void
  readonly production: readonly ProductionCatalogEntry[]
  readonly resources: HudResources | null
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

function economyStatus(unit: HudSelectionUnit): { readonly label: string; readonly color: string } | null {
  if (unit.economy !== undefined) {
    const label = economyLabel(unit)
    if (label === null) {
      return null
    }
    return {
      label,
      color: PROGRESS_PALETTE[economyProgressTone(unit.economy.phase)].text
    }
  }
  if (unit.carrying === true) {
    return { label: 'Carrying cargo', color: PROGRESS_PALETTE.delivery.text }
  }
  return null
}

function orderLabel(unit: HudSelectionUnit): string {
  if (unit.economy !== undefined) {
    return economyLabel(unit) ?? 'Idle'
  }
  if (unit.carrying === true) {
    return 'Carrying cargo'
  }
  switch (unit.orderState) {
    case 'moving':
      return 'Moving'
    case 'attacking':
      return 'Attacking'
    case 'hold':
      return 'Holding position'
    case 'patrol':
      return 'Patrolling'
    case 'attack_move':
      return 'Attack-moving'
    case 'repairing':
      return `Repairing ${unit.repairProgressTicks ?? 0}/${unit.repairProgressMax ?? 10}`
    default:
      return unit.moving ? 'Moving' : 'Idle'
  }
}

function UnitChip({ unit }: { readonly unit: HudSelectionUnit }) {
  const hasHp = unit.hp !== undefined && unit.maxHp !== undefined && unit.maxHp > 0
  const ratio = hasHp ? Math.max(0, Math.min(1, unit.hp! / unit.maxHp!)) : 0
  const hpPercent = Math.round(ratio * 100)
  const unitLabel = `${KIND_LABEL[unit.kind]} #${unit.id}`
  const statusText = orderLabel(unit)
  const economyTone = unit.economy === undefined ? null : economyProgressTone(unit.economy.phase)

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <button
          type="button"
          className={`flex cursor-help flex-col items-center rounded border-0 px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring ${OWNER_COLORS[unit.owner] ?? 'bg-muted/30 text-foreground'}`}
          aria-label={`${unitLabel}, owner ${unit.owner}, ${statusText}${hasHp ? `, ${hpPercent}% health` : ''}`}
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
        <p>Status: {statusText}</p>
        {unit.economy !== undefined && (
          <div className="space-y-0.5">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full"
                style={{
                  backgroundColor: PROGRESS_PALETTE[economyTone ?? 'delivery'].fill,
                  width: `${Math.round(
                    100 *
                      (unit.economy.phase === 'gathering'
                        ? unit.economy.progressTicks / Math.max(1, unit.economy.progressMax)
                        : unit.economy.cargoAmount / Math.max(1, unit.economy.cargoCapacity))
                  )}%`
                }}
              />
            </div>
            <p>{statusText}</p>
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

function constructionLabel(construction: HudConstruction): string {
  if (construction.buildingType === 'BASE') {
    return 'Base'
  }
  if (construction.buildingType === 'BARRACKS') {
    return 'Barracks'
  }
  return 'Supply Depot'
}

function constructionTitleStatus(status: HudConstruction['status']): string {
  if (status === 'COMPLETED') {
    return 'Ready'
  }
  if (status === 'PAUSED') {
    return 'Paused'
  }
  return status.replace('_', ' ')
}

function constructionHint(status: HudConstruction['status']): string {
  if (status === 'PAUSED') {
    return 'Select a Worker and right-click this construction to resume.'
  }
  if (status === 'COMPLETED') {
    return 'Construction complete.'
  }
  return 'Select the builder and press Stop to pause.'
}

function ConstructionCancelButton({
  construction,
  humanPlayer,
  refund,
  confirming,
  onConfirm
}: {
  readonly construction: HudConstruction
  readonly humanPlayer: number
  readonly refund: number
  readonly confirming: boolean
  readonly onConfirm: () => void
}) {
  if (!canCancelConstruction(construction, humanPlayer)) {
    return null
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <Button
          type="button"
          variant={confirming ? 'destructive' : 'outline'}
          size="sm"
          className="h-6 shrink-0 self-start whitespace-nowrap px-1.5 text-[11px]"
          data-testid="cancel-construction"
          aria-label={confirming ? 'Confirm construction cancellation' : 'Cancel construction'}
          onClick={onConfirm}
        >
          {confirming ? 'Confirm' : 'Cancel'}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {confirming ? `Click again to confirm · refund ~${refund}` : `Estimated refund ~${refund} minerals`}
      </TooltipContent>
    </Tooltip>
  )
}

function UnitSelectionCard({
  selection,
  selectionLabel,
  activeEconomy,
  compact
}: {
  readonly selection: readonly HudSelectionUnit[]
  readonly selectionLabel: string
  readonly activeEconomy: { readonly label: string; readonly color: string } | null
  readonly compact: boolean
}) {
  return (
    <Card
      className={`flex min-h-0 w-full shrink-0 flex-col overflow-hidden py-1 ${compact ? 'max-w-[12rem] sm:max-w-[16rem]' : 'max-w-[22rem]'}`}
    >
      <CardHeader className="shrink-0 gap-0.5 px-2 py-0">
        <CardTitle className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{selectionLabel}</span>
          <span
            data-testid="economy-status"
            className="shrink-0 truncate font-medium empty:invisible"
            style={{ color: activeEconomy?.color }}
            aria-live="polite"
          >
            {activeEconomy?.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`flex flex-wrap px-2 py-0.5 ${compact ? 'gap-0' : 'gap-0.5'}`} aria-live="polite">
        {selection.length > 0 && selection.map((unit) => <UnitChip key={unit.id} unit={unit} />)}
      </CardContent>
    </Card>
  )
}

type ConstructionSelectionCardProps = Pick<
  SelectionPanelProps,
  | 'buildings'
  | 'humanPlayer'
  | 'onCancelConstruction'
  | 'onCancelProduction'
  | 'onSetRally'
  | 'onTrain'
  | 'production'
  | 'resources'
> & {
  readonly construction: HudConstruction
  readonly confirmingId: number | null
  readonly setConfirmingId: (id: number | null) => void
}

function ConstructionSelectionCard({
  construction,
  buildings,
  humanPlayer,
  onCancelConstruction,
  onCancelProduction,
  onSetRally,
  onTrain,
  production,
  resources,
  confirmingId,
  setConfirmingId
}: ConstructionSelectionCardProps) {
  const refund = cancelRefundEstimate(
    construction,
    buildings.find((building) => building.type === construction.buildingType)?.costMinerals ?? 0
  )
  const confirming = confirmingId === construction.id
  return (
    <Card
      className="flex min-h-0 w-full max-w-[22rem] shrink-0 flex-col gap-0 overflow-hidden py-1"
      data-testid="construction-panel"
    >
      <CardHeader className="shrink-0 gap-0.5 px-2 py-0">
        <CardTitle className="truncate text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate">
              {constructionLabel(construction)} · {constructionTitleStatus(construction.status)}
            </span>
            <span className="flex shrink-0 items-center gap-2 font-medium">
              {construction.hp !== undefined && construction.maxHp !== undefined && (
                <span aria-live="polite" data-testid="construction-health">
                  HP: {construction.hp}/{construction.maxHp}
                </span>
              )}
              {construction.status !== 'COMPLETED' && (
                <span style={{ color: PROGRESS_PALETTE.construction.text }} data-testid="construction-status">
                  {constructionStatusLine(construction)}
                </span>
              )}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-2 py-0.5 text-[11px] text-muted-foreground">
        {construction.status !== 'COMPLETED' && (
          <span className="leading-snug" aria-live="polite">
            {constructionHint(construction.status)}
          </span>
        )}
        <ConstructionCancelButton
          construction={construction}
          humanPlayer={humanPlayer}
          refund={refund}
          confirming={confirming}
          onConfirm={() => {
            if (!confirming) {
              setConfirmingId(construction.id)
              return
            }
            setConfirmingId(null)
            onCancelConstruction(construction.id)
          }}
        />
        <ProductionPanel
          construction={construction}
          production={production}
          resources={resources}
          onTrain={onTrain}
          onSetRally={() => onSetRally(construction.id)}
          onCancelProduction={(queueIndex) => onCancelProduction(construction.id, queueIndex)}
        />
      </CardContent>
    </Card>
  )
}

export function SelectionPanel({
  selection,
  compact,
  construction,
  mineral,
  buildings,
  humanPlayer,
  onCancelConstruction,
  onCancelProduction,
  onTrain,
  onSetRally,
  production,
  resources
}: SelectionPanelProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const activeEconomy = selection.map(economyStatus).find((status) => status !== null) ?? null
  const selectionLabel =
    selection.length === 0 ? 'No selection — click a unit' : `${selection.length} · ${kindSummary(selection)}`
  if (construction !== null) {
    return (
      <ConstructionSelectionCard
        construction={construction}
        buildings={buildings}
        humanPlayer={humanPlayer}
        onCancelConstruction={onCancelConstruction}
        onCancelProduction={onCancelProduction}
        onTrain={onTrain}
        onSetRally={onSetRally}
        production={production}
        resources={resources}
        confirmingId={confirmingId}
        setConfirmingId={setConfirmingId}
      />
    )
  }
  if (mineral !== null) {
    return (
      <Card
        className="flex min-h-0 w-full max-w-[22rem] shrink-0 flex-col overflow-hidden py-1"
        data-testid="mineral-panel"
      >
        <CardHeader className="shrink-0 gap-0.5 px-2 py-0">
          <CardTitle className="truncate text-[11px] text-muted-foreground">Mineral Node</CardTitle>
          <p
            className="h-4 truncate text-[11px] font-medium"
            style={{ color: PROGRESS_PALETTE.mining.text }}
            data-testid="mineral-remaining"
          >
            {mineralRemainingLine(mineral)}
          </p>
        </CardHeader>
        <CardContent className="px-2 py-0.5 text-[11px] text-muted-foreground" aria-live="polite">
          Neutral resource
        </CardContent>
      </Card>
    )
  }
  return (
    <UnitSelectionCard
      selection={selection}
      selectionLabel={selectionLabel}
      activeEconomy={activeEconomy}
      compact={compact}
    />
  )
}
