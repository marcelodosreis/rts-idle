import type { InputProfile } from '@rts/renderer'
import { ChevronDown, FlaskConical, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Label } from '@/shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import { Switch } from '@/shared/ui/switch'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'

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

function statusDot(status: string): string {
  if (status === 'connected') {
    return 'bg-emerald-500'
  }
  if (status.startsWith('error')) {
    return 'bg-destructive'
  }
  return 'bg-amber-500'
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

export function LaboratoryMenu({
  status,
  messageLog,
  tick,
  scenario,
  scenarios,
  aggression,
  spritesEnabled,
  inputProfile,
  onChangeScenario,
  onToggleAggression,
  onToggleSprites,
  onInputProfileChange
}: LaboratoryMenuProps) {
  const [isServerLogOpen, setIsServerLogOpen] = useState(false)
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  return (
    <Popover>
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
      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1rem))] p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div>
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" aria-hidden={true} />
              <div>
                <p className="text-sm font-semibold">DevTools</p>
                <p className="text-xs text-muted-foreground">Match session and development tools</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section aria-labelledby="game-devtools-log-heading" className="space-y-2">
              <button
                type="button"
                aria-label="Toggle Server Log"
                aria-expanded={isServerLogOpen}
                aria-controls="game-devtools-log-content"
                className="flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setIsServerLogOpen((open) => !open)}
              >
                <span
                  id="game-devtools-log-heading"
                  className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  Server Log
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">Tick: {tick}</span>
                  <ChevronDown
                    className={`size-3.5 text-muted-foreground transition-transform ${isServerLogOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
              {isServerLogOpen && (
                <div
                  id="game-devtools-log-content"
                  className="max-h-44 overflow-y-auto rounded-md border border-border/60 bg-muted/20"
                >
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
              )}
            </section>

            <Separator />

            <section aria-labelledby="laboratory-session-heading" className="space-y-3">
              <button
                type="button"
                aria-label="Toggle Match session"
                aria-expanded={isSessionOpen}
                aria-controls="laboratory-session-content"
                className="flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setIsSessionOpen((open) => !open)}
              >
                <span
                  id="laboratory-session-heading"
                  className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  Match session
                </span>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform ${isSessionOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isSessionOpen && (
                <div id="laboratory-session-content" className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="laboratory-scenario" className="text-xs text-muted-foreground">
                      Scenario
                    </Label>
                    <Select value={scenario} onValueChange={onChangeScenario}>
                      <SelectTrigger id="laboratory-scenario" aria-label="scenario" className="h-8 w-full text-xs">
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
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="laboratory-input-profile" className="text-xs text-muted-foreground">
                      Input profile
                    </Label>
                    <Select
                      value={inputProfile}
                      onValueChange={(value) => onInputProfileChange(value === 'trackpad' ? 'trackpad' : 'mouse')}
                    >
                      <SelectTrigger
                        id="laboratory-input-profile"
                        aria-label="input profile"
                        className="h-8 w-full text-xs"
                      >
                        <SelectValue placeholder="input" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mouse" className="text-xs">
                          Mouse
                        </SelectItem>
                        <SelectItem value="trackpad" className="text-xs">
                          Trackpad
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            <section aria-labelledby="laboratory-options-heading" className="space-y-2">
              <button
                type="button"
                aria-label="Toggle Match options"
                aria-expanded={isOptionsOpen}
                aria-controls="laboratory-options-content"
                className="flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setIsOptionsOpen((open) => !open)}
              >
                <span
                  id="laboratory-options-heading"
                  className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  Match options
                </span>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOptionsOpen && (
                <div id="laboratory-options-content" className="space-y-2">
                  <label
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60"
                    htmlFor="laboratory-sprites"
                  >
                    <span className="text-xs">Sprites</span>
                    <Switch
                      id="laboratory-sprites"
                      checked={spritesEnabled}
                      onCheckedChange={onToggleSprites}
                      aria-label="toggle sprites"
                    />
                  </label>
                  <label
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60"
                    htmlFor="laboratory-aggression"
                  >
                    <span className="text-xs">Passive enemies</span>
                    <Switch
                      id="laboratory-aggression"
                      checked={aggression === 'passive'}
                      onCheckedChange={onToggleAggression}
                      aria-label="toggle enemy aggression"
                    />
                  </label>
                </div>
              )}
            </section>
          </div>

          <div className="border-t p-3">
            <Link
              className="flex items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              to="/laboratory"
            >
              Open Laboratory
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
