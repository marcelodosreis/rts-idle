import type {
  BuildCatalogEntry,
  ProductionCatalogEntry,
  ResearchCatalogEntry,
  SnapshotProductionItem,
  SnapshotResearchProductionItem
} from '@rts/protocol'
import { PROGRESS_PALETTE } from '@rts/renderer'
import { MAX_PRODUCTION_QUEUE, type ResearchType, type TrainableUnitKind } from '@rts/shared'
import { Fragment, type ReactNode, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { productionRefundEstimate } from '../selection/selection-panel-logic'
import { CastleUpgradePanel } from './CastleUpgradePanel'
import { LockedButton } from './LockedButton'
import { ResearchButtons } from './ResearchPanel'
import type { HudConstruction, HudResources } from './types'
import { TRAINABLE_LABEL } from './types'

const RESEARCH_LABELS: Readonly<Record<ResearchType, string>> = {
  ATTACK: 'Attack',
  DEFENSE: 'Defense',
  ECONOMY: 'Economy',
  MOVEMENT: 'Movement'
}

function isResearchItem(item: SnapshotProductionItem): item is SnapshotResearchProductionItem {
  return 'researchType' in item
}

function productionItemLabel(item: SnapshotProductionItem, index: number): string {
  if (isResearchItem(item)) {
    return `${index + 1}. ${RESEARCH_LABELS[item.researchType]}`
  }
  return `${index + 1}. ${TRAINABLE_LABEL[item.unitKind]}`
}

function queueItemKey(item: SnapshotProductionItem, index: number): string {
  if (isResearchItem(item)) {
    return `${index}:research:${item.researchType}:${item.costMinerals}:${item.totalTicks}`
  }
  return `${index}:unit:${item.unitKind}:${item.costMinerals}:${item.reservedSupply}:${item.totalTicks}`
}

function QueueItem({
  item,
  index,
  confirming,
  onCancel
}: {
  readonly item: SnapshotProductionItem
  readonly index: number
  readonly confirming: boolean
  readonly onCancel: () => void
}) {
  const refund = productionRefundEstimate(item)
  const label = productionItemLabel(item, index)
  const research = isResearchItem(item)
  const cancellable = research || item.status === 'QUEUED'
  return (
    <li
      className="flex min-w-0 flex-col gap-0.5 rounded border border-border/60 bg-background/40 px-1 py-0.5"
      data-testid={`production-item-${index}`}
      data-production-status={item.status}
    >
      <p className="truncate font-medium">{label}</p>
      <div className="h-3.5">
        {cancellable ? (
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Button
                type="button"
                variant={confirming ? 'destructive' : 'outline'}
                size="sm"
                className="h-3.5 w-full px-0.5 text-[9px] leading-3"
                aria-label={`${confirming ? 'Confirm cancellation of' : 'Cancel'} ${research ? 'Research' : TRAINABLE_LABEL[item.unitKind]} ${index + 1}`}
                data-testid={`cancel-${research ? 'research' : 'production'}-${index}`}
                onClick={onCancel}
              >
                {confirming ? 'Confirm' : 'Cancel'}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {confirming ? `Click again to confirm · refund ${refund} minerals` : `Refund ${refund} minerals`}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span
            className="flex h-3.5 items-center truncate text-[9px] text-muted-foreground"
            data-testid={`production-status-${index}`}
          >
            {item.status === 'ACTIVE' ? 'Producing' : 'Waiting for exit'}
          </span>
        )}
      </div>
    </li>
  )
}

function TrainingButtons({
  options,
  queueFull,
  resources,
  onTrain,
  upgrade,
  research
}: {
  readonly options: readonly ProductionCatalogEntry[]
  readonly queueFull: boolean
  readonly resources: HudResources | null
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly upgrade: ReactNode
  readonly research: ReactNode
}) {
  return (
    <ScrollArea orientation="horizontal" className="min-w-0 max-w-full">
      <div className="flex w-max min-w-full flex-nowrap gap-1">
        {options.map((entry) => {
          const affordable = (resources?.mineral ?? 0) >= entry.costMinerals
          const tierLocked =
            (entry.unitKind === 'lancer' || entry.unitKind === 'monk') && (resources?.castleTier ?? 1) < 2
          if (tierLocked) {
            return (
              <Fragment key={entry.unitKind}>
                <LockedButton
                  label={`${TRAINABLE_LABEL[entry.unitKind]} · ${entry.costMinerals}`}
                  reason="Requires Castle II."
                  className="h-6 w-auto shrink-0 px-1.5 text-[11px]"
                  testId={`train-${entry.unitKind}`}
                  fullWidth={false}
                />
              </Fragment>
            )
          }
          return (
            <Fragment key={entry.unitKind}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 shrink-0 px-1.5 text-[11px]"
                disabled={queueFull || !affordable}
                onClick={() => onTrain(entry.unitKind)}
                data-testid={`train-${entry.unitKind}`}
                title={`${entry.costMinerals} minerals · ${entry.trainingTicks} ticks · ${entry.supply} supply`}
              >
                {TRAINABLE_LABEL[entry.unitKind]} · {entry.costMinerals}
              </Button>
              {entry.unitKind === 'pawn' && upgrade}
              {entry.unitKind === 'monk' && research}
            </Fragment>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function QueueList({
  queue,
  onCancelProduction,
  onCancelResearch
}: {
  readonly queue: readonly SnapshotProductionItem[]
  readonly onCancelProduction: (queueIndex: number) => void
  readonly onCancelResearch: (queueIndex: number) => void
}) {
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null)
  if (queue.length === 0) {
    return (
      <p className="text-[11px]" data-testid="production-queue-empty">
        No units or research in queue.
      </p>
    )
  }
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <ul
        className="grid w-full min-w-0 grid-cols-5 gap-1"
        aria-label="Production and research queue"
        aria-live="polite"
      >
        {queue.map((item, index) => (
          <QueueItem
            key={queueItemKey(item, index)}
            item={item}
            index={index}
            confirming={confirmingIndex === index}
            onCancel={() => {
              if (confirmingIndex !== index) {
                setConfirmingIndex(index)
                return
              }
              setConfirmingIndex(null)
              if (isResearchItem(item)) {
                onCancelResearch(index)
              } else {
                onCancelProduction(index)
              }
            }}
          />
        ))}
      </ul>
    </div>
  )
}

export function ProductionPanel({
  construction,
  buildings,
  production,
  resources,
  onTrain,
  onUpgrade,
  research,
  onResearch,
  onSetRally,
  onCancelProduction,
  onCancelResearch
}: {
  readonly construction: HudConstruction
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
  readonly resources: HudResources | null
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly onUpgrade: (castleId: number) => void
  readonly research: readonly ResearchCatalogEntry[]
  readonly onResearch: (monasteryId: number, researchType: ResearchType) => void
  readonly onSetRally: () => void
  readonly onCancelProduction: (queueIndex: number) => void
  readonly onCancelResearch: (queueIndex: number) => void
}) {
  if (
    construction.status !== 'COMPLETED' ||
    production.every((entry) => entry.producer !== construction.buildingType)
  ) {
    return null
  }
  const options = production.filter((entry) => entry.producer === construction.buildingType)
  const queue = construction.production?.queue ?? []
  const queueFull = queue.length >= MAX_PRODUCTION_QUEUE
  const upgradeInProgress = construction.tierUpgrade !== undefined && construction.tierUpgrade !== null
  return (
    <div className="space-y-1.5" data-testid="production-panel">
      {upgradeInProgress ? (
        <p
          className="text-[11px]"
          style={{ color: PROGRESS_PALETTE.construction.text }}
          data-testid="production-blocked"
        >
          Production paused during Castle II upgrade.
        </p>
      ) : (
        <TrainingButtons
          options={options}
          queueFull={queueFull}
          resources={resources}
          onTrain={onTrain}
          research={
            <ResearchButtons
              construction={construction}
              catalog={research}
              resources={resources}
              onResearch={onResearch}
            />
          }
          upgrade={
            <CastleUpgradePanel
              construction={construction}
              buildings={buildings}
              resources={resources}
              onUpgrade={onUpgrade}
            />
          }
        />
      )}
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span data-testid="production-queue-count">
          Queue {queue.length}/{MAX_PRODUCTION_QUEUE}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            onClick={onSetRally}
            data-testid="set-rally"
          >
            Set rally
          </Button>
          <span className="truncate" data-testid="rally-point">
            {construction.rallyPoint === null || construction.rallyPoint === undefined
              ? 'Rally: none'
              : `Rally: ${construction.rallyPoint.x}, ${construction.rallyPoint.y}`}
          </span>
        </div>
      </div>
      <QueueList queue={queue} onCancelProduction={onCancelProduction} onCancelResearch={onCancelResearch} />
    </div>
  )
}
