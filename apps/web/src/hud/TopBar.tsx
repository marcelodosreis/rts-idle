import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { HudResources } from './types'

interface TopBarProps {
  readonly status: string
  readonly unitCount: number
  readonly selectedCount: number
  readonly tick: number
  readonly resources: HudResources | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
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

/**
 * Top bar: title/status/tick/scenario pinned to the left edge, with the stat
 * chips centered across the full width (the left group is absolutely placed so
 * the centered group is truly centered, not offset by the left content).
 */
export function TopBar({
  status,
  unitCount,
  selectedCount,
  tick,
  resources,
  scenario,
  scenarios,
  aggression,
  spritesEnabled,
  onChangeScenario,
  onToggleAggression,
  onToggleSprites
}: TopBarProps) {
  const supply = resources === null ? '0/0' : `${resources.supply}/${resources.supplyCap}`
  return (
    <header className="relative flex min-h-14 shrink-0 items-center justify-center border-b bg-card/70 px-4 py-2 backdrop-blur">
      <div className="absolute left-4 flex max-w-[52vw] flex-wrap items-center gap-x-4 gap-y-1.5">
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

        <Select value={scenario} onValueChange={onChangeScenario}>
          <SelectTrigger aria-label="scenario" className="h-8 w-40 text-xs">
            <SelectValue placeholder="scenario" />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map((id) => (
              <SelectItem key={id} value={id} className="text-xs">
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="aggression" className="text-xs text-muted-foreground">
            Enemies passive
          </Label>
          <Switch
            id="aggression"
            checked={aggression === 'passive'}
            onCheckedChange={onToggleAggression}
            aria-label="toggle enemy aggression"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="sprites" className="text-xs text-muted-foreground">
            Sprites
          </Label>
          <Switch id="sprites" checked={spritesEnabled} onCheckedChange={onToggleSprites} aria-label="toggle sprites" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        <StatChip
          label="Mineral"
          value={resources === null ? '0' : String(resources.mineral)}
          dotClass="bg-amber-400"
        />
        <StatChip label="Energy" value={resources === null ? '0' : String(resources.energy)} dotClass="bg-sky-400" />
        <StatChip label="Supply" value={supply} dotClass="bg-emerald-400" />

        <Separator orientation="vertical" className="hidden h-5 lg:flex" />

        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs sm:flex">
          units: {unitCount}
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs">
          selected: {selectedCount}
        </span>
      </div>
    </header>
  )
}
