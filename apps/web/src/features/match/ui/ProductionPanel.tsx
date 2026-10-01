import type { SnapshotProductionItem } from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE } from '@rts/shared'
import { useEffect, useRef } from 'react'
import { ProductionItemIcon, ProductionStatus, productionItemLabel } from './ProductionStatus'
import type { HudConstruction } from './types'
import { useProductionTransitions } from './useProductionTransitions'
import { useTimedValue } from './useTimedValue'

function QueueSlot({
  item,
  index,
  inserted
}: {
  readonly item: SnapshotProductionItem | undefined
  readonly index: number
  readonly inserted: boolean
}) {
  if (item === undefined) {
    return (
      <li
        className="grid h-14 min-w-0 place-items-center rounded border border-dashed border-border/60 bg-muted/20"
        data-testid={`production-slot-${index}`}
        aria-label={`Empty queue slot ${index + 1}`}
      >
        <span className="sr-only">Empty</span>
      </li>
    )
  }
  return (
    <li className="h-14 min-w-0" data-testid={`production-slot-${index}`}>
      <div
        className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded border border-border/70 bg-muted/40 px-1 py-1 data-[production-status=ACTIVE]:border-primary/70 data-[production-status=ACTIVE]:bg-primary/10 data-[production-status=COMPLETED_WAITING]:border-amber-400/70 data-[production-status=COMPLETED_WAITING]:bg-amber-400/10 ${
          inserted ? 'border-primary/70 bg-primary/10 motion-safe:animate-[hud-queue-insert_220ms_ease-out]' : ''
        }`}
        data-testid={`production-item-${index}`}
        data-production-status={item.status}
        title={productionItemLabel(item)}
      >
        <ProductionItemIcon item={item} className="size-5 shrink-0" />
        <span className="w-full truncate text-center text-[9px] font-medium leading-tight">
          {productionItemLabel(item)}
        </span>
        <span className="sr-only" data-testid={`production-status-${index}`}>
          {item.status === 'COMPLETED_WAITING' ? 'Waiting for exit' : item.status}
        </span>
      </div>
    </li>
  )
}

function rallyKey(construction: HudConstruction): string {
  if (construction.rallyPoint === null || construction.rallyPoint === undefined) {
    return ''
  }
  return `${construction.rallyPoint.x}:${construction.rallyPoint.y}`
}

function useRallyTransition(construction: HudConstruction): boolean {
  const previous = useRef<string | null>(null)
  const feedback = useTimedValue<boolean>(260)
  const value = rallyKey(construction)
  const showFeedback = feedback.show
  useEffect(() => {
    if (previous.current !== null && previous.current !== value) {
      showFeedback(true)
    }
    previous.current = value
  }, [showFeedback, value])
  return feedback.value === true
}

export function ProductionPanel({
  construction,
  queueAttention = false
}: {
  readonly construction: HudConstruction
  readonly queueAttention?: boolean
}) {
  const queue = construction.production?.queue ?? []
  const transitions = useProductionTransitions(construction.id, queue)
  const rallyUpdated = useRallyTransition(construction)
  if (!isProducer(construction.buildingType)) {
    return null
  }
  const activeItem = queue.find((item) => item.status === 'ACTIVE' || item.status === 'COMPLETED_WAITING')
  const slots = Array.from({ length: MAX_PRODUCTION_QUEUE }, (_, index) => ({
    id: `production-slot-${index}`,
    index,
    item: queue[index]
  }))
  return (
    <div
      className={`min-h-0 space-y-1 overflow-hidden border-t border-border/60 pt-1 ${
        queueAttention ? 'border-primary/70 bg-primary/5 motion-safe:animate-[hud-attention_250ms_ease-out]' : ''
      }`}
      data-testid="production-panel"
      data-queue-attention={queueAttention ? 'true' : 'false'}
    >
      <ProductionStatus item={activeItem} activeStarted={transitions.activeStarted} completed={transitions.completed} />
      <div className="flex items-center justify-between text-[9px] font-medium text-muted-foreground uppercase">
        <span data-testid="production-queue-count">
          Queue {queue.length}/{MAX_PRODUCTION_QUEUE}
        </span>
        <span
          className={`truncate ${rallyUpdated ? 'text-foreground motion-safe:animate-[hud-production-confirm_260ms_ease-out]' : ''}`}
          data-testid="rally-point"
          data-rally-feedback={rallyUpdated ? 'confirmed' : 'idle'}
        >
          {construction.rallyPoint === null || construction.rallyPoint === undefined
            ? 'Rally: none'
            : `Rally: ${construction.rallyPoint.x}, ${construction.rallyPoint.y}`}
        </span>
      </div>
      {queue.length === 0 && (
        <span className="sr-only" data-testid="production-queue-empty">
          No units or research in queue.
        </span>
      )}
      <ol className="grid grid-cols-5 gap-1" aria-label="Production and research queue" aria-live="polite">
        {slots.map((slot) => (
          <QueueSlot
            key={slot.id}
            item={slot.item}
            index={slot.index}
            inserted={transitions.insertedSlots.includes(slot.index)}
          />
        ))}
      </ol>
    </div>
  )
}

function isProducer(buildingType: HudConstruction['buildingType']): boolean {
  return (
    buildingType === 'CASTLE' ||
    buildingType === 'BARRACKS' ||
    buildingType === 'ARCHERY' ||
    buildingType === 'MONASTERY'
  )
}
