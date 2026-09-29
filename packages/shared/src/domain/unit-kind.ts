/** Unit archetype (Phase 1: pawn, warrior, archer). Shared by the simulation
 * (Kind component), the protocol (snapshot `kind`), and the renderer (sprite
 * set) so the archetype is defined once. */
export const UNIT_KINDS = ['pawn', 'warrior', 'archer'] as const

export type UnitKind = (typeof UNIT_KINDS)[number]

export const TRAINABLE_UNIT_KINDS = ['pawn', 'warrior', 'archer'] as const

export type TrainableUnitKind = (typeof TRAINABLE_UNIT_KINDS)[number]
