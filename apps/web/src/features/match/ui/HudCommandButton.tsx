import { LockKeyhole, type LucideIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/shared/ui/popover'

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
  readonly onActivate: () => void
}

interface HudCommandButtonProps {
  readonly action: HudCommandAction
  readonly feedback: boolean
  readonly onBlocked: (actionId: string, reason: string) => void
}

function commandVariant(action: HudCommandAction): 'default' | 'destructive' | 'outline' {
  if (action.destructive === true) {
    return 'destructive'
  }
  return action.active === true ? 'default' : 'outline'
}

function CommandPopover({ action, children }: { readonly action: HudCommandAction; readonly children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={true}>
        <span
          className="block h-full w-full"
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
        >
          {children}
        </span>
      </PopoverTrigger>
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

export function HudCommandButton({ action, feedback, onBlocked }: HudCommandButtonProps) {
  const Icon = action.icon
  const blocked = action.blockedReason !== undefined
  const activate = (): void => {
    if (action.blockedReason !== undefined) {
      onBlocked(action.id, action.blockedReason)
      return
    }
    action.onActivate()
  }
  return (
    <CommandPopover action={action}>
      <Button
        type="button"
        variant={commandVariant(action)}
        aria-disabled={blocked}
        aria-pressed={action.active ?? false}
        aria-label={action.label}
        onClick={activate}
        data-command-id={action.id}
        data-testid={action.id}
        className={cn(
          'relative flex h-full w-full min-w-0 flex-col gap-1 overflow-hidden px-1 py-1.5 text-[10px] leading-none',
          !blocked &&
            !action.active &&
            'border-border/80 bg-card text-foreground shadow-sm hover:border-primary/60 hover:bg-accent/70 hover:text-accent-foreground',
          action.active && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
          blocked && 'border-muted-foreground/30 bg-muted/60 text-muted-foreground shadow-none',
          feedback && 'ring-2 ring-destructive transition-[box-shadow] duration-300'
        )}
      >
        <Icon
          aria-hidden={true}
          className={cn('size-5 min-h-5 min-w-5', action.active ? 'text-black' : !blocked && 'text-primary')}
        />
        <span className="max-w-full truncate">{action.label}</span>
        {blocked && <LockKeyhole aria-hidden={true} className="absolute top-1 right-1 size-3" />}
      </Button>
    </CommandPopover>
  )
}
