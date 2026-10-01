import type { InputProfile } from '@rts/renderer'
import { useState } from 'react'
import { CollapsibleSection } from '@/shared/ui/collapsible-section'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

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
