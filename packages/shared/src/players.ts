/**
 * The four competitive slots in a match (master plan §7.1).
 * Neutral entities (resources, terrain) are not represented by this type.
 */
export const PLAYER_IDS = Object.freeze([0, 1, 2, 3] as const)

export type PlayerId = (typeof PLAYER_IDS)[number]

/** Runtime boundary guard for competitive slots; neutral entities have no owner. */
export function isPlayerId(value: unknown): value is PlayerId {
  return typeof value === 'number' && (PLAYER_IDS as readonly number[]).includes(value)
}
