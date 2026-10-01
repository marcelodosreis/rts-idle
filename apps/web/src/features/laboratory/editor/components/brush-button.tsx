import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { BrushDef } from '../types/terrain-brushes'

interface BrushButtonProps {
  readonly brush: BrushDef
  readonly active: boolean
  readonly onClick: () => void
}

export function BrushButton({ brush, active, onClick }: BrushButtonProps) {
  const content = (
    <button
      type="button"
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'}`}
      onClick={onClick}
    >
      <span className="text-sm">{brush.icon}</span>
      <span className="leading-tight">{brush.label}</span>
      {brush.beta === true && (
        <span className="rounded bg-yellow-500/20 px-1 py-px text-[7px] font-semibold text-yellow-600 dark:text-yellow-400">
          WIP
        </span>
      )}
    </button>
  )
  if (brush.shortcut === undefined) {
    return content
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>{content}</TooltipTrigger>
      <TooltipContent side="right">
        {brush.label} <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">{brush.shortcut}</kbd>
      </TooltipContent>
    </Tooltip>
  )
}
