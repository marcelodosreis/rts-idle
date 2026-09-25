import { ChevronDown } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'

export interface CollapsibleSectionProps {
  readonly label: string
  readonly children: ReactNode
  readonly defaultOpen?: boolean
  readonly open?: boolean
  readonly onToggle?: () => void
  readonly headingId?: string
  readonly contentId?: string
  readonly icon?: string
  readonly trailing?: ReactNode
}

export function CollapsibleSection({
  label,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  headingId,
  contentId,
  icon,
  trailing
}: CollapsibleSectionProps) {
  const generatedId = useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const resolvedHeadingId = headingId ?? `${generatedId}-heading`
  const resolvedContentId = contentId ?? `${generatedId}-content`
  const toggle = (): void => {
    if (onToggle !== undefined) {
      onToggle()
      return
    }
    setUncontrolledOpen((value) => !value)
  }

  return (
    <section
      aria-labelledby={resolvedHeadingId}
      className={icon === undefined ? 'space-y-2' : 'border-b border-border/30 last:border-b-0'}
    >
      <button
        type="button"
        aria-label={`Toggle ${label}`}
        aria-expanded={open}
        aria-controls={resolvedContentId}
        className={
          icon === undefined
            ? 'flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring/50'
            : 'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/20'
        }
        onClick={toggle}
      >
        {icon !== undefined && <span>{icon}</span>}
        <span
          id={resolvedHeadingId}
          className={
            icon === undefined ? 'text-[11px] font-semibold tracking-widest text-muted-foreground uppercase' : 'flex-1'
          }
        >
          {label}
        </span>
        {trailing}
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id={resolvedContentId} className={icon === undefined ? 'space-y-2' : 'space-y-1 px-1 pb-2'}>
          {children}
        </div>
      )}
    </section>
  )
}
