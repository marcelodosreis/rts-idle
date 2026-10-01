import type { BuildingType, ResearchType, TrainableUnitKind } from '@rts/shared'
import {
  ArrowLeft,
  ArrowUpCircle,
  BookOpen,
  Castle,
  CircleStop,
  Crosshair,
  Folder,
  Hammer,
  HeartPulse,
  Home,
  type LucideIcon,
  MapPin,
  PackageCheck,
  Pickaxe,
  Route,
  Shield,
  ShieldCheck,
  Swords,
  TowerControl,
  UserPlus,
  Warehouse,
  Wrench,
  XCircle
} from 'lucide-react'
import { buildingTypeForMode, isRallyMode } from '../commands/useCommandModes'
import {
  blockedFeedbackTarget,
  buildBlockReason,
  isResearchItem,
  researchBlockReason,
  trainingBlockReason,
  upgradeBlockReason
} from './command-state'
import type { CommandBarProps, MenuState, SubmenuKind } from './command-types'
import type { HudCommandAction } from './HudCommandButton'
import { TRAINABLE_LABEL } from './types'

const BUILDING_ICONS: Readonly<Record<BuildingType, LucideIcon>> = {
  CASTLE: Castle,
  BARRACKS: Warehouse,
  HOUSE: Home,
  ARCHERY: Crosshair,
  MONASTERY: BookOpen,
  TOWER: TowerControl
}

const UNIT_ICONS: Readonly<Record<TrainableUnitKind, LucideIcon>> = {
  pawn: Hammer,
  warrior: Swords,
  archer: Crosshair,
  lancer: Shield,
  monk: HeartPulse
}

const RESEARCH_LABELS: Readonly<Record<ResearchType, string>> = {
  ATTACK: 'Attack',
  DEFENSE: 'Defense',
  ECONOMY: 'Economy',
  MOVEMENT: 'Movement'
}

export function commonUnitActions(props: CommandBarProps, blockedReason?: string): readonly HudCommandAction[] {
  const monksSelected = props.selection.some((unit) => unit.kind === 'monk')
  const attackReason = blockedReason ?? (monksSelected ? 'Monks cannot attack.' : undefined)
  return [
    {
      id: 'stop',
      label: 'Stop',
      description: 'Cancel current orders.',
      icon: CircleStop,
      blockedReason,
      feedbackKind: 'submit',
      onActivate: props.onStop
    },
    {
      id: 'hold',
      label: 'Hold',
      description: 'Hold position and engage nearby enemies.',
      icon: ShieldCheck,
      blockedReason,
      feedbackKind: 'submit',
      onActivate: props.onHold
    },
    {
      id: 'patrol',
      label: 'Patrol',
      description: 'Patrol between the current position and a target.',
      icon: Route,
      blockedReason,
      active: props.mode === 'patrol',
      feedbackKind: 'arm',
      onActivate: () => props.onArm('patrol')
    },
    {
      id: 'attack',
      label: 'Attack',
      description: 'Attack a selected enemy.',
      icon: Swords,
      blockedReason: attackReason,
      active: props.mode === 'attack',
      feedbackKind: 'arm',
      onActivate: () => props.onArm('attack')
    },
    {
      id: 'attack-move',
      label: 'Attack Move',
      description: 'Move toward a point while engaging enemies.',
      icon: Crosshair,
      blockedReason: attackReason,
      active: props.mode === 'attack_move',
      feedbackKind: 'arm',
      onActivate: () => props.onArm('attack_move')
    }
  ]
}

export function workerActions(
  props: CommandBarProps,
  openBuild: () => void,
  blockedReason?: string
): readonly HudCommandAction[] {
  const worker = props.selection[0]
  return [
    ...commonUnitActions(props, blockedReason),
    {
      id: 'gather',
      label: 'Gather',
      description: 'Gather resources. You can also right-click a resource.',
      icon: Pickaxe,
      blockedReason,
      active: props.mode === 'gather',
      feedbackKind: 'arm',
      onActivate: () => props.onArm('gather')
    },
    {
      id: 'repair',
      label: 'Repair',
      description: 'Repair a damaged allied mechanical target. You can also right-click it.',
      icon: Wrench,
      blockedReason,
      active: props.mode === 'repair',
      feedbackKind: 'arm',
      onActivate: () => props.onArm('repair')
    },
    {
      id: 'build',
      label: 'Build',
      description: 'Open the construction menu.',
      icon: Hammer,
      blockedReason,
      active: buildingTypeForMode(props.mode) !== null,
      feedbackKind: 'navigate',
      onActivate: openBuild
    },
    {
      id: 'deposit',
      label: 'Deposit',
      description: 'Deposit carried resources. You can also right-click an allied building.',
      icon: PackageCheck,
      blockedReason:
        blockedReason ?? (worker?.carrying === true ? undefined : 'This Worker is not carrying resources.'),
      active: props.mode === 'deposit',
      feedbackKind: 'arm',
      onActivate: () => props.onArm('deposit')
    }
  ]
}

