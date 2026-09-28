import { LockKeyhole } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export function LockedButton({
  label,
  reason,
  className,
  testId,
  fullWidth = true
}: {
  readonly label: string
  readonly reason: string
  readonly className?: string
  readonly testId?: string
  readonly fullWidth?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <span className={cn('cursor-not-allowed', fullWidth ? 'block w-full' : 'inline-flex w-auto')}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={true}
            className={cn(
              'h-7 w-full cursor-not-allowed overflow-hidden gap-1 border-muted-foreground/30 bg-muted/50 px-1.5 text-[11px] leading-tight text-muted-foreground opacity-80',
              className
            )}
            data-testid={testId}
          >
            <LockKeyhole aria-hidden={true} className="size-3 shrink-0" />
            <span className="min-w-0 truncate text-center">{label}</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={6} className="max-w-48 whitespace-normal text-center">
        {reason}
      </TooltipContent>
    </Tooltip>
  )
}
