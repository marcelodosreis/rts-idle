import type { InputProfile } from '@rts/renderer'
import { Separator } from '@/shared/ui/separator'
import { LaboratoryMenu } from '../laboratory-menu'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
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
  readonly inputProfile: InputProfile
  readonly onInputProfileChange: (profile: InputProfile) => void
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

function supplyDot(resources: HudResources | null): string {
  if (resources === null || resources.supply < resources.supplyCap) {
    return 'bg-emerald-400'
  }
  if (resources.supply === resources.supplyCap) {
    return 'bg-amber-400'
  }
  return 'bg-destructive'
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
  onToggleSprites,
  inputProfile,
  onInputProfileChange
}: TopBarProps) {
  return (
    <header className="flex min-h-14 shrink-0 border-b bg-card/70 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-6">
        <div data-testid="hud-topbar-brand" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <span aria-hidden={true} className="text-sm text-primary">
              ◆
            </span>
            <span className="text-sm font-semibold tracking-widest text-foreground uppercase">RTS Idle</span>
          </div>
        </div>

        <div data-testid="hud-topbar-controls" className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LaboratoryMenu
            status={status}
            messageLog={messageLog}
            tick={tick}
            scenario={scenario}
            scenarios={scenarios}
            aggression={aggression}
            spritesEnabled={spritesEnabled}
            inputProfile={inputProfile}
            onChangeScenario={onChangeScenario}
            onToggleAggression={onToggleAggression}
            onToggleSprites={onToggleSprites}
            onInputProfileChange={onInputProfileChange}
          />
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
      </div>
    </header>
  )
}
