import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry, SnapshotBuilding } from '@rts/protocol'
import type { InputProfile } from '@rts/renderer'
import type { MatchResult, ResearchType } from '@rts/shared'
import { type CSSProperties, type RefObject, useCallback, useEffect, useRef } from 'react'
import { Toaster } from 'sonner'
import { createMatchToastScope, type ToastScope } from '@/shared/ui/toast'
import type { CommandMode } from '../commands/useCommandModes'
import type { MessageLogEntry } from '../lifecycle/useMessageLog'
import { CommandBar } from './CommandBar'
import type { HudContextFeedback } from './HudContextFeedback'
import { type HudNotification, notificationPresentation } from './hud-notifications'
import { MatchOverlay } from './MatchOverlay'
import { OverviewPanel } from './OverviewPanel'
import { SelectionPanel } from './SelectionPanel'
import { TopBar } from './TopBar'
import type { HudConstruction, HudResource, HudResources, HudSelectionUnit } from './types'
import { useHudScale } from './useHudScale'
import { useTimedValue } from './useTimedValue'

export type { HudResources, HudSelectionUnit }

export interface MatchHudProps {
  readonly status: string
  readonly messageLog: readonly MessageLogEntry[]
  readonly unitCount: number
  readonly tick: number
  readonly selection: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly resource: HudResource | null
  readonly resources: HudResources | null
  readonly hostRef: RefObject<HTMLDivElement | null>
  readonly commandMode: CommandMode
  readonly matchResult: MatchResult | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly inputProfile: InputProfile
  readonly hudNotification: HudNotification | null
  readonly completedConstructions: readonly SnapshotBuilding[]
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
    return mode.kind === 'build'
      ? (buildHint ?? 'Choose a valid building location')
      : 'Choose a rally point · Esc to cancel'
  }
  if (mode === 'attack') {
    return 'Select an enemy target · Esc to cancel'
  }
  if (mode === 'attack_move') {
    return 'Choose an attack-move destination · Esc to cancel'
  }
  if (mode === 'patrol') {
    return 'Choose a patrol destination · Esc to cancel'
  }
  if (mode === 'heal') {
    return 'Choose a damaged allied unit · Esc to cancel'
  }
  if (mode === 'gather') {
    return 'Right-click a resource to gather · Esc to cancel'
  }
  if (mode === 'repair') {
    return 'Right-click a damaged allied target · Esc to cancel'
  }
  return 'Right-click an allied building to deposit resources · Esc to cancel'
}

function addHudToast(
  toastScope: ToastScope,
  type: 'error' | 'info' | 'success',
  title: string,
  description: string,
  dedupeKey: string
): string | number {
  let id: string | number
  id = toastScope.add({
    type,
    title,
    description,
    actionProps: {
      children: 'Dismiss',
      onClick: () => toastScope.close(id)
    },
    dedupeKey
  })
  return id
}

function useConstructionCompletion(
  buildings: readonly SnapshotBuilding[],
  notify: (notification: HudNotification) => void
): void {
  const notified = useRef(new Set<SnapshotBuilding['id']>())
  useEffect(() => {
    for (const building of buildings) {
      if (!notified.current.has(building.id)) {
        notified.current.add(building.id)
        notify({ kind: 'CONSTRUCTION_COMPLETED', building })
      }
    }
  }, [buildings, notify])
}

function useResearchCompletion(resources: HudResources | null, notify: (notification: HudNotification) => void): void {
  const previous = useRef<readonly ResearchType[] | null>(null)
  useEffect(() => {
    const completed = resources?.completedResearch ?? null
    if (completed === null) {
      previous.current = null
      return
    }
    if (previous.current !== null) {
      for (const research of completed) {
        if (!previous.current.includes(research)) {
          notify({ kind: 'RESEARCH_COMPLETED', research })
        }
      }
    }
    previous.current = completed
  }, [notify, resources?.completedResearch])
}

