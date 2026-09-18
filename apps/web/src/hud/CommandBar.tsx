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
 * Action palette with at most two buttons per column: immediate orders
 * (Stop/Hold), pending attacks (Attack/Attack-move), and movement/utility
 * (Patrol/Surrender). Pending orders await a battlefield right-click; the
 * armed mode is shown as a compact hint only while active.
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
        <Button type="button" variant="outline" size="sm" onClick={onSurrender} className="w-full whitespace-nowrap">
          Surrender
        </Button>
      </CommandGroup>
      {mode !== 'none' ? (
        <div
          className={cn(
            'flex w-36 shrink-0 items-center justify-center rounded-xl border border-primary/60 bg-primary/10 p-2 text-center text-xs text-primary',
            'animate-pulse'
          )}
          aria-live="polite"
        >
          Pick a target: {mode}.
        </div>
      ) : null}
    </div>
  )
}
