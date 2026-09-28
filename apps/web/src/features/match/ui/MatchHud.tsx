import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry } from '@rts/protocol'
import type { InputProfile } from '@rts/renderer'
import type { MatchResult, ResearchType } from '@rts/shared'
import type { RefObject } from 'react'
import type { CommandMode } from '../commands/useCommandModes'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
import { CommandBar } from './CommandBar'
import { MatchOverlay } from './MatchOverlay'
import { SelectionPanel } from './SelectionPanel'
import { TopBar } from './TopBar'
import type { HudConstruction, HudMineral, HudResources, HudSelectionUnit } from './types'

export type { HudResources, HudSelectionUnit }

function selectionCanAttack(selection: readonly HudSelectionUnit[]): boolean {
  return selection.length > 0 && selection.every((unit) => unit.kind !== 'monk')
}

function selectionCanHeal(selection: readonly HudSelectionUnit[]): boolean {
  return selection.length === 1 && selection[0]?.kind === 'monk' && (selection[0].healCooldownRemaining ?? 0) === 0
}

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
  readonly onUpgradeCastle: (castleId: number) => void
  readonly onResearch: (monasteryId: number, researchType: ResearchType) => void
  readonly onCancelResearch: (monasteryId: number, queueIndex: number) => void
  readonly onTrain: (unitKind: ProductionCatalogEntry['unitKind']) => void
  readonly onSetRally: (producerId: number) => void
  readonly workerSelected: boolean
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
  readonly research: readonly ResearchCatalogEntry[]
  readonly buildHint: string | null
  readonly onNewMatch: () => void
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
  readonly onInputProfileChange: (profile: InputProfile) => void
}

type MatchHudFooterProps = Pick<
  MatchHudProps,
  | 'selection'
  | 'construction'
  | 'mineral'
  | 'buildings'
  | 'onCancelConstruction'
  | 'onCancelProduction'
  | 'onUpgradeCastle'
  | 'onResearch'
  | 'onCancelResearch'
  | 'onTrain'
  | 'onSetRally'
  | 'production'
  | 'research'
  | 'resources'
  | 'commandMode'
  | 'onStop'
  | 'onHold'
  | 'onSurrender'
  | 'onArm'
  | 'workerSelected'
  | 'buildHint'
>

function MatchHudFooter({
  selection,
  construction,
  mineral,
  buildings,
  onCancelConstruction,
  onCancelProduction,
  onUpgradeCastle,
  onResearch,
  onCancelResearch,
  onTrain,
  onSetRally,
  production,
  research,
  resources,
  commandMode,
  onStop,
  onHold,
  onSurrender,
  onArm,
  workerSelected,
  buildHint
}: MatchHudFooterProps) {
  return (
    <footer className="flex h-44 max-h-44 min-h-44 shrink-0 flex-nowrap items-stretch justify-center gap-2 overflow-x-auto overflow-y-hidden border-t bg-card/70 px-3 pt-3 pb-5 backdrop-blur sm:gap-3 sm:px-4 sm:pt-4 sm:pb-6">
      <SelectionPanel
        selection={selection}
        construction={construction}
        mineral={mineral}
        buildings={buildings}
        humanPlayer={0}
        onCancelConstruction={onCancelConstruction}
        onCancelProduction={onCancelProduction}
        onUpgradeCastle={onUpgradeCastle}
        onResearch={onResearch}
        onCancelResearch={onCancelResearch}
        onTrain={onTrain}
        onSetRally={onSetRally}
        production={production}
        research={research}
        resources={resources}
      />
      <CommandBar
        disabled={selection.length === 0}
        mode={commandMode}
        onStop={onStop}
        onHold={onHold}
        onSurrender={onSurrender}
        {...{ workerSelected, attackCapableSelected: selectionCanAttack(selection) }}
        monkSelected={selection.length === 1 && selection[0]?.kind === 'monk'}
        healReady={selectionCanHeal(selection)}
        healCooldownRemaining={selection[0]?.healCooldownRemaining ?? 0}
        minerals={resources?.mineral ?? 0}
        castleTier={resources?.castleTier ?? 1}
        buildHint={buildHint}
        buildings={buildings}
        onArm={onArm}
      />
    </footer>
  )
}

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
  onUpgradeCastle,
  onResearch,
  onCancelResearch,
  onTrain,
  onSetRally,
  workerSelected,
  buildings,
  production,
  research,
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
      <MatchHudFooter
        {...{
          selection,
          construction,
          mineral,
          buildings,
          onCancelConstruction,
          onCancelProduction,
          onUpgradeCastle,
          onResearch,
          onCancelResearch,
          onTrain,
          onSetRally,
          production,
          research,
          resources,
          commandMode,
          onStop,
          onHold,
          onSurrender,
          onArm,
          workerSelected,
          buildHint
        }}
      />
      {matchResult !== null ? <MatchOverlay result={matchResult} onNewMatch={onNewMatch} /> : null}
    </div>
  )
}
