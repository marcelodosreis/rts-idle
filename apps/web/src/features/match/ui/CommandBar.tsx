import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  backAction,
  buildingRootActions,
  commonUnitActions,
  constructionAction,
  groupedSubmenu,
  monkAction,
  submenuActions,
  workerActions
} from './command-actions'
import { COMMAND_LAYOUTS, type CommandLayout, createSubmenuLayout } from './command-layout'
import { isResearchItem, unitSelectionBlockReason } from './command-state'
import type { CommandBarProps, MenuState } from './command-types'
import { type HudCommandAction, HudCommandButton } from './HudCommandButton'
import type { HudConstruction } from './types'

export type { CommandBarProps } from './command-types'

const COMMAND_SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

function mapLayout(layout: CommandLayout, actions: readonly HudCommandAction[]): readonly (HudCommandAction | null)[] {
  const byId = new Map(actions.map((action) => [action.id, action]))
  return layout.map((id) => (id === null ? null : (byId.get(id) ?? null)))
}

export function CommandBar(props: CommandBarProps) {
  const [menu, setMenu] = useState<MenuState>({ kind: 'root' })
  const [confirming, setConfirming] = useState(false)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const feedback = (id: string, message: string): void => {
    setFeedbackId(id)
    props.onFeedback(message)
    window.setTimeout(() => setFeedbackId((current) => (current === id ? null : current)), 400)
  }
  const slots = commandSlots(props, menu, setMenu, confirming, setConfirming)
  return (
    <Card data-testid="command-card" className="relative h-full min-h-0 w-full gap-2 overflow-hidden py-2">
      <CardHeader className="h-5 shrink-0 px-3">
        <CardTitle className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          COMMANDS{menu.kind === 'root' ? '' : ` · ${menu.kind.toUpperCase()}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-3 pb-1">
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
                  <HudCommandButton action={action} feedback={feedbackId === action.id} onBlocked={feedback} />
                )}
              </div>
            )
          })}
        </fieldset>
      </CardContent>
    </Card>
  )
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
