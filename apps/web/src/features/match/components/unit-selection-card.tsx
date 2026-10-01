import { PROGRESS_PALETTE } from '@rts/renderer'
import { economyProgressTone, MOVEMENT_SPEED_SCALE, type UnitKind } from '@rts/shared'
import { Crosshair, HeartPulse, Info, type LucideIcon, Pickaxe, Shield, Sword } from 'lucide-react'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle
} from '@/shared/ui/popover'
import { Progress } from '@/shared/ui/progress'
import type { HudSelectionUnit } from '../types/hud-types'
import { KIND_LABEL, OWNER_COLORS } from '../types/hud-types'

const MAX_VISIBLE_UNITS = 24

const UNIT_ICONS: Readonly<Record<UnitKind, LucideIcon>> = {
  pawn: Pickaxe,
  warrior: Sword,
  archer: Crosshair,
  lancer: Shield,
  monk: HeartPulse
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
    return { label, color: PROGRESS_PALETTE[economyProgressTone(unit.economy.phase)].text }
  }
  if (unit.carrying === true) {
    return { label: 'Carrying cargo', color: PROGRESS_PALETTE.delivery.text }
  }
  return null
}

function orderLabel(unit: HudSelectionUnit): string {
  const economy = economyLabel(unit)
  if (economy !== null) {
    return economy
  }
  if (unit.carrying === true) {
    return 'Carrying cargo'
  }
  if (unit.orderState === 'moving') {
    return 'Moving'
  }
  if (unit.orderState === 'attacking') {
    return 'Attacking'
  }
  if (unit.orderState === 'hold') {
    return 'Holding position'
  }
  if (unit.orderState === 'patrol') {
    return 'Patrolling'
  }
  if (unit.orderState === 'attack_move') {
    return 'Attack-moving'
  }
  if (unit.orderState === 'repairing') {
    return `Repairing ${unit.repairProgressTicks ?? 0}/${unit.repairProgressMax ?? 10}`
  }
  if (unit.orderState === 'building') {
    return 'Building'
  }
  return unit.moving ? 'Moving' : 'Idle'
}

function health(
  unit: HudSelectionUnit
): { readonly current: number; readonly maximum: number; readonly percent: number } | null {
  if (unit.hp === undefined || unit.maxHp === undefined || unit.maxHp <= 0) {
    return null
  }
  return {
    current: unit.hp,
    maximum: unit.maxHp,
    percent: Math.round(100 * Math.max(0, Math.min(1, unit.hp / unit.maxHp)))
  }
}

function HealthBar({ unit, compact = false }: { readonly unit: HudSelectionUnit; readonly compact?: boolean }) {
  const value = health(unit)
  if (value === null) {
    return null
  }
  return (
    <div className={compact ? 'w-full' : 'space-y-0.5'}>
      {!compact && (
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">HP</span>
          <span className="font-medium tabular-nums">
            {value.current}/{value.maximum}
          </span>
        </div>
      )}
      <Progress
        value={value.percent}
        aria-label={`${KIND_LABEL[unit.kind]} health: ${value.current} of ${value.maximum}`}
        className={`${compact ? 'h-1' : 'h-1.5'} [&>[data-slot=progress-indicator]]:bg-emerald-500`}
      />
    </div>
  )
}

function UnitDetails({
  unit,
  children,
  fullArea = false
}: {
  readonly unit: HudSelectionUnit
  readonly children: (openDetails: () => void) => ReactElement
  readonly fullArea?: boolean
}) {
  const value = health(unit)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)

  function cancelClose(): void {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function scheduleClose(): void {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current)
      }
    },
    []
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild={true}>
        <span
          className={fullArea ? 'block h-full w-full' : 'inline-flex shrink-0'}
          onPointerEnter={() => {
            cancelClose()
            setOpen(true)
          }}
          onPointerLeave={scheduleClose}
        >
          {children(() => {
            cancelClose()
            setOpen(true)
          })}
        </span>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="end"
        className="w-60 space-y-2 p-3 text-xs"
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
      >
        <PopoverHeader>
          <PopoverTitle>
            {KIND_LABEL[unit.kind]} #{unit.id}
          </PopoverTitle>
          <PopoverDescription>Unit details and current order.</PopoverDescription>
        </PopoverHeader>
        <p>Owner: P{unit.owner}</p>
        <p>Status: {orderLabel(unit)}</p>
        {value !== null && (
          <p>
            HP: {value.current}/{value.maximum} ({value.percent}%)
          </p>
        )}
        {unit.damage !== undefined && <p>Damage: {unit.damage}</p>}
        {unit.armor !== undefined && <p>Armor: {unit.armor}</p>}
        {unit.movementSpeedFixed !== undefined && (
          <p>Speed: {(unit.movementSpeedFixed / MOVEMENT_SPEED_SCALE).toFixed(1)} tiles/s</p>
        )}
        {unit.cargoCapacity !== undefined && <p>Cargo capacity: {unit.cargoCapacity}</p>}
      </PopoverContent>
    </Popover>
  )
}

