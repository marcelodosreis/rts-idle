import type { InputProfile } from '@rts/renderer'
import { useState } from 'react'
import { CollapsibleSection } from '@/shared/ui/collapsible-section'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'

export function statusDot(status: string): string {
  if (status === 'connected') {
    return 'bg-emerald-500'
  }
  return status.startsWith('error') ? 'bg-destructive' : 'bg-amber-500'
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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

export function ServerLogSection({
  messageLog,
  tick
}: {
  readonly messageLog: readonly MessageLogEntry[]
  readonly tick: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <CollapsibleSection
      headingId="game-devtools-log-heading"
      contentId="game-devtools-log-content"
      label="Server Log"
      open={open}
      onToggle={() => setOpen((value) => !value)}
      trailing={<span className="text-xs tabular-nums text-muted-foreground">Tick: {tick}</span>}
    >
      <div className="max-h-44 overflow-y-auto rounded-md border border-border/60 bg-muted/20">
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
    </CollapsibleSection>
  )
}

export interface SessionSectionProps {
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly inputProfile: InputProfile
  readonly onChangeScenario: (id: string) => void
  readonly onInputProfileChange: (profile: InputProfile) => void
}

export function SessionSection({
  scenario,
  scenarios,
  inputProfile,
  onChangeScenario,
  onInputProfileChange
}: SessionSectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <CollapsibleSection
      headingId="laboratory-session-heading"
      contentId="laboratory-session-content"
      label="Match session"
      open={open}
      onToggle={() => setOpen((value) => !value)}
    >
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
          <SelectTrigger id="laboratory-input-profile" aria-label="input profile" className="h-8 w-full text-xs">
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
    </CollapsibleSection>
  )
}

export interface OptionsSectionProps {
  readonly spritesEnabled: boolean
  readonly aggression: 'offensive' | 'passive'
  readonly onToggleSprites: () => void
  readonly onToggleAggression: () => void
}

export function OptionsSection({
  spritesEnabled,
  aggression,
  onToggleSprites,
  onToggleAggression
}: OptionsSectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <CollapsibleSection
      headingId="laboratory-options-heading"
      contentId="laboratory-options-content"
      label="Match options"
      open={open}
      onToggle={() => setOpen((value) => !value)}
    >
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
    </CollapsibleSection>
  )
}
