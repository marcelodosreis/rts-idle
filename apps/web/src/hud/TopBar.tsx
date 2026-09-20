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
 * Top bar: brand/status/tick, match controls (scenario, aggression, sprites),
 * and resource stats. All zones live in a single wrapping flex row, so on
 * narrow viewports they wrap to additional rows instead of overlapping.
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
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card/70 px-4 py-2 backdrop-blur">
      <div data-testid="hud-topbar-brand" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <span aria-hidden={true} className="text-sm text-primary">
            ◆
          </span>
          <span className="text-sm font-semibold tracking-widest text-foreground uppercase">RTS Idle</span>
        </div>

        <span
          role="status"
          className="flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs"
        >
          <span className={`size-1.5 shrink-0 rounded-full ${statusDot(status)}`} />
          <span className="truncate">status: {status}</span>
        </span>
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">tick {tick}</span>
      </div>

      <div data-testid="hud-topbar-controls" className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

      <div data-testid="hud-topbar-stats" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:ml-auto">
        <StatChip
          label="Mineral"
          value={resources === null ? '0' : String(resources.mineral)}
          dotClass="bg-amber-400"
        />

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
