import type { UnitKind } from '@rts/shared'
import { MECHANICAL_REPAIR, type RepairDefinition } from './repair.js'

export interface UnitCapabilities {
  readonly canGather: boolean
  readonly canBuild: boolean
  readonly canRepair: boolean
  readonly repairable: boolean
  readonly canAttack: boolean
  readonly canHeal: boolean
  readonly acceptsDeposit: boolean
  readonly cargoCapacity: number | null
  readonly repairProfile: RepairDefinition | null
}

export interface UnitDefinition extends UnitCapabilities {
  readonly kind: UnitKind
  readonly maxHp: number
  readonly armor: number
  readonly damage: number
  readonly rangeTiles: number
  readonly cooldownTicks: number
  readonly mechanical: boolean
  readonly movementSpeedTilesPerSecond: number
  readonly militaryAttackUpgrade: boolean
  readonly militaryDefenseUpgrade: boolean
  readonly economyUpgrade: boolean
  readonly movementUpgrade: boolean
}

const PAWN: UnitDefinition = {
  kind: 'pawn',
  maxHp: 100,
  armor: 0,
  damage: 10,
  rangeTiles: 1,
  cooldownTicks: 20,
  mechanical: true,
  movementSpeedTilesPerSecond: 4,
  militaryAttackUpgrade: false,
  militaryDefenseUpgrade: false,
  economyUpgrade: true,
  movementUpgrade: true,
  canGather: true,
  canBuild: true,
  canRepair: true,
  canAttack: true,
  canHeal: false,
  acceptsDeposit: true,
  repairable: true,
  cargoCapacity: 10,
  repairProfile: MECHANICAL_REPAIR
}

const WARRIOR: UnitDefinition = {
  ...PAWN,
  kind: 'warrior',
  maxHp: 150,
  damage: 15,
  militaryAttackUpgrade: true,
  militaryDefenseUpgrade: true,
  economyUpgrade: false,
  canGather: false,
  canBuild: false,
  canRepair: false,
  acceptsDeposit: false,
  cargoCapacity: null
}

const ARCHER: UnitDefinition = { ...WARRIOR, kind: 'archer', maxHp: 60, damage: 8, rangeTiles: 3 }
const LANCER: UnitDefinition = { ...WARRIOR, kind: 'lancer', maxHp: 120, rangeTiles: 2, movementSpeedTilesPerSecond: 5 }
const MONK: UnitDefinition = {
  ...PAWN,
  kind: 'monk',
  maxHp: 60,
  damage: 8,
  rangeTiles: 3,
  militaryDefenseUpgrade: true,
  economyUpgrade: false,
  canGather: false,
  canBuild: false,
  canRepair: false,
  canAttack: false,
  canHeal: true,
  acceptsDeposit: false,
  cargoCapacity: null,
  repairProfile: null
}

export const UNIT_DEFINITIONS: Readonly<{ [K in UnitKind]: UnitDefinition }> = {
  pawn: PAWN,
  warrior: WARRIOR,
  archer: ARCHER,
  lancer: LANCER,
  monk: MONK
}

export function unitDefinitionFor(kind: UnitKind): UnitDefinition {
  return UNIT_DEFINITIONS[kind]
}

export function unitCanAttack(kind: UnitKind | undefined): boolean {
  return kind === undefined || unitDefinitionFor(kind).canAttack
}
