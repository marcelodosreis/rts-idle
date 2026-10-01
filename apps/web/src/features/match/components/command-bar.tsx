import type { SnapshotProductionItem } from '@rts/protocol'
import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useTimedValue } from '../hooks/use-timed-value'
import {
  backAction,
  buildingRootActions,
  commonUnitActions,
  constructionAction,
  groupedSubmenu,
  monkAction,
  submenuActions,
  workerActions
} from '../lib/command-actions'
import { isResearchItem, unitSelectionBlockReason } from '../lib/command-state'
import { blockedCommandNotification } from '../lib/hud-notifications'
import { COMMAND_LAYOUTS, type CommandLayout, createSubmenuLayout } from '../types/command-layout'
import type { CommandBarProps, MenuState } from '../types/command-types'
import type { HudConstruction } from '../types/hud-types'
import { type HudCommandAction, HudCommandButton, type HudCommandTransientState } from './hud-command-button'
import { HudContextFeedback } from './hud-context-feedback'

export type { CommandBarProps } from '../types/command-types'

const COMMAND_SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

function mapLayout(layout: CommandLayout, actions: readonly HudCommandAction[]): readonly (HudCommandAction | null)[] {
  const byId = new Map(actions.map((action) => [action.id, action]))
  return layout.map((id) => (id === null ? null : (byId.get(id) ?? null)))
}

export function CommandBar(props: CommandBarProps) {
  const [menu, setMenu] = useState<MenuState>({ kind: 'root' })
  const [confirming, setConfirming] = useState(false)
  const contextKey = commandContextKey(props)
  const feedback = useCommandFeedback(props, contextKey, setMenu, setConfirming)
  const slots = commandSlots(props, menu, setMenu, confirming, setConfirming)
  return (
    <Card data-testid="command-card" className="relative h-full min-h-0 w-full gap-2 overflow-visible py-2">
      <CardHeader className="h-5 shrink-0 px-3">
        <CardTitle className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          COMMANDS{menu.kind === 'root' ? '' : ` · ${menu.kind.toUpperCase()}`}
        </CardTitle>
      </CardHeader>
      <HudContextFeedback feedback={props.contextFeedback} instruction={props.modeInstruction} />
      <CardContent className="min-h-0 flex-1 px-3 pb-1">
        <CommandGrid slots={slots} feedback={feedback} />
      </CardContent>
    </Card>
  )
}

interface CommandFeedbackControls {
  readonly stateFor: (id: string) => HudCommandTransientState | null
  readonly onBlocked: (id: string, message: string, target: HudContextFeedback['target']) => void
  readonly onSubmit: (id: string) => void
}

function useCommandFeedback(
  props: CommandBarProps,
  contextKey: string,
  setMenu: (menu: MenuState) => void,
  setConfirming: (value: boolean) => void
): CommandFeedbackControls {
  const submitted = useTimedValue<string>(220)
  const confirmed = useTimedValue<string>(280)
  const blocked = useTimedValue<string>(280)
  const pendingConfirmation = useRef<string | null>(null)
  const previous = useRef<ObservedCommandState | null>(null)
  const resetContext = useRef<string | null>(null)

  useEffect(() => {
    if (resetContext.current === contextKey) {
      return
    }
    resetContext.current = contextKey
    setMenu({ kind: 'root' })
    setConfirming(false)
    pendingConfirmation.current = null
    previous.current = null
    submitted.clear()
    confirmed.clear()
    blocked.clear()
  }, [blocked.clear, confirmed.clear, contextKey, setConfirming, setMenu, submitted.clear])

  useEffect(() => {
    const current = observedCommandState(props.construction)
    const prior = previous.current
    previous.current = current
    const pending = pendingConfirmation.current
    if (prior === null || pending === null || !isObservedConfirmation(pending, prior, current)) {
      return
    }
    pendingConfirmation.current = null
    confirmed.show(pending)
  }, [confirmed.show, props.construction])

  return {
    stateFor: (id) => commandFeedback(id, submitted.value, confirmed.value, blocked.value),
    onBlocked: (id, message, target) => {
      blocked.show(id)
      props.onNotify(blockedCommandNotification(message, target))
    },
    onSubmit: (id) => {
      submitted.show(id)
      pendingConfirmation.current = id
    }
  }
}

function CommandGrid({
  slots,
  feedback
}: {
  readonly slots: readonly (HudCommandAction | null)[]
  readonly feedback: CommandFeedbackControls
}) {
  return (
    <fieldset className="grid h-full grid-cols-3 grid-rows-3 gap-1.5 border-0 p-0" aria-label="Command grid">
      {COMMAND_SLOT_NUMBERS.map((slotNumber) => {
        const action = slots[slotNumber - 1] ?? null
        return (
          <div
            key={slotNumber}
            data-testid={`command-slot-${slotNumber}`}
            data-command-slot={slotNumber}
            className="min-h-0 min-w-0"
          >
            {action !== null && (
              <HudCommandButton
                action={action}
                feedback={feedback.stateFor(action.id)}
                onBlocked={feedback.onBlocked}
                onSubmit={feedback.onSubmit}
              />
            )}
          </div>
        )
      })}
    </fieldset>
  )
}

interface ObservedCommandState {
  readonly exists: boolean
  readonly queue: readonly SnapshotProductionItem[]
  readonly rally: string
  readonly upgrading: boolean
}

function commandContextKey(props: CommandBarProps): string {
  if (props.construction !== null) {
    return `building:${props.construction.id}`
  }
  if (props.mineral !== null) {
    return `mineral:${props.mineral.id}`
  }
  return `units:${props.selection.map((unit) => unit.id).join(',')}`
}

