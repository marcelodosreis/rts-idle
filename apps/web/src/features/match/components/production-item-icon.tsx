import type { SnapshotProductionItem } from '@rts/protocol'
import type { UnitKind } from '@rts/shared'
import { Crosshair, FlaskConical, HeartPulse, type LucideIcon, Pickaxe, Shield, Sword } from 'lucide-react'
import { isResearchItem } from '../lib/production-label'

const ICONS: Readonly<Record<UnitKind, LucideIcon>> = {
  pawn: Pickaxe,
  warrior: Sword,
  archer: Crosshair,
  lancer: Shield,
  monk: HeartPulse
}

interface ProductionItemIconProps {
  readonly item: SnapshotProductionItem
  readonly className?: string
}

export function ProductionItemIcon({ item, className }: ProductionItemIconProps) {
  const Icon = isResearchItem(item) ? FlaskConical : ICONS[item.unitKind]
  return <Icon className={className} aria-hidden="true" />
}