export function monkAction(props: CommandBarProps, blockedReason?: string): HudCommandAction {
  const cooldown = props.selection[0]?.healCooldownRemaining ?? 0
  return {
    id: 'contextual',
    label: 'Heal',
    description: 'Heal a damaged allied unit.',
    icon: HeartPulse,
    blockedReason: blockedReason ?? (cooldown > 0 ? `Heal ready in ${Math.ceil(cooldown / 20)}s.` : undefined),
    active: props.mode === 'heal',
    feedbackKind: 'arm',
    onActivate: () => props.onArm('heal')
  }
}

export function buildingRootActions(
  props: CommandBarProps,
  open: (kind: SubmenuKind) => void,
  confirm: boolean,
  cancelCurrent: () => void
): readonly HudCommandAction[] {
  const building = props.construction
  if (building === null) {
    return []
  }
  const options = props.production.filter((entry) => entry.producer === building.buildingType)
  const actions: HudCommandAction[] = []
  if (options.length > 0) {
    actions.push({
      id: 'train',
      label: 'Train',
      description: 'Open available unit training.',
      icon: UserPlus,
      onActivate: () => open('train')
    })
  }
  if (building.buildingType === 'MONASTERY' && props.research.length > 0) {
    actions.push({
      id: 'research',
      label: 'Research',
      description: 'Open available research.',
      icon: BookOpen,
      onActivate: () => open('research')
    })
  }
  if (building.buildingType === 'CASTLE' && (building.tier ?? 1) < 2 && building.tierUpgrade == null) {
    actions.push({
      id: 'upgrade',
      label: 'Upgrade',
      description: 'Open available Castle upgrades.',
      icon: ArrowUpCircle,
      onActivate: () => open('upgrade')
    })
  }
  if (options.length > 0) {
    actions.push({
      id: 'rally',
      label: 'Rally',
      description: 'Choose where newly trained units should move.',
      icon: MapPin,
      active: isRallyMode(props.mode) && props.mode.producerId === building.id,
      feedbackKind: 'arm',
      onActivate: () => props.onSetRally(building.id)
    })
  }
  if (building.production?.queue.some((item) => isResearchItem(item) || item.status === 'QUEUED') === true) {
    actions.push({
      id: 'cancel-current',
      label: confirm ? 'Confirm' : 'Cancel Current',
      description: 'Cancel the first production queue item.',
      icon: XCircle,
      destructive: confirm,
      feedbackKind: confirm ? 'submit' : 'navigate',
      onActivate: cancelCurrent
    })
  }
  return actions
}

export function constructionAction(confirm: boolean, onActivate: () => void): HudCommandAction {
  return {
    id: 'cancel-construction',
    label: confirm ? 'Confirm' : 'Cancel Build',
    description: 'Cancel this construction and refund its remaining value.',
    icon: XCircle,
    destructive: confirm,
    feedbackKind: confirm ? 'submit' : 'navigate',
    onActivate
  }
}

export function backAction(onActivate: () => void): HudCommandAction {
  return { id: 'back', label: 'Back', description: 'Return to the previous command menu.', icon: ArrowLeft, onActivate }
}

