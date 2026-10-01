import type { InputProfile } from '@rts/renderer'
import { Flag, Gem, MousePointer2, Trees, Users } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/shared/ui/alert-dialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { LaboratoryMenu } from '../laboratory-menu'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
import type { HudFeedbackTarget } from './HudContextFeedback'
import { formatMatchTime } from './top-bar-display'
import type { HudResources } from './types'
import { useObservedDelta } from './useObservedDelta'

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
  readonly inputProfile: InputProfile
  readonly feedbackTarget: HudFeedbackTarget | null
  readonly onSurrender: () => void
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
  readonly onInputProfileChange: (profile: InputProfile) => void
}

function Stat({
  label,
  value,
  icon: Icon,
  testId,
  accentClassName,
  delta,
  highlighted
}: {
  readonly label: string
  readonly value: string
  readonly icon: typeof Gem
  readonly testId?: string
  readonly accentClassName: string
  readonly delta?: number | null
  readonly highlighted?: boolean
}) {
  const deltaText = delta === undefined || delta === null || delta === 0 ? null : `${delta > 0 ? '+' : ''}${delta}`
  return (
    <span
      data-testid={testId}
      data-feedback-highlight={highlighted === true ? 'true' : 'false'}
      className={`flex min-w-[4.25rem] flex-col items-start gap-0.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs max-[1024px]:min-w-0 max-[1024px]:px-1.5 max-[1024px]:text-[10px] ${highlighted === true ? 'border-primary/80 bg-primary/10 ring-1 ring-primary/50 motion-safe:animate-[hud-attention_250ms_ease-out]' : ''}`}
    >
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground max-[480px]:sr-only">
        {label}
      </span>
      <span className="flex items-center gap-1">
        <Icon aria-hidden={true} className={`size-3.5 ${accentClassName}`} />
        <span className={`font-mono font-medium tabular-nums ${accentClassName}`}>{value}</span>
        {deltaText !== null && (
          <span
            data-testid={`${testId ?? label.toLowerCase()}-delta`}
            className="relative -top-px font-mono text-[9px] text-foreground/80 motion-safe:animate-[hud-delta-in_180ms_ease-out]"
          >
            {deltaText}
          </span>
        )}
      </span>
    </span>
  )
}

function SurrenderAction({ onSurrender }: { readonly onSurrender: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={true}>
        <Button type="button" variant="ghost" size="icon" title="Surrender" aria-label="Surrender">
          <Flag aria-hidden={true} className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Surrender the match?</AlertDialogTitle>
          <AlertDialogDescription>This immediately ends the match and counts as a defeat.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSurrender}>Surrender</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TopBarStats({
  resources,
  unitCount,
  selectedCount,
  feedbackTarget
}: {
  readonly resources: HudResources | null
  readonly unitCount: number
  readonly selectedCount: number
  readonly feedbackTarget: HudFeedbackTarget | null
}) {
  const goldDelta = useObservedDelta(resources?.resources.GOLD ?? null)
  const supplyDelta = useObservedDelta(resources?.supply ?? null)
  return (
    <div
      data-testid="hud-topbar-stats"
      className="flex min-w-0 items-center gap-2 max-[1024px]:col-start-2 max-[1024px]:row-start-1 max-[1024px]:gap-1"
    >
      <div
        data-testid="hud-topbar-economy"
        className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/30 p-1 max-[1024px]:col-start-2 max-[1024px]:row-start-1"
      >
        <Stat
          label="Gold"
          value={resources === null ? '—' : String(resources.resources.GOLD)}
          icon={Gem}
          testId="hud-resource-gold"
          accentClassName="text-amber-400"
          delta={goldDelta}
          highlighted={feedbackTarget === 'gold'}
        />
        <Stat
          label="Wood"
          value={resources === null ? '—' : String(resources.resources.WOOD)}
          icon={Trees}
          testId="hud-resource-wood"
          accentClassName="text-emerald-400"
        />
        <Stat
          label="Supply"
          value={resources === null ? '—' : `${resources.supply} / ${resources.supplyCap}`}
          icon={Users}
          testId="hud-resource-supply"
          accentClassName="text-sky-400"
          delta={supplyDelta}
          highlighted={feedbackTarget === 'supply'}
        />
      </div>
      <div
        data-testid="hud-topbar-force"
        className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/30 p-1"
      >
        <Stat
          label="Units"
          value={String(unitCount)}
          icon={Users}
          testId="hud-resource-units"
          accentClassName="text-emerald-400"
        />
        <Stat
          label="Selected"
          value={String(selectedCount)}
          icon={MousePointer2}
          testId="hud-resource-selected"
          accentClassName="text-violet-400"
        />
      </div>
    </div>
  )
}

function TopBarControls(props: TopBarProps) {
  return (
    <div
      data-testid="hud-topbar-controls"
      className="flex items-center gap-[calc(12px*var(--hud-scale))] opacity-80 max-[1024px]:col-start-2 max-[1024px]:row-start-2 max-[1024px]:justify-self-end max-[1024px]:gap-1"
    >
      <Separator orientation="vertical" className="h-5 max-[1024px]:hidden" />
      <SurrenderAction onSurrender={props.onSurrender} />
      <LaboratoryMenu
        status={props.status}
        messageLog={props.messageLog}
        tick={props.tick}
        scenario={props.scenario}
        scenarios={props.scenarios}
        aggression={props.aggression}
        spritesEnabled={props.spritesEnabled}
        inputProfile={props.inputProfile}
        onChangeScenario={props.onChangeScenario}
        onToggleAggression={props.onToggleAggression}
        onToggleSprites={props.onToggleSprites}
        onInputProfileChange={props.onInputProfileChange}
      />
    </div>
  )
}

export function TopBar(props: TopBarProps) {
  return (
    <header
      data-testid="hud-topbar"
      className="relative grid h-full min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b bg-card/80 px-[calc(12px*var(--hud-scale))] backdrop-blur max-[1024px]:grid-cols-[minmax(0,1fr)_minmax(0,auto)] max-[1024px]:grid-rows-2 max-[1024px]:gap-x-2"
    >
      <div
        data-testid="hud-topbar-brand"
        className="flex min-w-0 items-center gap-3 max-[1024px]:col-start-1 max-[1024px]:row-start-1 max-[1024px]:gap-2"
      >
        <span aria-hidden={true} className="text-sm text-primary">
          ◆
        </span>
        <span className="text-sm font-semibold tracking-widest uppercase">RTS Idle</span>
        <Badge
          variant="outline"
          className="h-5 gap-1.5 px-1.5 text-[10px] font-normal max-[1024px]:absolute max-[1024px]:top-3/4 max-[1024px]:left-[calc(12px*var(--hud-scale))] max-[1024px]:-translate-y-1/2"
        >
          <span
            className={`size-1.5 rounded-full ${props.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          {props.status}
        </Badge>
      </div>
      <time
        data-testid="hud-topbar-time"
        className="absolute top-[calc(50%+4px)] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-background/45 px-2.5 py-1 text-sm font-semibold tabular-nums tracking-[0.14em] text-foreground shadow-sm max-[1024px]:top-3/4"
      >
        {formatMatchTime(props.tick)}
      </time>
      <div className="flex min-w-max items-center justify-self-end gap-[calc(12px*var(--hud-scale))] max-[1024px]:contents">
        <TopBarStats
          resources={props.resources}
          unitCount={props.unitCount}
          selectedCount={props.selectedCount}
          feedbackTarget={props.feedbackTarget}
        />
        <TopBarControls {...props} />
      </div>
    </header>
  )
}
