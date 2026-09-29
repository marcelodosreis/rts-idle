import type { ProductionCatalogEntry, SnapshotProductionItem } from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE, type TrainableUnitKind } from '@rts/shared'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { productionRefundEstimate } from '../selection/selection-panel-logic'
import type { HudConstruction, HudResources } from './types'
import { TRAINABLE_LABEL } from './types'

function productionItemLabel(item: SnapshotProductionItem, index: number): string {
  return `${index + 1}. ${TRAINABLE_LABEL[item.unitKind]}`
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
  return (
    <li
      className="flex min-w-0 flex-col gap-0.5 rounded border border-border/60 bg-background/40 px-1 py-0.5"
      data-testid={`production-item-${index}`}
      data-production-status={item.status}
    >
      <p className="truncate font-medium">{label}</p>
      {item.status === 'QUEUED' && (
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              type="button"
              variant={confirming ? 'destructive' : 'outline'}
              size="sm"
              className="h-5 w-full px-0.5 text-[9px]"
              aria-label={`${confirming ? 'Confirm cancellation of' : 'Cancel'} ${TRAINABLE_LABEL[item.unitKind]} ${index + 1}`}
              data-testid={`cancel-production-${index}`}
              onClick={onCancel}
            >
              {confirming ? 'Confirm' : 'Cancel'}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {confirming ? `Click again to confirm · refund ${refund} minerals` : `Refund ${refund} minerals`}
          </TooltipContent>
        </Tooltip>
      )}
      {item.status !== 'QUEUED' && (
        <span className="truncate text-[9px] text-muted-foreground" data-testid={`production-status-${index}`}>
          {item.status === 'ACTIVE' ? 'Producing' : 'Waiting for exit'}
        </span>
      )}
    </li>
  )
}

function TrainingButtons({
  options,
  queueFull,
  resources,
  onTrain,
  onSetRally
}: {
  readonly options: readonly ProductionCatalogEntry[]
  readonly queueFull: boolean
  readonly resources: HudResources | null
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly onSetRally: () => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((entry) => {
        const affordable = (resources?.mineral ?? 0) >= entry.costMinerals
        return (
          <Button
            key={entry.unitKind}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            disabled={queueFull || !affordable}
            onClick={() => onTrain(entry.unitKind)}
            data-testid={`train-${entry.unitKind}`}
            title={`${entry.costMinerals} minerals · ${entry.trainingTicks} ticks · ${entry.supply} supply`}
          >
            {TRAINABLE_LABEL[entry.unitKind]} · {entry.costMinerals}
          </Button>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto h-6 px-1.5 text-[11px]"
        onClick={onSetRally}
        data-testid="set-rally"
      >
        Set rally
      </Button>
    </div>
  )
}

function QueueList({
  queue,
  onCancelProduction
}: {
  readonly queue: readonly SnapshotProductionItem[]
  readonly onCancelProduction: (queueIndex: number) => void
}) {
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null)
  if (queue.length === 0) {
    return <p className="text-[11px]">No units in production.</p>
  }
  return (
    <ul className="grid list-none grid-cols-5 gap-1" aria-label="Production queue" aria-live="polite">
      {queue.map((item, index) => (
        <QueueItem
          key={`${item.unitKind}-${index}`}
          item={item}
          index={index}
          confirming={confirmingIndex === index}
          onCancel={() => {
            if (confirmingIndex !== index) {
              setConfirmingIndex(index)
              return
            }
            setConfirmingIndex(null)
            onCancelProduction(index)
          }}
        />
      ))}
    </ul>
  )
}

export function ProductionPanel({
  construction,
  production,
  resources,
  onTrain,
  onSetRally,
  onCancelProduction
}: {
  readonly construction: HudConstruction
  readonly production: readonly ProductionCatalogEntry[]
  readonly resources: HudResources | null
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly onSetRally: () => void
  readonly onCancelProduction: (queueIndex: number) => void
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
  return (
    <div className="space-y-1.5" data-testid="production-panel">
      <TrainingButtons
        options={options}
        queueFull={queueFull}
        resources={resources}
        onTrain={onTrain}
        onSetRally={onSetRally}
      />
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span data-testid="production-queue-count">
          Queue {queue.length}/{MAX_PRODUCTION_QUEUE}
        </span>
        <span data-testid="rally-point">
          {construction.rallyPoint === null || construction.rallyPoint === undefined
            ? 'Rally: none'
            : `Rally: ${construction.rallyPoint.x}, ${construction.rallyPoint.y}`}
        </span>
      </div>
      {queue.length > 0 && <QueueList queue={queue} onCancelProduction={onCancelProduction} />}
    </div>
  )
}
