import { PROGRESS_PALETTE } from '@rts/renderer'
import { economyProgressTone, MOVEMENT_SPEED_SCALE } from '@rts/shared'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { HudSelectionUnit } from './types'
import { KIND_LABEL, OWNER_COLORS } from './types'

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

export function economyStatus(unit: HudSelectionUnit): { readonly label: string; readonly color: string } | null {
  if (unit.economy !== undefined) {
    const label = economyLabel(unit)
    if (label === null) {
      return null
    }
    return { label, color: PROGRESS_PALETTE[economyProgressTone(unit.economy.phase)].text }
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

function movementSpeedLabel(speedFixed: number): string {
  return `${(speedFixed / MOVEMENT_SPEED_SCALE).toFixed(1)} tiles/s`
}

export function UnitChip({ unit }: { readonly unit: HudSelectionUnit }) {
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
        {unit.damage !== undefined && <p>Damage: {unit.damage}</p>}
        {unit.armor !== undefined && <p>Armor: {unit.armor}</p>}
        {unit.movementSpeedFixed !== undefined && <p>Speed: {movementSpeedLabel(unit.movementSpeedFixed)}</p>}
        {unit.cargoCapacity !== undefined && <p>Cargo capacity: {unit.cargoCapacity}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
