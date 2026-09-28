import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry } from '@rts/protocol'
import { PROGRESS_PALETTE } from '@rts/renderer'
import type { ResearchType, TrainableUnitKind } from '@rts/shared'
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
import { type HudConstruction, type HudMineral, type HudResources, type HudSelectionUnit, KIND_LABEL } from './types'
import { economyStatus, UnitChip } from './UnitSelectionCard'

export { constructionStatusLine, mineralRemainingLine } from '../selection/selection-panel-logic'

interface SelectionPanelProps {
  readonly selection: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly mineral: HudMineral | null
  readonly buildings: readonly BuildCatalogEntry[]
  readonly humanPlayer: number
  readonly onCancelConstruction: (buildingId: number) => void
  readonly onCancelProduction: (producerId: number, queueIndex: number) => void
  readonly onUpgradeCastle: (castleId: number) => void
  readonly onResearch: (monasteryId: number, researchType: ResearchType) => void
  readonly onCancelResearch: (monasteryId: number, queueIndex: number) => void
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly onSetRally: (producerId: number) => void
  readonly production: readonly ProductionCatalogEntry[]
  readonly research: readonly ResearchCatalogEntry[]
  readonly resources: HudResources | null
}

function kindSummary(selection: readonly HudSelectionUnit[]): string {
  const counts = new Map<string, number>()
  for (const unit of selection) {
    counts.set(KIND_LABEL[unit.kind], (counts.get(KIND_LABEL[unit.kind]) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, count]) => (count > 1 ? `${label} ×${count}` : label)).join(' · ')
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

function hasCastleUpgrade(construction: HudConstruction): boolean {
  return construction.tierUpgrade !== undefined && construction.tierUpgrade !== null
}

function progressPercent(progressTicks: number, totalTicks: number): number {
  return Math.min(100, Math.max(0, Math.round((100 * progressTicks) / Math.max(1, totalTicks))))
}

function ConstructionProgressBar({ construction }: { readonly construction: HudConstruction }) {
  const progress = construction.tierUpgrade ?? {
    progressTicks: construction.progressTicks,
    totalTicks: construction.totalTicks
  }
  const visible = construction.status !== 'COMPLETED' || hasCastleUpgrade(construction)
  if (!visible) {
    return null
  }
  return (
    <span
      className="mt-0.5 block h-1.5 w-full overflow-hidden rounded-full bg-black/30"
      role="progressbar"
      aria-label={`${constructionLabel(construction)} progress`}
      aria-valuemin={0}
      aria-valuemax={progress.totalTicks}
      aria-valuenow={progress.progressTicks}
      data-testid="construction-progress-bar"
    >
      <span
        className="block h-full"
        style={{
          backgroundColor: PROGRESS_PALETTE.construction.fill,
          width: `${progressPercent(progress.progressTicks, progress.totalTicks)}%`
        }}
      />
    </span>
  )
}

function constructionTitleStatus(construction: HudConstruction): string {
  if (hasCastleUpgrade(construction)) {
    return 'Upgrading'
  }
  if (construction.status === 'COMPLETED') {
    return 'Ready'
  }
  if (construction.status === 'PAUSED') {
    return 'Paused'
  }
  return construction.status.replace('_', ' ')
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

function ConstructionTooltip({ construction }: { readonly construction: HudConstruction }) {
  const label = `${constructionLabel(construction)} · ${constructionTitleStatus(construction)}`
  const hpAvailable = construction.hp !== undefined && construction.maxHp !== undefined
  const showProgress = construction.status !== 'COMPLETED' || hasCastleUpgrade(construction)
  return (
    <TooltipContent side="top" sideOffset={6} className="space-y-0.5">
      <p className="font-semibold">{label}</p>
      <p>Owner: P{construction.owner}</p>
      <p>Status: {constructionTitleStatus(construction)}</p>
      {showProgress && <p>Progress: {constructionStatusLine(construction)}</p>}
      {construction.builderId !== null && <p>Worker: #{construction.builderId}</p>}
      {hpAvailable && (
        <p>
          HP: {construction.hp}/{construction.maxHp}
        </p>
      )}
      {construction.production !== undefined && <p>Production queue: {construction.production.queue.length}/5</p>}
    </TooltipContent>
  )
}

function ConstructionCardHeader({ construction }: { readonly construction: HudConstruction }) {
  const showProgress = construction.status !== 'COMPLETED' || hasCastleUpgrade(construction)
  return (
    <CardHeader className="shrink-0 gap-0.5 px-2 py-0">
      <CardTitle className="truncate text-[11px] text-muted-foreground">
        <span className="flex min-w-0 items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <button
                type="button"
                className="truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${constructionLabel(construction)} · ${constructionTitleStatus(construction)}`}
              >
                {constructionLabel(construction)} · {constructionTitleStatus(construction)}
              </button>
            </TooltipTrigger>
            <ConstructionTooltip construction={construction} />
          </Tooltip>
          <span className="flex shrink-0 items-center gap-2 font-medium">
            {showProgress && (
              <span style={{ color: PROGRESS_PALETTE.construction.text }} data-testid="construction-status">
                {constructionStatusLine(construction)}
              </span>
            )}
            {construction.hp !== undefined && construction.maxHp !== undefined && (
              <span aria-live="polite" data-testid="construction-health">
                HP: {construction.hp}/{construction.maxHp}
              </span>
            )}
          </span>
        </span>
        <ConstructionProgressBar construction={construction} />
      </CardTitle>
    </CardHeader>
  )
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
  activeEconomy
}: {
  readonly selection: readonly HudSelectionUnit[]
  readonly selectionLabel: string
  readonly activeEconomy: { readonly label: string; readonly color: string } | null
}) {
  return (
    <Card className="flex min-h-0 w-64 max-w-[calc(100vw-2rem)] shrink-0 flex-col overflow-hidden py-1">
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
      <CardContent className="flex flex-wrap gap-0.5 px-2 py-0.5" aria-live="polite">
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
  | 'onCancelResearch'
  | 'onResearch'
  | 'onUpgradeCastle'
  | 'onSetRally'
  | 'onTrain'
  | 'production'
  | 'research'
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
  onCancelResearch,
  onResearch,
  onUpgradeCastle,
  onSetRally,
  onTrain,
  production,
  research,
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
      className={`flex min-h-0 ${construction.buildingType === 'MONASTERY' ? 'w-[26rem]' : 'w-72'} max-w-[calc(100vw-2rem)] shrink-0 flex-col gap-0 overflow-hidden py-1`}
      data-testid="construction-panel"
    >
      <ConstructionCardHeader construction={construction} />
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
          buildings={buildings}
          production={production}
          resources={resources}
          onTrain={onTrain}
          onUpgrade={onUpgradeCastle}
          research={research}
          onResearch={onResearch}
          onSetRally={() => onSetRally(construction.id)}
          onCancelProduction={(queueIndex) => onCancelProduction(construction.id, queueIndex)}
          onCancelResearch={(queueIndex) => onCancelResearch(construction.id, queueIndex)}
        />
      </CardContent>
    </Card>
  )
}

export function SelectionPanel({
  selection,
  construction,
  mineral,
  buildings,
  humanPlayer,
  onCancelConstruction,
  onCancelProduction,
  onCancelResearch,
  onResearch,
  onUpgradeCastle,
  onTrain,
  onSetRally,
  production,
  research,
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
        onCancelResearch={onCancelResearch}
        onResearch={onResearch}
        onUpgradeCastle={onUpgradeCastle}
        onTrain={onTrain}
        onSetRally={onSetRally}
        production={production}
        research={research}
        resources={resources}
        confirmingId={confirmingId}
        setConfirmingId={setConfirmingId}
      />
    )
  }
  if (mineral !== null) {
    return (
      <Card
        className="flex min-h-0 w-64 max-w-[calc(100vw-2rem)] shrink-0 flex-col overflow-hidden py-1"
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
  return <UnitSelectionCard selection={selection} selectionLabel={selectionLabel} activeEconomy={activeEconomy} />
}
