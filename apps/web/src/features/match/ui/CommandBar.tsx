import type { BuildCatalogEntry } from '@rts/protocol'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { buildingTypeForMode, type CommandMode, isRallyMode } from '../commands/useCommandModes'

interface CommandBarProps {
  readonly disabled: boolean
  readonly mode: CommandMode
  readonly onStop: () => void
  readonly onHold: () => void
  readonly onSurrender: () => void
  readonly workerSelected: boolean
  readonly minerals: number
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
      className="h-7 min-w-full whitespace-normal px-1.5 text-center text-xs leading-tight"
      aria-pressed={active}
      title={hint}
    >
      {label}
    </Button>
  )
}

function CommandGroup({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex w-max min-w-20 shrink-0 flex-col gap-1 rounded-xl border border-border/60 bg-muted/30 p-1.5 sm:min-w-24 sm:gap-1.5 sm:p-2 lg:min-w-28">
      <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">{label}</span>
      <div className="flex flex-col gap-1.5">{children}</div>
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

function AttackGroup({ disabled, mode, onArm }: Pick<CommandBarProps, 'disabled' | 'onArm' | 'mode'>) {
  return (
    <CommandGroup label="Attack">
      <ArmButton
        label="Attack"
        hint="Attack the selected enemy and pursue it."
        active={mode === 'attack'}
        disabled={disabled}
        onClick={() => onArm('attack')}
      />
      <ArmButton
        label="Attack-move"
        hint="Move to a location and attack enemies found along the way."
        active={mode === 'attack_move'}
        disabled={disabled}
        onClick={() => onArm('attack_move')}
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
  onArm,
  workerSelected
}: Pick<CommandBarProps, 'buildings' | 'minerals' | 'mode' | 'onArm' | 'workerSelected'>) {
  return (
    <CommandGroup label="Construction">
      {buildings.map((building) => (
        <ArmButton
          key={building.type}
          label={`${building.label} · ${building.costMinerals}`}
          hint={`Build ${building.label} at a valid location.`}
          active={buildingTypeForMode(mode) === building.type}
          disabled={!workerSelected || minerals < building.costMinerals}
          onClick={() => onArm({ kind: 'build', buildingType: building.type })}
        />
      ))}
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
  minerals,
  onStop,
  onHold,
  onSurrender,
  onArm,
  buildHint,
  buildings
}: CommandBarProps) {
  const targetHint = isRallyMode(mode) ? 'Pick a rally target.' : `Pick a target: ${mode}.`
  return (
    <div className="flex shrink-0 flex-nowrap items-stretch gap-1 sm:gap-2">
      <OrdersGroup disabled={disabled} onStop={onStop} onHold={onHold} />
      <AttackGroup disabled={disabled} mode={mode} onArm={onArm} />
      <UtilityGroup disabled={disabled} mode={mode} onArm={onArm} onSurrender={onSurrender} />
      <ConstructionGroup
        buildings={buildings}
        minerals={minerals}
        mode={mode}
        onArm={onArm}
        workerSelected={workerSelected}
      />
      {mode !== 'idle' ? (
        <div
          className={cn(
            'flex w-max min-w-28 shrink-0 items-center justify-center rounded-xl border border-primary/60 bg-primary/10 p-1.5 text-center text-[11px] text-primary transition-opacity sm:min-w-32 sm:p-2 sm:text-xs lg:min-w-36',
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
