import type { BuildCatalogEntry, ProductionCatalogEntry } from '@rts/protocol'
import type { InputProfile } from '@rts/renderer'
import type { MatchResult } from '@rts/shared'
import type { RefObject } from 'react'
import type { CommandMode } from '../commands/useCommandModes'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
import { CommandBar } from './CommandBar'
import { MatchOverlay } from './MatchOverlay'
import { SelectionPanel } from './SelectionPanel'
import { TopBar } from './TopBar'
import type { HudConstruction, HudMineral, HudResources, HudSelectionUnit } from './types'

export type { HudResources, HudSelectionUnit }

export interface MatchHudProps {
  readonly status: string
  readonly messageLog: readonly MessageLogEntry[]
  readonly unitCount: number
  readonly tick: number
  readonly selection: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly mineral: HudMineral | null
  readonly resources: HudResources | null
  /** Renderer host mount point, owned by the match session. */
  readonly hostRef: RefObject<HTMLDivElement | null>
  readonly commandMode: CommandMode
  readonly matchResult: MatchResult | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly inputProfile: InputProfile
  readonly onStop: () => void
  readonly onHold: () => void
  readonly onSurrender: () => void
  readonly onArm: (mode: Exclude<CommandMode, 'idle'>) => void
  readonly onCancelConstruction: (buildingId: number) => void
  readonly onCancelProduction: (producerId: number, queueIndex: number) => void
  readonly onTrain: (unitKind: ProductionCatalogEntry['unitKind']) => void
  readonly onSetRally: (producerId: number) => void
  readonly workerSelected: boolean
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
  readonly buildHint: string | null
  readonly onNewMatch: () => void
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
  readonly onInputProfileChange: (profile: InputProfile) => void
}

/**
 * Match screen chrome: a glass top bar with resources/status, the battlefield
 * centered in a framed container, and a bottom dock with the selection context
 * card and the command palette. Reads the player observation only — it never
 * computes gameplay. Renders the result overlay when the match finishes.
 */
export function MatchHud({
  status,
  messageLog,
  unitCount,
  tick,
  selection,
  construction,
  mineral,
  resources,
  hostRef,
  commandMode,
  matchResult,
  scenario,
  scenarios,
  aggression,
  spritesEnabled,
  inputProfile,
  onStop,
  onHold,
  onSurrender,
  onArm,
  onCancelConstruction,
  onCancelProduction,
  onTrain,
  onSetRally,
  workerSelected,
  buildings,
  production,
  buildHint,
  onNewMatch,
  onChangeScenario,
  onToggleAggression,
  onToggleSprites,
  onInputProfileChange
}: MatchHudProps) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        status={status}
        messageLog={messageLog}
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
        inputProfile={inputProfile}
        onInputProfileChange={onInputProfileChange}
      />
      <main className="grid min-h-0 flex-1 place-items-center p-4">
        <div
          ref={hostRef}
          className="aspect-square h-full max-h-full max-w-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-border/50 shadow-2xl"
        />
      </main>
      <footer className="flex h-40 max-h-40 min-h-40 shrink-0 flex-nowrap items-stretch justify-center gap-2 overflow-hidden border-t bg-card/70 p-3 backdrop-blur sm:gap-3 sm:p-4">
        <SelectionPanel
          selection={selection}
          compact={commandMode !== 'idle'}
          construction={construction}
          mineral={mineral}
          buildings={buildings}
          humanPlayer={0}
          onCancelConstruction={onCancelConstruction}
          onCancelProduction={onCancelProduction}
          onTrain={onTrain}
          onSetRally={onSetRally}
          production={production}
          resources={resources}
        />
        <CommandBar
          disabled={selection.length === 0}
          mode={commandMode}
          onStop={onStop}
          onHold={onHold}
          onSurrender={onSurrender}
          workerSelected={workerSelected}
          minerals={resources?.mineral ?? 0}
          buildHint={buildHint}
          buildings={buildings}
          onArm={onArm}
        />
      </footer>
      {matchResult !== null ? <MatchOverlay result={matchResult} onNewMatch={onNewMatch} /> : null}
    </div>
  )
}
