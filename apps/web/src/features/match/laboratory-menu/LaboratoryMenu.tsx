import type { InputProfile } from '@rts/renderer'
import { FlaskConical, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Separator } from '@/shared/ui/separator'
import { preloadLaboratoryPage } from '../../../routes/laboratory-route-loader.js'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
import { OptionsSection, ServerLogSection, SessionSection, statusDot } from './laboratory-menu-sections.js'

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
        className="flex min-w-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className={`size-1.5 shrink-0 rounded-full ${statusDot(status)}`} />
        <span className="truncate">status: {status}</span>
        <Settings2 className="size-3 opacity-60" aria-hidden={true} />
      </button>
    </PopoverTrigger>
  )
}

function DevToolsHeader() {
  return (
    <div className="border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-primary" aria-hidden={true} />
        <div>
          <p className="text-sm font-semibold">DevTools</p>
          <p className="text-xs text-muted-foreground">Match session and development tools</p>
        </div>
      </div>
    </div>
  )
}

function LaboratoryLink() {
  return (
    <div className="border-t p-3">
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
  )
}

export function LaboratoryMenu(props: LaboratoryMenuProps) {
  return (
    <Popover>
      <DevToolsTrigger status={props.status} />
      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1rem))] p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div>
          <DevToolsHeader />
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
