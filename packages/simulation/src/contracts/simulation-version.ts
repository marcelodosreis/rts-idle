/**
 * Simulation version tag. Single source of truth for the simulation package
 * version, used in RulesIdentity and the package `version` export.
 *
 * 0.2.0: players/wallet + SURRENDER joined the canonical state (Phase 1).
 * 0.3.0: the Kind component joined the canonical state (Phase 1).
 * 0.4.0: Economy v0 components and GATHER orders joined canonical state.
 * 0.5.0: BUILD construction state, orders, and map bounds joined canonical state.
 */
export const SIMULATION_VERSION = '0.5.0'
