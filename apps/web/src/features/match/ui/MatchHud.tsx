import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry } from '@rts/protocol'
import type { InputProfile } from '@rts/renderer'
import type { MatchResult, ResearchType } from '@rts/shared'
import { type CSSProperties, type RefObject, useEffect, useRef } from 'react'
import { toast } from '@/shared/ui/toast'
import type { CommandMode } from '../commands/useCommandModes'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
import { CommandBar } from './CommandBar'
import { MatchOverlay } from './MatchOverlay'
import { OverviewPanel } from './OverviewPanel'
import { SelectionPanel } from './SelectionPanel'
import { TopBar } from './TopBar'
import type { HudConstruction, HudMineral, HudResources, HudSelectionUnit } from './types'
import { useHudScale } from './useHudScale'

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
  readonly hostRef: RefObject<HTMLDivElement | null>
  readonly commandMode: CommandMode
  readonly matchResult: MatchResult | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly inputProfile: InputProfile
  readonly hudFeedback: string | null
  readonly buildHint: string | null
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
  readonly research: readonly ResearchCatalogEntry[]
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
  readonly onNewMatch: () => void
  readonly onChangeScenario: (id: string) => void
  readonly onToggleAggression: () => void
  readonly onToggleSprites: () => void
  readonly onInputProfileChange: (profile: InputProfile) => void
}

type HudScaleStyle = CSSProperties & { readonly '--hud-scale': number }

function commandHint(mode: CommandMode, buildHint: string | null): string | null {
  if (mode === 'idle') {
    return null
  }
  if (typeof mode === 'object') {
    return mode.kind === 'build' ? (buildHint ?? 'Choose a valid building location.') : 'Choose a rally point.'
  }
  if (mode === 'attack') {
    return 'Choose an enemy target.'
  }
  if (mode === 'attack_move') {
    return 'Choose an attack-move destination.'
  }
  if (mode === 'patrol') {
    return 'Choose a patrol destination.'
  }
  if (mode === 'heal') {
    return 'Choose a damaged allied unit.'
  }
  if (mode === 'gather') {
    return 'Right-click a resource to gather.'
  }
  if (mode === 'repair') {
    return 'Right-click a damaged allied target.'
  }
  return 'Right-click an allied building to deposit resources.'
}

function addHudToast(type: 'error' | 'info', title: string, description: string): string | number {
  let id: string | number
  id = toast.add({
    type,
    title,
    description,
    actionProps: {
      children: 'Dismiss',
      onClick: () => toast.close(id)
    }
  })
  return id
}

function useInstructionToast(instruction: string | null): void {
  const instructionToastId = useRef<string | number | null>(null)
  const hadInstruction = useRef(false)
  useEffect(() => {
    if (instructionToastId.current !== null) {
      toast.close(instructionToastId.current)
      instructionToastId.current = null
    }
    if (instruction !== null) {
      instructionToastId.current = addHudToast('info', 'Order ready', instruction)
      hadInstruction.current = true
    } else if (hadInstruction.current) {
      toast.closeAll()
      hadInstruction.current = false
    }
    return () => {
      if (instructionToastId.current !== null) {
        toast.close(instructionToastId.current)
        instructionToastId.current = null
      }
    }
  }, [instruction])
}

function BottomHud(props: MatchHudProps & { readonly onFeedback: (message: string) => void }) {
  return (
    <footer
      className="grid w-full min-w-0 shrink-0 overflow-visible border-t bg-card/65 p-[calc(12px*var(--hud-scale))] backdrop-blur"
      style={{ height: '240px' }}
    >
      <div className="mx-auto grid min-h-0 w-full max-w-[958px] min-w-0 grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)_minmax(0,0.7fr)] gap-[calc(12px*var(--hud-scale))]">
        <OverviewPanel />
        <SelectionPanel
          selection={props.selection}
          construction={props.construction}
          mineral={props.mineral}
          humanPlayer={0}
        />
        <CommandBar
          key={`${props.construction?.id ?? 'none'}:${props.mineral?.id ?? 'none'}:${props.selection.map((unit) => unit.id).join(',')}`}
          selection={props.selection}
          construction={props.construction}
          mineral={props.mineral}
          mode={props.commandMode}
          resources={props.resources}
          buildings={props.buildings}
          production={props.production}
          research={props.research}
          onStop={props.onStop}
          onHold={props.onHold}
          onArm={props.onArm}
          onCancelConstruction={props.onCancelConstruction}
          onCancelProduction={props.onCancelProduction}
          onCancelResearch={props.onCancelResearch}
          onUpgradeCastle={props.onUpgradeCastle}
          onResearch={props.onResearch}
          onTrain={props.onTrain}
          onSetRally={props.onSetRally}
          onFeedback={props.onFeedback}
        />
      </div>
    </footer>
  )
}

export function MatchHud(props: MatchHudProps) {
  const scale = useHudScale()
  const showFeedback = (message: string): void => {
    addHudToast('error', 'Command unavailable', message)
  }
  const style: HudScaleStyle = { '--hud-scale': scale }
  const instruction = commandHint(props.commandMode, props.buildHint)
  useInstructionToast(instruction)
  useEffect(() => {
    if (props.hudFeedback !== null) {
      addHudToast('error', 'Match error', props.hudFeedback)
    }
  }, [props.hudFeedback])
  return (
    <div
      data-testid="hud-root"
      className="relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground"
      style={style}
    >
      <div className="h-[calc(48px*var(--hud-scale))] shrink-0 max-[639px]:h-[calc(96px*var(--hud-scale))]">
        <TopBar
          status={props.status}
          messageLog={props.messageLog}
          unitCount={props.unitCount}
          selectedCount={props.selection.length}
          tick={props.tick}
          resources={props.resources}
          scenario={props.scenario}
          scenarios={props.scenarios}
          aggression={props.aggression}
          spritesEnabled={props.spritesEnabled}
          inputProfile={props.inputProfile}
          onSurrender={props.onSurrender}
          onChangeScenario={props.onChangeScenario}
          onToggleAggression={props.onToggleAggression}
          onToggleSprites={props.onToggleSprites}
          onInputProfileChange={props.onInputProfileChange}
        />
      </div>
      <main className="grid min-h-0 flex-1 place-items-center p-[calc(8px*var(--hud-scale))]">
        <div
          ref={props.hostRef}
          data-testid="match-host"
          className="aspect-square h-full max-h-[910px] max-w-[958px] min-h-0 min-w-0 overflow-hidden rounded-xl border border-border/50 shadow-2xl"
        />
      </main>
      <BottomHud {...props} onFeedback={showFeedback} />
      {props.matchResult !== null ? <MatchOverlay result={props.matchResult} onNewMatch={props.onNewMatch} /> : null}
    </div>
  )
}
