import { LockKeyhole, type LucideIcon } from 'lucide-react'
import { type ReactElement, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle
} from '@/shared/ui/popover'
import type { HudFeedbackTarget } from './HudContextFeedback'

export const HUD_COMMAND_FEEDBACK_KINDS = ['arm', 'navigate', 'submit'] as const
export type HudCommandFeedbackKind = (typeof HUD_COMMAND_FEEDBACK_KINDS)[number]
export const HUD_COMMAND_TRANSIENT_STATES = ['submitted', 'confirmed', 'blocked'] as const
export type HudCommandTransientState = (typeof HUD_COMMAND_TRANSIENT_STATES)[number]

export interface HudCommandAction {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly icon: LucideIcon
  readonly blockedReason?: string | undefined
  readonly cost?: string | undefined
  readonly time?: string | undefined
  readonly hotkey?: string | undefined
  readonly active?: boolean | undefined
  readonly destructive?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly feedbackKind?: HudCommandFeedbackKind | undefined
  readonly blockedTarget?: HudFeedbackTarget | undefined
  readonly onActivate: () => void
}

interface HudCommandButtonProps {
  readonly action: HudCommandAction
  readonly feedback: HudCommandTransientState | null
  readonly onBlocked: (actionId: string, reason: string, target: HudFeedbackTarget) => void
  readonly onSubmit: (actionId: string) => void
}

function commandVariant(action: HudCommandAction): 'default' | 'destructive' | 'outline' {
  if (action.destructive === true) {
    return 'destructive'
  }
  return action.active === true ? 'default' : 'outline'
}

function commandState(
  action: HudCommandAction,
  blocked: boolean,
  feedback: HudCommandTransientState | null
): HudCommandTransientState | 'armed' | 'idle' | 'disabled' {
  if (action.disabled === true) {
    return 'disabled'
  }
  if (blocked) {
    return 'blocked'
  }
  if (feedback !== null) {
    return feedback
  }
  return action.active === true ? 'armed' : 'idle'
}

function CommandPopover({
  action,
  children
}: {
  readonly action: HudCommandAction
  readonly children: (handlers: {
    readonly onPointerEnter: () => void
    readonly onPointerLeave: () => void
    readonly onFocus: () => void
    readonly onBlur: () => void
  }) => ReactElement
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild={true}>
        <div className="h-full w-full">
          {children({
            onPointerEnter: () => setOpen(true),
            onPointerLeave: () => setOpen(false),
            onFocus: () => setOpen(true),
            onBlur: () => setOpen(false)
          })}
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        sideOffset={4}
        className="z-[10000] w-max max-w-none space-y-2 whitespace-nowrap p-3 text-xs"
      >
        <PopoverHeader>
          <PopoverTitle>{action.label}</PopoverTitle>
          <PopoverDescription>{action.description}</PopoverDescription>
        </PopoverHeader>
        {action.blockedReason !== undefined && <p className="text-destructive">{action.blockedReason}</p>}
        {action.cost !== undefined && <p>Cost: {action.cost}</p>}
        {action.time !== undefined && <p>Time: {action.time}</p>}
        {action.hotkey !== undefined && <p className="text-muted-foreground">Shortcut: {action.hotkey}</p>}
      </PopoverContent>
    </Popover>
  )
}

export function HudCommandButton({ action, feedback, onBlocked, onSubmit }: HudCommandButtonProps) {
  const Icon = action.icon
  const blocked = action.blockedReason !== undefined
  const activate = (): void => {
    if (action.blockedReason !== undefined) {
      onBlocked(action.id, action.blockedReason, action.blockedTarget ?? 'command')
      return
    }
    if (action.feedbackKind === 'submit') {
      onSubmit(action.id)
    }
    action.onActivate()
  }
  return (
    <CommandPopover action={action}>
      {(popoverHandlers) => (
        <Button
          type="button"
          variant={commandVariant(action)}
          aria-disabled={blocked}
          aria-pressed={action.active ?? false}
          aria-label={action.label}
          disabled={action.disabled === true}
          onClick={activate}
          data-command-id={action.id}
          data-testid={action.id}
          data-command-state={commandState(action, blocked, feedback)}
          {...popoverHandlers}
          className={cn(
            'relative flex h-full w-full min-w-0 flex-col gap-1 overflow-hidden px-1 py-1.5 text-[10px] leading-none transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.97] active:border-primary/80 active:bg-accent motion-reduce:transform-none',
            !blocked &&
              !action.active &&
              'border-border/80 bg-card text-foreground shadow-sm hover:border-primary/60 hover:bg-accent/70 hover:text-accent-foreground',
            action.active && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
            blocked && 'border-muted-foreground/30 bg-muted/60 text-muted-foreground shadow-none',
            feedback === 'submitted' && 'border-primary/80 bg-primary/10 ring-1 ring-primary/60',
            feedback === 'confirmed' && 'border-emerald-500/70 bg-emerald-500/10 ring-1 ring-emerald-500/50',
            feedback === 'blocked' &&
              'border-destructive/80 bg-destructive/10 ring-2 ring-destructive/70 motion-safe:animate-[hud-attention_260ms_ease-out]'
          )}
        >
          <Icon
            aria-hidden={true}
            className={cn('size-5 min-h-5 min-w-5', action.active ? 'text-black' : !blocked && 'text-primary')}
          />
          <span className="max-w-full truncate">{action.label}</span>
          {blocked && <LockKeyhole aria-hidden={true} className="absolute top-1 right-1 size-3" />}
        </Button>
      )}
    </CommandPopover>
  )
}
