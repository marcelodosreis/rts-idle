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
  active,
  disabled,
  onClick
}: {
  readonly label: string
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
      className="h-7 w-full whitespace-nowrap px-1.5 text-xs"
      aria-pressed={active}
    >
      {label}
    </Button>
  )
}

function CommandGroup({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-2">
      <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">{label}</span>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
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
    <div className="flex flex-wrap items-stretch gap-2">
      <CommandGroup label="Orders">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onStop}
          className="h-7 w-full whitespace-nowrap px-1.5 text-xs"
        >
          Stop
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onHold}
          className="h-7 w-full whitespace-nowrap px-1.5 text-xs"
        >
          Hold
        </Button>
      </CommandGroup>
      <CommandGroup label="Attack">
        <ArmButton label="Attack" active={mode === 'attack'} disabled={disabled} onClick={() => onArm('attack')} />
        <ArmButton
          label="Attack-move"
          active={mode === 'attack_move'}
          disabled={disabled}
          onClick={() => onArm('attack_move')}
        />
      </CommandGroup>
      <CommandGroup label="Utility">
        <ArmButton label="Patrol" active={mode === 'patrol'} disabled={disabled} onClick={() => onArm('patrol')} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSurrender}
          className="h-7 w-full whitespace-nowrap px-1.5 text-xs"
        >
          Surrender
        </Button>
      </CommandGroup>
      <CommandGroup label="Construction">
        {buildings.map((building) => (
          <ArmButton
            key={building.type}
            label={`${building.label} · ${building.costMinerals}`}
            active={buildingTypeForMode(mode) === building.type}
            disabled={!workerSelected || minerals < building.costMinerals}
            onClick={() => onArm({ kind: 'build', buildingType: building.type })}
          />
        ))}
      </CommandGroup>
      {mode !== 'idle' ? (
        <div
          className={cn(
            'flex w-36 shrink-0 items-center justify-center rounded-xl border border-primary/60 bg-primary/10 p-2 text-center text-xs text-primary transition-opacity',
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
