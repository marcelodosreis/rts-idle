/** Unit archetypes shared by simulation, protocol, and renderer. */
export const UNIT_KINDS = ['pawn', 'warrior', 'archer', 'lancer', 'monk'] as const

export type UnitKind = (typeof UNIT_KINDS)[number]

export const TRAINABLE_UNIT_KINDS = ['pawn', 'warrior', 'archer', 'lancer', 'monk'] as const

export type TrainableUnitKind = (typeof TRAINABLE_UNIT_KINDS)[number]
