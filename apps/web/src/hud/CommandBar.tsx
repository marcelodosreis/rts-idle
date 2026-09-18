import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CommandMode } from './useCommandModes'

interface CommandBarProps {
  readonly disabled: boolean
  readonly mode: CommandMode
  readonly onStop: () => void
  readonly onHold: () => void
  readonly onSurrender: () => void
  readonly onArm: (mode: 'patrol' | 'attack_move' | 'attack') => void
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
      className="w-full whitespace-nowrap"
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
 * Action palette: immediate orders (Stop/Hold/Surrender) and pending orders
 * (Patrol/Attack-move/Attack) that await a battlefield right-click. Buttons
 * are disabled without a selection except Surrender, which always works.
 */
export function CommandBar({ disabled, mode, onStop, onHold, onSurrender, onArm }: CommandBarProps) {
  return (
    <div className="flex shrink-0 items-stretch gap-2">
      <CommandGroup label="Orders">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onStop}
          className="w-full whitespace-nowrap"
        >
          Stop
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onHold}
          className="w-full whitespace-nowrap"
        >
          Hold
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSurrender} className="w-full whitespace-nowrap">
          Surrender
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
        <ArmButton label="Patrol" active={mode === 'patrol'} disabled={disabled} onClick={() => onArm('patrol')} />
      </CommandGroup>
      <div
        className={cn(
          'flex w-40 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 p-2 text-center text-xs text-muted-foreground',
          mode !== 'none' && 'border-primary/60 text-primary'
        )}
        aria-live="polite"
      >
        {mode === 'none' ? 'Right-click enemy to attack, ground to move.' : `Pick a target: ${mode}.`}
      </div>
    </div>
  )
}
