import type { BuildCatalogEntry } from '@rts/protocol'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { buildingTypeForMode, type CommandMode, isRallyMode } from '../commands/useCommandModes'
import { LockedButton } from './LockedButton'

interface CommandBarProps {
  readonly disabled: boolean
  readonly mode: CommandMode
  readonly onStop: () => void
  readonly onHold: () => void
  readonly onSurrender: () => void
  readonly workerSelected: boolean
  readonly attackCapableSelected: boolean
  readonly monkSelected: boolean
  readonly healReady: boolean
  readonly healCooldownRemaining: number
  readonly minerals: number
  readonly castleTier: number
  readonly onArm: (mode: Exclude<CommandMode, 'idle'>) => void
  readonly buildHint: string | null
  readonly buildings: readonly BuildCatalogEntry[]
}

function ArmButton({
  label,
  hint,
  active,
  disabled,
  onClick
}: {
  readonly label: string
  readonly hint: string
  readonly active: boolean
  readonly disabled: boolean
  readonly onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="h-7 min-w-full truncate whitespace-nowrap px-1.5 text-center text-[11px] leading-tight"
      aria-pressed={active}
      title={hint}
    >
      {label}
    </Button>
  )
}

function CommandGroup({
  label,
  children,
  className,
  testId
}: {
  readonly label: string
  readonly children: React.ReactNode
  readonly className?: string
  readonly testId?: string
}) {
  return (
    <div
      className={cn(
        'flex h-full max-h-full w-24 min-w-24 max-w-24 shrink-0 flex-col gap-1 overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-1.5 sm:gap-1.5 sm:p-2',
        className
      )}
      data-testid={testId}
    >
      <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">{label}</span>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">{children}</div>
    </div>
  )
}

function OrdersGroup({ disabled, onStop, onHold }: Pick<CommandBarProps, 'disabled' | 'onStop' | 'onHold'>) {
  return (
    <CommandGroup label="Orders">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onStop}
        className="h-7 min-w-full whitespace-normal px-1.5 text-center text-xs leading-tight"
        title="Cancel all orders and stop movement."
      >
        Stop
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onHold}
        className="h-7 min-w-full whitespace-normal px-1.5 text-center text-xs leading-tight"
        title="Hold this position and attack enemies that enter range."
      >
        Hold
      </Button>
    </CommandGroup>
  )
}

function AttackGroup({
  disabled,
  attackCapableSelected,
  healReady,
  healCooldownRemaining,
  mode,
  onArm
}: Pick<
  CommandBarProps,
  'disabled' | 'attackCapableSelected' | 'healReady' | 'healCooldownRemaining' | 'onArm' | 'mode'
>) {
  return (
    <CommandGroup label="Actions">
      <ArmButton
        label="Attack"
        hint="Attack the selected enemy and pursue it."
        active={mode === 'attack'}
        disabled={disabled || !attackCapableSelected}
        onClick={() => onArm('attack')}
      />
      <ArmButton
        label="Attack-move"
        hint="Move to a location and attack enemies found along the way."
        active={mode === 'attack_move'}
        disabled={disabled || !attackCapableSelected}
        onClick={() => onArm('attack_move')}
      />
      <ArmButton
        label={healCooldownRemaining > 0 ? `Heal (${Math.ceil(healCooldownRemaining / 20)}s)` : 'Heal'}
        hint="Select an allied damaged unit or the Monk to heal."
        active={mode === 'heal'}
        disabled={disabled || !healReady}
        onClick={() => onArm('heal')}
      />
    </CommandGroup>
  )
}

function UtilityGroup({
  disabled,
  mode,
  onArm,
  onSurrender
}: Pick<CommandBarProps, 'disabled' | 'mode' | 'onArm' | 'onSurrender'>) {
  return (
    <CommandGroup label="Utility">
      <ArmButton
        label="Patrol"
        hint="Move between two points and attack enemies along the route."
        active={mode === 'patrol'}
        disabled={disabled}
        onClick={() => onArm('patrol')}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSurrender}
        className="h-7 min-w-full whitespace-normal px-1.5 text-center text-xs leading-tight"
        title="End the match and surrender."
      >
        Surrender
      </Button>
    </CommandGroup>
  )
}

function ConstructionGroup({
  buildings,
  minerals,
  mode,
  castleTier,
  onArm,
  workerSelected
}: Pick<CommandBarProps, 'buildings' | 'castleTier' | 'minerals' | 'mode' | 'onArm' | 'workerSelected'>) {
  return (
    <CommandGroup label="Construction" className="!w-40 !min-w-40 !max-w-40" testId="construction-command-group">
      <ScrollArea className="min-h-0 flex-1 pr-2" data-testid="construction-command-scroll">
        <div className="flex flex-col gap-1.5 pb-3">
          {buildings.map((building) => {
            const label = `${building.label} · ${building.costMinerals}`
            if (building.type === 'MONASTERY' && castleTier < 2) {
              return <LockedButton key={building.type} label={label} reason="Requires Castle II." />
            }
            return (
              <ArmButton
                key={building.type}
                label={label}
                hint={`Build ${building.label} at a valid location.`}
                active={buildingTypeForMode(mode) === building.type}
                disabled={!workerSelected || minerals < building.costMinerals}
                onClick={() => onArm({ kind: 'build', buildingType: building.type })}
              />
            )
          })}
        </div>
      </ScrollArea>
    </CommandGroup>
  )
}

/**
 * Action palette with at most two buttons per column: immediate orders
 * (Stop/Hold), pending attacks (Attack/Attack-move), and movement/utility
 * (Patrol/Surrender). Pending orders await a battlefield right-click; the
 * armed mode is shown as a compact hint only while active.
 */
export function CommandBar({
  disabled,
  mode,
  workerSelected,
  attackCapableSelected,
  monkSelected,
  healReady,
  healCooldownRemaining,
  minerals,
  castleTier,
  onStop,
  onHold,
  onSurrender,
  onArm,
  buildHint,
  buildings
}: CommandBarProps) {
  const targetHint = isRallyMode(mode) ? 'Pick a rally target.' : `Pick a target: ${mode}.`
  return (
    <div className="flex h-full min-h-0 w-max shrink-0 flex-nowrap items-stretch gap-1 sm:gap-2">
      <OrdersGroup disabled={disabled} onStop={onStop} onHold={onHold} />
      <AttackGroup
        disabled={disabled}
        attackCapableSelected={attackCapableSelected}
        healReady={healReady && monkSelected}
        healCooldownRemaining={healCooldownRemaining}
        mode={mode}
        onArm={onArm}
      />
      <UtilityGroup disabled={disabled} mode={mode} onArm={onArm} onSurrender={onSurrender} />
      <ConstructionGroup
        buildings={buildings}
        castleTier={castleTier}
        minerals={minerals}
        mode={mode}
        onArm={onArm}
        workerSelected={workerSelected}
      />
      {mode !== 'idle' ? (
        <div
          className={cn(
            'flex h-full w-24 min-w-24 max-w-24 shrink-0 items-center justify-center rounded-xl border border-primary/60 bg-primary/10 p-1.5 text-center text-[11px] text-primary transition-opacity break-words whitespace-normal sm:p-2 sm:text-xs',
            'animate-pulse'
          )}
          aria-live="polite"
        >
          {buildingTypeForMode(mode) !== null
            ? (buildHint ?? 'Move over the map to preview a building location.')
            : targetHint}
        </div>
      ) : null}
    </div>
  )
}
