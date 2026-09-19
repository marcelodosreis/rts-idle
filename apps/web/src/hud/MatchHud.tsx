import type { RefObject } from 'react'
import { CommandBar } from './CommandBar'
import { MatchOverlay } from './MatchOverlay'
import { SelectionPanel } from './SelectionPanel'
import { TopBar } from './TopBar'
import type { HudResources, HudSelectionUnit } from './types'
import type { CommandMode } from './useCommandModes'

export type { HudResources, HudSelectionUnit }

export interface MatchHudProps {
  readonly status: string
  readonly unitCount: number
  readonly tick: number
  readonly selection: readonly HudSelectionUnit[]
  readonly resources: HudResources | null
  /** Renderer host mount point, owned by the match session. */
  readonly hostRef: RefObject<HTMLDivElement | null>
  readonly commandMode: CommandMode
  readonly matchResult: 'victory' | 'defeat' | 'draw' | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly onStop: () => void
  readonly onHold: () => void
  readonly onSurrender: () => void
  readonly onArm: (mode: 'patrol' | 'attack_move' | 'attack') => void
  readonly onNewMatch: () => void
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
}

/**
 * Match screen chrome: a glass top bar with resources/status, the battlefield
 * centered in a framed container, and a bottom dock with the selection context
 * card and the command palette. Reads the player observation only — it never
 * computes gameplay. Renders the result overlay when the match finishes.
 */
export function MatchHud({
  status,
  unitCount,
  tick,
  selection,
  resources,
  hostRef,
  commandMode,
  matchResult,
  scenario,
  scenarios,
  aggression,
  spritesEnabled,
  onStop,
  onHold,
  onSurrender,
  onArm,
  onNewMatch,
  onChangeScenario,
  onToggleAggression,
  onToggleSprites
}: MatchHudProps) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        status={status}
        unitCount={unitCount}
        selectedCount={selection.length}
        tick={tick}
        resources={resources}
        scenario={scenario}
        scenarios={scenarios}
        aggression={aggression}
        spritesEnabled={spritesEnabled}
        onChangeScenario={onChangeScenario}
        onToggleAggression={onToggleAggression}
        onToggleSprites={onToggleSprites}
      />
      <main className="grid min-h-0 flex-1 place-items-center p-4">
        <div
          ref={hostRef}
          className="aspect-square h-full max-w-full overflow-hidden rounded-xl border border-border/50 shadow-2xl"
        />
      </main>
      <footer className="flex min-h-40 shrink-0 flex-wrap items-stretch justify-center gap-3 border-t bg-card/70 p-3 backdrop-blur">
        <SelectionPanel selection={selection} />
        <CommandBar
          disabled={selection.length === 0}
          mode={commandMode}
          onStop={onStop}
          onHold={onHold}
          onSurrender={onSurrender}
          onArm={onArm}
        />
      </footer>
      {matchResult !== null ? <MatchOverlay result={matchResult} onNewMatch={onNewMatch} /> : null}
    </div>
  )
}