function BottomHud(
  props: MatchHudProps & {
    readonly contextFeedback: HudContextFeedback | null
    readonly modeInstruction: string | null
    readonly onNotify: (notification: HudNotification) => void
  }
) {
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
          resource={props.resource}
          humanPlayer={0}
          feedbackTarget={props.contextFeedback?.target ?? null}
        />
        <CommandBar
          key={`${props.construction?.id ?? 'none'}:${props.resource?.id ?? 'none'}:${props.selection.map((unit) => unit.id).join(',')}`}
          selection={props.selection}
          construction={props.construction}
          resource={props.resource}
          humanPlayer={0}
          mode={props.commandMode}
          resources={props.resources}
          buildings={props.buildings}
          production={props.production}
          research={props.research}
          contextFeedback={props.contextFeedback}
          modeInstruction={props.modeInstruction}
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
          onNotify={props.onNotify}
        />
      </div>
    </footer>
  )
}

function MatchToaster() {
  return (
    <div className="[--match-toast-top:calc(48px*var(--hud-scale)+12px)] max-[850px]:[--match-toast-top:calc(96px*var(--hud-scale)+12px)]">
      <Toaster
        closeButton={true}
        position="top-right"
        offset={{ top: 'var(--match-toast-top)', right: '12px' }}
        style={{ zIndex: 9000 }}
        theme="dark"
        visibleToasts={2}
        toastOptions={{
          classNames: {
            toast: '!border-0 !bg-transparent !p-0 !shadow-none',
            error: '!border-0 !bg-transparent',
            info: '!border-0 !bg-transparent'
          }
        }}
      />
    </div>
  )
}

function useHudNotificationPresenter(): {
  readonly contextFeedback: HudContextFeedback | null
  readonly notify: (notification: HudNotification) => void
} {
  const contextFeedback = useTimedValue<HudContextFeedback>(2300)
  const toastScopeRef = useRef<ToastScope | null>(null)
  if (toastScopeRef.current === null) {
    toastScopeRef.current = createMatchToastScope()
  }
  const toastScope = toastScopeRef.current
  useEffect(() => () => toastScope.dispose(), [toastScope])
  const notify = useCallback(
    (notification: HudNotification): void => {
      const presentation = notificationPresentation(notification)
      if (presentation.context !== null) {
        contextFeedback.show(presentation.context)
      }
      if (presentation.toast !== null) {
        addHudToast(
          toastScope,
          presentation.toast.type,
          presentation.toast.title,
          presentation.toast.description,
          presentation.toast.dedupeKey
        )
      }
    },
    [contextFeedback.show, toastScope]
  )
  return { contextFeedback: contextFeedback.value, notify }
}

export function MatchHud(props: MatchHudProps) {
  const scale = useHudScale()
  const notifications = useHudNotificationPresenter()
  const style: HudScaleStyle = { '--hud-scale': scale }
  const instruction = commandHint(props.commandMode, props.buildHint)
  useResearchCompletion(props.resources, notifications.notify)
  useConstructionCompletion(props.completedConstructions, notifications.notify)
  useEffect(() => {
    if (props.hudNotification !== null) {
      notifications.notify(props.hudNotification)
    }
  }, [notifications.notify, props.hudNotification])
  return (
    <div
      data-testid="hud-root"
      className="relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground"
      style={style}
    >
      <div className="h-[calc(48px*var(--hud-scale))] shrink-0 max-[899px]:h-[calc(96px*var(--hud-scale))]">
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
          feedbackTarget={notifications.contextFeedback?.target ?? null}
          onSurrender={props.onSurrender}
          onChangeScenario={props.onChangeScenario}
          onToggleAggression={props.onToggleAggression}
          onToggleSprites={props.onToggleSprites}
          onInputProfileChange={props.onInputProfileChange}
        />
      </div>
      <MatchToaster />
      <main className="grid min-h-0 flex-1 place-items-center p-[calc(8px*var(--hud-scale))]">
        <div
          ref={props.hostRef}
          data-testid="match-host"
          className="aspect-square h-full max-h-[910px] max-w-[958px] min-h-0 min-w-0 overflow-hidden rounded-xl border border-border/50 shadow-2xl"
        />
      </main>
      <BottomHud
        {...props}
        contextFeedback={notifications.contextFeedback}
        modeInstruction={instruction}
        onNotify={notifications.notify}
      />
      {props.matchResult !== null ? <MatchOverlay result={props.matchResult} onNewMatch={props.onNewMatch} /> : null}
    </div>
  )
}
