import type { SnapshotProductionItem, SnapshotResearchProductionItem } from '@rts/protocol'
import type { UnitKind } from '@rts/shared'
import { Crosshair, FlaskConical, HeartPulse, type LucideIcon, Pickaxe, Shield, Sword } from 'lucide-react'
import { Progress } from '@/shared/ui/progress'
import { TRAINABLE_LABEL } from './types'

const TICKS_PER_SECOND = 20

const PRODUCTION_ICONS: Readonly<Record<UnitKind, LucideIcon>> = {
  pawn: Pickaxe,
  warrior: Sword,
  archer: Crosshair,
  lancer: Shield,
  monk: HeartPulse
}

function isResearchItem(item: SnapshotProductionItem): item is SnapshotResearchProductionItem {
  return 'researchType' in item
}

function researchLabel(researchType: SnapshotResearchProductionItem['researchType']): string {
  if (researchType === 'ATTACK') {
    return 'Attack Research'
  }
  if (researchType === 'DEFENSE') {
    return 'Defense Research'
  }
  if (researchType === 'ECONOMY') {
    return 'Economy Research'
  }
  return 'Movement Research'
}

export function productionItemLabel(item: SnapshotProductionItem): string {
  return isResearchItem(item) ? researchLabel(item.researchType) : TRAINABLE_LABEL[item.unitKind]
}

export function ProductionItemIcon({
  item,
  className
}: {
  readonly item: SnapshotProductionItem
  readonly className?: string
}) {
  const Icon = isResearchItem(item) ? FlaskConical : PRODUCTION_ICONS[item.unitKind]
  return <Icon className={className} aria-hidden="true" />
}

function progressPercent(item: SnapshotProductionItem): number {
  return Math.round((100 * Math.max(0, Math.min(item.progressTicks, item.totalTicks))) / Math.max(1, item.totalTicks))
}

function remainingSeconds(item: SnapshotProductionItem): string {
  const seconds = Math.max(0, item.totalTicks - item.progressTicks) / TICKS_PER_SECOND
  return Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)
}

export function ProductionStatus({ item }: { readonly item: SnapshotProductionItem | undefined }) {
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
    <div className="space-y-0.5" data-testid="production-active">
      <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
        <span className="font-medium">Production</span>
        <ProductionItemIcon item={item} className="size-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{productionItemLabel(item)}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {waiting ? 'Waiting for exit' : `${percent}% · ${remainingSeconds(item)}s remaining`}
        </span>
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
