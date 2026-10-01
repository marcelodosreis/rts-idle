import type { SnapshotProductionItem } from '@rts/protocol'
import { Badge } from '@/shared/ui/badge'
import { Progress } from '@/shared/ui/progress'
import { productionItemLabel } from '../lib/production-label'
import { ProductionItemIcon } from './production-item-icon'

const TICKS_PER_SECOND = 20

function progressPercent(item: SnapshotProductionItem): number {
  return Math.round((100 * Math.max(0, Math.min(item.progressTicks, item.totalTicks))) / Math.max(1, item.totalTicks))
}

function remainingSeconds(item: SnapshotProductionItem): string {
  const seconds = Math.max(0, item.totalTicks - item.progressTicks) / TICKS_PER_SECOND
  return Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)
}

function productionFeedback(activeStarted: boolean, completed: boolean): 'idle' | 'started' | 'completed' {
  if (completed) {
    return 'completed'
  }
  return activeStarted ? 'started' : 'idle'
}

export function ProductionStatus({
  item,
  activeStarted,
  completed
}: {
  readonly item: SnapshotProductionItem | undefined
  readonly activeStarted: boolean
  readonly completed: boolean
}) {
  if (item === undefined) {
    return (
      <div className="flex h-6 items-center justify-between text-[10px]">
        <span className="font-medium">Production</span>
        <span className="text-muted-foreground">No production</span>
      </div>
    )
  }
  const percent = progressPercent(item)
  const waiting = item.status === 'COMPLETED_WAITING'
  return (
    <div
      className={`space-y-0.5 ${
        activeStarted || completed ? 'motion-safe:animate-[hud-production-confirm_260ms_ease-out]' : ''
      }`}
      data-testid="production-active"
      data-production-feedback={productionFeedback(activeStarted, completed)}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
        <span className="font-medium">Production</span>
        <ProductionItemIcon item={item} className="size-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{productionItemLabel(item)}</span>
        {waiting ? (
          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[9px] text-amber-300">
            Waiting for exit
          </Badge>
        ) : (
          <span className={`shrink-0 tabular-nums text-muted-foreground ${percent >= 90 ? 'text-foreground/80' : ''}`}>
            {percent}% · {remainingSeconds(item)}s remaining
          </span>
        )}
      </div>
      <Progress
        value={percent}
        aria-label={`${productionItemLabel(item)} production progress`}
        className="h-1.5"
        data-testid="production-progress"
      />
    </div>
  )
}
