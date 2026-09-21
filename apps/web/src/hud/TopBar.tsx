import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { MessageLogEntry } from '../screens/useMessageLog'
import type { HudResources } from './types'

interface TopBarProps {
  readonly status: string
  readonly messageLog: readonly MessageLogEntry[]
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
    <span
      data-testid={`hud-resource-${label.toLowerCase()}`}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs"
    >
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

function supplyDot(resources: HudResources | null): string {
  if (resources === null || resources.supply < resources.supplyCap) {
    return 'bg-emerald-400'
  }
  if (resources.supply === resources.supplyCap) {
    return 'bg-amber-400'
  }
  return 'bg-destructive'
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function eventTypeClass(type: MessageLogEntry['type']): string {
  switch (type) {
    case 'error':
      return 'text-destructive'
    case 'command':
      return 'text-blue-400'
    case 'event':
      return 'text-amber-400'
    default:
      return 'text-foreground'
  }
}

/**
 * Top bar: brand/status/tick, match controls (scenario, aggression, sprites),
 * and resource stats. All zones live in a single wrapping flex row, so on
 * narrow viewports they wrap to additional rows instead of overlapping.
 */
export function TopBar({
  status,
  messageLog,
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

        <Popover>
          <PopoverTrigger asChild={true}>
            <span
              role="status"
              className="flex min-w-0 cursor-default items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs"
            >
              <span className={`size-1.5 shrink-0 rounded-full ${statusDot(status)}`} />
              <span className="truncate">status: {status}</span>
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" sideOffset={4} className="w-80 p-0">
            <div className="border-b px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Server Log</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {messageLog.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No messages yet.</p>
              ) : (
                <ul className="divide-y">
                  {messageLog.map((entry) => (
                    <li key={`${entry.timestamp}-${entry.message}`} className="flex gap-2 px-3 py-1.5">
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span className={`text-xs ${eventTypeClass(entry.type)}`}>{entry.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>
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

        <StatChip
          label="Supply"
          value={resources === null ? '0 / 0' : `${resources.supply} / ${resources.supplyCap}`}
          dotClass={supplyDot(resources)}
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
