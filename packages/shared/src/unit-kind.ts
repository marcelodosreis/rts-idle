/** Unit archetype (Phase 1: pawn, warrior, archer). Shared by the simulation
 * (Kind component), the protocol (snapshot `kind`), and the renderer (sprite
 * set) so the archetype is defined once. */
export type UnitKind = 'pawn' | 'warrior' | 'archer'