function SingleUnit({ unit, humanPlayer }: { readonly unit: HudSelectionUnit; readonly humanPlayer: number }) {
  const Icon = UNIT_ICONS[unit.kind]
  const economy = economyStatus(unit)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/40">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            {KIND_LABEL[unit.kind]} #{unit.id}
          </h3>
          <p className="text-[10px] text-muted-foreground">1 unit selected</p>
        </div>
        {unit.owner !== humanPlayer && (
          <Badge variant="outline" className="px-1.5 py-0 text-[9px] text-destructive">
            Enemy
          </Badge>
        )}
        <UnitDetails unit={unit}>
          {(openDetails) => (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              aria-label={`Details for ${KIND_LABEL[unit.kind]} #${unit.id}`}
              onFocus={openDetails}
              onPointerDown={openDetails}
              onClick={openDetails}
            >
              <Info className="size-3.5" />
            </Button>
          )}
        </UnitDetails>
      </div>
      <HealthBar unit={unit} />
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Status</span>
        <Badge variant="secondary" className="max-w-48 truncate px-1.5 py-0 text-[9px]">
          {economy === null ? (
            <span data-testid="economy-status" className="sr-only" />
          ) : (
            <span data-testid="economy-status" style={{ color: economy.color }}>
              {economy.label}
            </span>
          )}
          {economy === null && orderLabel(unit)}
        </Badge>
      </div>
    </div>
  )
}

function UnitChip({
  unit,
  humanPlayer,
  onOpen
}: {
  readonly unit: HudSelectionUnit
  readonly humanPlayer: number
  readonly onOpen?: () => void
}) {
  const Icon = UNIT_ICONS[unit.kind]
  const enemy = unit.owner !== humanPlayer
  return (
    <button
      type="button"
      onFocus={onOpen}
      onPointerDown={onOpen}
      onClick={onOpen}
      className={`relative flex h-10 min-w-0 w-full cursor-help flex-col items-center justify-center gap-1 rounded-md border px-1 appearance-none ${OWNER_COLORS[unit.owner] ?? 'bg-muted/30 text-foreground'}`}
      aria-label={`${KIND_LABEL[unit.kind]} #${unit.id}, ${enemy ? 'Enemy' : 'Ally'}, ${orderLabel(unit)}`}
    >
      <span
        className={`absolute top-1 right-1 size-1.5 rounded-full ${enemy ? 'bg-red-400' : 'bg-blue-400'}`}
        aria-hidden="true"
      />
      <Icon className="size-4" aria-hidden="true" />
      <HealthBar unit={unit} compact={true} />
    </button>
  )
}

function composition(selection: readonly HudSelectionUnit[]): string {
  const counts = new Map<UnitKind, number>()
  for (const unit of selection) {
    counts.set(unit.kind, (counts.get(unit.kind) ?? 0) + 1)
  }
  return [...counts].map(([kind, count]) => `${KIND_LABEL[kind]} ×${count}`).join(' · ')
}

function MultipleUnits({
  selection,
  humanPlayer
}: {
  readonly selection: readonly HudSelectionUnit[]
  readonly humanPlayer: number
}) {
  const visibleCount = selection.length > MAX_VISIBLE_UNITS ? MAX_VISIBLE_UNITS - 1 : MAX_VISIBLE_UNITS
  const visible = selection.slice(0, visibleCount)
  const hiddenCount = selection.length - visible.length
  const hasEnemy = selection.some((unit) => unit.owner !== humanPlayer)
  const enemy = selection.every((unit) => unit.owner !== humanPlayer)
  const mixed = selection.some((unit) => unit.owner === humanPlayer) && hasEnemy
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="shrink-0 text-sm font-semibold">{selection.length} units</h3>
        <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{composition(selection)}</p>
        {enemy && (
          <Badge variant="outline" className="px-1.5 py-0 text-[9px] text-destructive">
            Enemy
          </Badge>
        )}
      </div>
      {mixed && (
        <div
          data-testid="selection-ownership-legend"
          className="flex items-center gap-2 text-[9px] text-muted-foreground"
        >
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-blue-400" aria-hidden="true" />
            Ally
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-red-400" aria-hidden="true" />
            Enemy
          </span>
        </div>
      )}
      <ul className="grid grid-cols-8 grid-rows-3 gap-1" aria-label={`${selection.length} selected units`}>
        {visible.map((unit) => (
          <li
            key={unit.id}
            className="h-10 min-w-0"
            aria-label={`${KIND_LABEL[unit.kind]} #${unit.id}, ${unit.owner === humanPlayer ? 'Ally' : 'Enemy'}, ${orderLabel(unit)}`}
          >
            <UnitDetails unit={unit} fullArea={true}>
              {(openDetails) => <UnitChip unit={unit} humanPlayer={humanPlayer} onOpen={openDetails} />}
            </UnitDetails>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li
            className="grid h-10 place-items-center rounded-md border border-dashed bg-muted/20 text-xs font-semibold text-muted-foreground"
            aria-label={`${hiddenCount} more selected units`}
          >
            +{hiddenCount}
          </li>
        )}
      </ul>
    </div>
  )
}

export function UnitSelectionCard({
  selection,
  humanPlayer
}: {
  readonly selection: readonly HudSelectionUnit[]
  readonly humanPlayer: number
}) {
  const unit = selection[0]
  if (selection.length === 1 && unit !== undefined) {
    return <SingleUnit unit={unit} humanPlayer={humanPlayer} />
  }
  return <MultipleUnits selection={selection} humanPlayer={humanPlayer} />
}
