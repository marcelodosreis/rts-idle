import { useState } from 'react'
import { CollapsibleSection } from '@/shared/ui/collapsible-section'
import { Switch } from '@/shared/ui/switch'

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
