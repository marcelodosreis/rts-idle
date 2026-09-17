/** A selected unit projected for the HUD (id, archetype, movement state). */
export interface HudSelectionUnit {
  readonly id: number
  readonly kind: 'pawn' | 'warrior' | 'archer'
  readonly owner: number
  readonly moving: boolean
}

export interface HudResources {
  readonly mineral: number
  readonly energy: number
  readonly supply: number
  readonly supplyCap: number
}

export const KIND_LABEL: Readonly<Record<HudSelectionUnit['kind'], string>> = {
  pawn: 'Worker',
  warrior: 'Soldier',
  archer: 'Ranger'
}
