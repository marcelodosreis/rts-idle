import type { InputProfile } from '@rts/renderer'
import { FlaskConical, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Separator } from '@/shared/ui/separator'
import { preloadLaboratoryPage } from '../../../../routes/laboratory-route-loader'
import type { MessageLogEntry } from '../../hooks/use-message-log'
import { statusDot } from '../../lib/status-dot'
import { OptionsSection } from './options-section'
import { ServerLogSection } from './server-log-section'
import { SessionSection } from './session-section'

interface LaboratoryMenuProps {
  readonly status: string
  readonly messageLog: readonly MessageLogEntry[]
  readonly tick: number
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly inputProfile: InputProfile
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
  readonly onInputProfileChange: (profile: InputProfile) => void
}

function DevToolsTrigger({ status }: { readonly status: string }) {
  return (
    <PopoverTrigger asChild={true}>
      <button
        type="button"
        aria-label="Open DevTools menu"
        title={`DevTools: ${status}`}
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-border/60 bg-muted/40 transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="relative grid size-4 place-items-center">
          <span className={`absolute top-0 right-0 size-1.5 rounded-full ${statusDot(status)}`} />
          <Settings2 className="size-3.5 opacity-75" aria-hidden={true} />
        </span>
      </button>
    </PopoverTrigger>
  )
}

function DevToolsHeader({ status }: { readonly status: string }) {
  return (
    <div className="border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" aria-hidden={true} />
          <div>
            <p className="text-sm font-semibold">DevTools</p>
            <p className="text-xs text-muted-foreground">Match session and development tools</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`size-1.5 rounded-full ${statusDot(status)}`} aria-hidden={true} />
          <span>status: {status}</span>
        </span>
      </div>
    </div>
  )
}

function LaboratoryLink() {
  return (
    <div className="border-t p-3">
      <div className="flex flex-col gap-2">
        <Link
          className="flex items-center justify-center rounded-md border border-border/70 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          to="/"
        >
          Back to start
        </Link>
        <Link
          className="flex items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          to="/laboratory"
          onClick={preloadLaboratoryPage}
          onFocus={preloadLaboratoryPage}
          onPointerEnter={preloadLaboratoryPage}
        >
          Open Laboratory
        </Link>
      </div>
    </div>
  )
}

export function LaboratoryMenu(props: LaboratoryMenuProps) {
  return (
    <Popover>
      <DevToolsTrigger status={props.status} />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="mr-2 w-[min(22rem,calc(100vw-1rem))] p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div>
          <DevToolsHeader status={props.status} />
          <div className="space-y-4 p-4">
            <ServerLogSection messageLog={props.messageLog} tick={props.tick} />
            <Separator />
            <SessionSection
              scenario={props.scenario}
              scenarios={props.scenarios}
              inputProfile={props.inputProfile}
              onChangeScenario={props.onChangeScenario}
              onInputProfileChange={props.onInputProfileChange}
            />
            <Separator />
            <OptionsSection
              spritesEnabled={props.spritesEnabled}
              aggression={props.aggression}
              onToggleSprites={props.onToggleSprites}
              onToggleAggression={props.onToggleAggression}
            />
          </div>
          <LaboratoryLink />
        </div>
      </PopoverContent>
    </Popover>
  )
}
