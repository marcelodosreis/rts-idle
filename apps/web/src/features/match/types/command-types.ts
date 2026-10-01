import type { BuildCatalogEntry, ProductionCatalogEntry, ResearchCatalogEntry } from '@rts/protocol'
import type { ResearchType, TrainableUnitKind } from '@rts/shared'
import type { HudContextFeedback } from '../components/hud-context-feedback'
import type { CommandMode } from '../hooks/use-command-modes'
import type { HudNotification } from '../lib/hud-notifications'
import type { HudConstruction, HudMineral, HudResources, HudSelectionUnit } from './hud-types'

export type SubmenuKind = 'build' | 'train' | 'research' | 'upgrade'
export type MenuState =
  | { readonly kind: 'root' }
  | { readonly kind: SubmenuKind; readonly group?: 'basic' | 'advanced' }

export interface CommandBarProps {
  readonly selection: readonly HudSelectionUnit[]
  readonly construction: HudConstruction | null
  readonly mineral: HudMineral | null
  readonly mode: CommandMode
  readonly resources: HudResources | null
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: readonly ProductionCatalogEntry[]
  readonly research: readonly ResearchCatalogEntry[]
  readonly onStop: () => void
  readonly onHold: () => void
  readonly onArm: (mode: Exclude<CommandMode, 'idle'>) => void
  readonly onCancelConstruction: (buildingId: number) => void
  readonly onCancelProduction: (producerId: number, queueIndex: number) => void
  readonly onCancelResearch: (monasteryId: number, queueIndex: number) => void
  readonly onUpgradeCastle: (castleId: number) => void
  readonly onResearch: (monasteryId: number, researchType: ResearchType) => void
  readonly onTrain: (unitKind: TrainableUnitKind) => void
  readonly onSetRally: (producerId: number) => void
  readonly contextFeedback: HudContextFeedback | null
  readonly modeInstruction: string | null
  readonly onNotify: (notification: HudNotification) => void
}