export function groupedSubmenu(
  actions: readonly HudCommandAction[],
  menu: MenuState,
  setMenu: (menu: MenuState) => void
): readonly HudCommandAction[] {
  if (menu.kind === 'root' || actions.length <= 8) {
    return actions
  }
  if (menu.group === 'basic') {
    return actions.slice(0, 8)
  }
  if (menu.group === 'advanced') {
    return actions.slice(8, 16)
  }
  return [
    {
      id: 'basic',
      label: 'Basic',
      description: 'Show the first command group.',
      icon: Folder,
      onActivate: () => setMenu({ kind: menu.kind, group: 'basic' })
    },
    {
      id: 'advanced',
      label: 'Advanced',
      description: 'Show the advanced command group.',
      icon: Folder,
      onActivate: () => setMenu({ kind: menu.kind, group: 'advanced' })
    }
  ]
}

function buildActions(props: CommandBarProps): readonly HudCommandAction[] {
  return props.buildings.map((entry) => ({
    id: `build-${entry.type.toLowerCase()}`,
    label: entry.label,
    description: `Build ${entry.label} at a valid location.`,
    icon: BUILDING_ICONS[entry.type],
    blockedReason: buildBlockReason(entry, props.resources),
    blockedTarget: blockedFeedbackTarget(buildBlockReason(entry, props.resources)),
    cost: `${entry.costMinerals} minerals`,
    time: `${Math.ceil(entry.constructionTicks / 20)}s`,
    active: buildingTypeForMode(props.mode) === entry.type,
    feedbackKind: 'arm',
    onActivate: () => props.onArm({ kind: 'build', buildingType: entry.type })
  }))
}

function trainingActions(props: CommandBarProps): readonly HudCommandAction[] {
  const building = props.construction
  if (building === null) {
    return []
  }
  const queueLength = building.production?.queue.length ?? 0
  return props.production
    .filter((entry) => entry.producer === building.buildingType)
    .map((entry) => ({
      id: `train-${entry.unitKind}`,
      label: TRAINABLE_LABEL[entry.unitKind],
      description: `Train a ${TRAINABLE_LABEL[entry.unitKind]}.`,
      icon: UNIT_ICONS[entry.unitKind],
      blockedReason: trainingBlockReason(entry, props.resources, queueLength),
      blockedTarget: blockedFeedbackTarget(trainingBlockReason(entry, props.resources, queueLength)),
      cost: `${entry.costMinerals} minerals · ${entry.supply} supply`,
      time: `${Math.ceil(entry.trainingTicks / 20)}s`,
      feedbackKind: 'submit',
      onActivate: () => props.onTrain(entry.unitKind)
    }))
}

function researchActions(props: CommandBarProps): readonly HudCommandAction[] {
  const building = props.construction
  if (building === null) {
    return []
  }
  const queueLength = building.production?.queue.length ?? 0
  return props.research.map((entry) => ({
    id: `research-${entry.researchType.toLowerCase()}`,
    label: RESEARCH_LABELS[entry.researchType],
    description: `Research ${RESEARCH_LABELS[entry.researchType]}.`,
    icon: BookOpen,
    blockedReason: researchBlockReason(entry, props.resources, queueLength),
    blockedTarget: blockedFeedbackTarget(researchBlockReason(entry, props.resources, queueLength)),
    cost: `${entry.costMinerals} minerals`,
    time: `${Math.ceil(entry.researchTicks / 20)}s`,
    feedbackKind: 'submit',
    onActivate: () => props.onResearch(building.id, entry.researchType)
  }))
}

function upgradeActions(props: CommandBarProps): readonly HudCommandAction[] {
  const building = props.construction
  if (building === null) {
    return []
  }
  const cost = props.buildings.find((entry) => entry.type === 'CASTLE')?.costMinerals ?? 0
  return [
    {
      id: 'upgrade-castle',
      label: 'Castle II',
      description: 'Upgrade this Castle to tier II.',
      icon: ArrowUpCircle,
      blockedReason: upgradeBlockReason(building, cost, props.resources),
      blockedTarget: blockedFeedbackTarget(upgradeBlockReason(building, cost, props.resources)),
      cost: `${cost} minerals`,
      feedbackKind: 'submit',
      onActivate: () => props.onUpgradeCastle(building.id)
    }
  ]
}

export function submenuActions(props: CommandBarProps, kind: SubmenuKind): readonly HudCommandAction[] {
  if (kind === 'build') {
    return buildActions(props)
  }
  if (kind === 'train') {
    return trainingActions(props)
  }
  if (kind === 'research') {
    return researchActions(props)
  }
  return upgradeActions(props)
}
