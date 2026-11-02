/**
 * Balance tunable: circular per-source vision radius, in tiles.
 *
 * Change this single value to retune fog size for every new match. A
 * simulation may override it with `SimulationOptions.visionRadiusTiles`
 * (fixtures, scenarios, or balance experiments). Snapshots keep the radius they
 * were created with, so retuning never invalidates existing saves/replays.
 */
export const VISION_RADIUS_TILES = 7