function observedCommandState(construction: HudConstruction | null): ObservedCommandState {
  return {
    exists: construction !== null,
    queue: construction?.production?.queue ?? [],
    rally:
      construction?.rallyPoint === null || construction?.rallyPoint === undefined
        ? ''
        : `${construction.rallyPoint.x}:${construction.rallyPoint.y}`,
    upgrading: construction?.tierUpgrade !== null && construction?.tierUpgrade !== undefined
  }
}

function isObservedConfirmation(id: string, prior: ObservedCommandState, current: ObservedCommandState): boolean {
  if (id.startsWith('train-')) {
    const kind = id.slice('train-'.length)
    return (
      current.queue.length > prior.queue.length &&
      current.queue.some((item) => 'unitKind' in item && item.unitKind === kind)
    )
  }
  if (id.startsWith('research-')) {
    const researchType = id.slice('research-'.length).toUpperCase()
    return (
      current.queue.length > prior.queue.length &&
      current.queue.some((item) => 'researchType' in item && item.researchType === researchType)
    )
  }
  if (id === 'upgrade-castle') {
    return !prior.upgrading && current.upgrading
  }
  if (id === 'cancel-current') {
    return current.queue.length < prior.queue.length
  }
  return id === 'cancel-construction' && prior.exists && !current.exists
}

function commandFeedback(
  id: string,
  submitted: string | null,
  confirmed: string | null,
  blocked: string | null
): HudCommandTransientState | null {
  if (blocked === id) {
    return 'blocked'
  }
  if (confirmed === id) {
    return 'confirmed'
  }
  return submitted === id ? 'submitted' : null
}

function commandSlots(
  props: CommandBarProps,
  menu: MenuState,
  setMenu: (menu: MenuState) => void,
  confirming: boolean,
  setConfirming: (value: boolean) => void
): readonly (HudCommandAction | null)[] {
  if (menu.kind !== 'root') {
    return submenuSlots(props, menu, setMenu)
  }
  if (props.mineral !== null || (props.selection.length === 0 && props.construction === null)) {
    return mapLayout(COMMAND_LAYOUTS.empty, [])
  }
  if (props.construction !== null) {
    return buildingSlots(props, setMenu, confirming, setConfirming)
  }
  return unitSlots(props, setMenu)
}

function unitSlots(props: CommandBarProps, setMenu: (menu: MenuState) => void) {
  const blocked = unitSelectionBlockReason(props.selection)
  const worker = props.selection.length === 1 && props.selection[0]?.kind === 'pawn'
  const actions = worker
    ? [...workerActions(props, () => setMenu({ kind: 'build' }), blocked)]
    : [...commonUnitActions(props, blocked)]
  if (props.selection.length === 1 && props.selection[0]?.kind === 'monk') {
    actions.push(monkAction(props, blocked))
  }
  return mapLayout(worker ? COMMAND_LAYOUTS.worker : COMMAND_LAYOUTS.unit, actions)
}

function buildingSlots(
  props: CommandBarProps,
  setMenu: (menu: MenuState) => void,
  confirming: boolean,
  setConfirming: (value: boolean) => void
) {
  const building = props.construction
  if (building === null) {
    return mapLayout(COMMAND_LAYOUTS.empty, [])
  }
  if (building.status !== 'COMPLETED') {
    const action = constructionAction(confirming, () =>
      confirmOrRun(confirming, setConfirming, () => props.onCancelConstruction(building.id))
    )
    return mapLayout(COMMAND_LAYOUTS.construction, [action])
  }
  const actions = buildingRootActions(
    props,
    (kind) => setMenu({ kind }),
    confirming,
    () => confirmOrRun(confirming, setConfirming, () => cancelFirst(props, building))
  )
  return mapLayout(COMMAND_LAYOUTS.building, actions)
}

function confirmOrRun(confirming: boolean, setConfirming: (value: boolean) => void, run: () => void): void {
  if (!confirming) {
    setConfirming(true)
    return
  }
  setConfirming(false)
  run()
}

function cancelFirst(props: CommandBarProps, building: HudConstruction): void {
  const queue = building.production?.queue ?? []
  const queueIndex = queue.findIndex((candidate) => isResearchItem(candidate) || candidate.status === 'QUEUED')
  const item = queue[queueIndex]
  if (item === undefined) {
    return
  }
  if (isResearchItem(item)) {
    props.onCancelResearch(building.id, queueIndex)
    return
  }
  props.onCancelProduction(building.id, queueIndex)
}

function submenuSlots(
  props: CommandBarProps,
  menu: Exclude<MenuState, { kind: 'root' }>,
  setMenu: (menu: MenuState) => void
) {
  const all = submenuActions(props, menu.kind)
  const grouped = groupedSubmenu(all, menu, setMenu)
  const visible = menu.kind === 'build' ? closeBuildMenuAfterSelection(grouped, setMenu) : grouped
  const backTarget: MenuState = menu.group === undefined ? { kind: 'root' } : { kind: menu.kind }
  const actions = [...visible, backAction(() => setMenu(backTarget))]
  return mapLayout(createSubmenuLayout(visible.map((action) => action.id)), actions)
}

function closeBuildMenuAfterSelection(
  actions: readonly HudCommandAction[],
  setMenu: (menu: MenuState) => void
): readonly HudCommandAction[] {
  return actions.map((action) => {
    if (action.id === 'basic' || action.id === 'advanced') {
      return action
    }
    return {
      ...action,
      onActivate: () => {
        action.onActivate()
        setMenu({ kind: 'root' })
      }
    }
  })
}
