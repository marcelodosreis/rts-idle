import type { SnapshotProductionItem } from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE } from '@rts/shared'
import { ProductionItemIcon, ProductionStatus, productionItemLabel } from './ProductionStatus'
import type { HudConstruction } from './types'

function QueueSlot({ item, index }: { readonly item: SnapshotProductionItem | undefined; readonly index: number }) {
  if (item === undefined) {
    return (
      <li
        className="grid h-7 min-w-0 place-items-center rounded border border-dashed border-border/60 bg-muted/20"
        data-testid={`production-slot-${index}`}
        aria-label={`Empty queue slot ${index + 1}`}
      >
        <span className="sr-only">Empty</span>
      </li>
    )
  }
  return (
    <li className="h-7 min-w-0" data-testid={`production-slot-${index}`}>
      <div
        className="flex h-full min-w-0 items-center gap-1 rounded border border-border/70 bg-muted/40 px-1"
        data-testid={`production-item-${index}`}
        data-production-status={item.status}
        title={productionItemLabel(item)}
      >
        <ProductionItemIcon item={item} className="size-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[9px] font-medium">{productionItemLabel(item)}</span>
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
        <span className="sr-only" data-testid={`production-status-${index}`}>
          {item.status === 'COMPLETED_WAITING' ? 'Waiting for exit' : item.status}
        </span>
      </div>
    </li>
  )
}

export function ProductionPanel({ construction }: { readonly construction: HudConstruction }) {
  if (!isProducer(construction.buildingType)) {
    return null
  }
  const queue = construction.production?.queue ?? []
  const activeItem = queue.find((item) => item.status === 'ACTIVE' || item.status === 'COMPLETED_WAITING')
  const slots = Array.from({ length: MAX_PRODUCTION_QUEUE }, (_, index) => ({
    id: `production-slot-${index}`,
    index,
    item: queue[index]
  }))
  return (
    <div className="min-h-0 space-y-1 overflow-hidden border-t border-border/60 pt-1" data-testid="production-panel">
      <ProductionStatus item={activeItem} />
      <div className="flex items-center justify-between text-[9px] font-medium text-muted-foreground uppercase">
        <span data-testid="production-queue-count">
          Queue {queue.length}/{MAX_PRODUCTION_QUEUE}
        </span>
        <span className="truncate" data-testid="rally-point">
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
          <QueueSlot key={slot.id} item={slot.item} index={slot.index} />
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
