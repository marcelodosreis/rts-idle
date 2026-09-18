import { Separator } from '@/components/ui/separator'
import type { HudResources } from './types'

interface TopBarProps {
  readonly status: string
  readonly unitCount: number
  readonly selectedCount: number
  readonly tick: number
  readonly resources: HudResources | null
}

function StatChip({
  label,
  value,
  dotClass
}: {
  readonly label: string
  readonly value: string
  readonly dotClass: string
}) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs">
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      <span className="hidden text-muted-foreground sm:inline">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </span>
  )
}

function statusDot(status: string): string {
  if (status === 'connected') {
    return 'bg-emerald-500'
  }
  if (status.startsWith('error')) {
    return 'bg-destructive'
  }
  return 'bg-amber-500'
}

export function TopBar({ status, unitCount, selectedCount, tick, resources }: TopBarProps) {
  const supply = resources === null ? '—' : `${resources.supply}/${resources.supplyCap}`
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b bg-card/70 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <span aria-hidden={true} className="text-sm text-primary">
          ◆
        </span>
        <span className="text-sm font-semibold tracking-widest text-foreground uppercase">RTS Idle</span>
      </div>

      <span
        role="status"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs"
      >
        <span className={`size-1.5 rounded-full ${statusDot(status)}`} />
        status: {status}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">tick {tick}</span>

      <div className="flex-1" />

      <StatChip label="Mineral" value={resources === null ? '—' : String(resources.mineral)} dotClass="bg-amber-400" />
      <StatChip label="Energy" value={resources === null ? '—' : String(resources.energy)} dotClass="bg-sky-400" />
      <StatChip label="Supply" value={supply} dotClass="bg-emerald-400" />

      <Separator orientation="vertical" className="hidden h-5 lg:flex" />

      <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs sm:flex">
        units: {unitCount}
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs">
        selected: {selectedCount}
      </span>
    </header>
  )
}
