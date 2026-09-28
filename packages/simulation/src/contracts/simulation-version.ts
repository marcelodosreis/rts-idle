/**
 * Simulation version tag. Single source of truth for the simulation package
 * version, used in RulesIdentity and the package `version` export.
 *
 * 0.2.0: players/wallet + SURRENDER joined the canonical state (Phase 1).
 * 0.3.0: the Kind component joined the canonical state (Phase 1).
 * 0.4.0: Economy v0 components and GATHER orders joined canonical state.
 * 0.5.0: BUILD construction state, orders, and map bounds joined canonical state.
 * 0.6.0: BARRACKS construction and marker joined canonical state.
 * 0.7.0: Base, Barracks, and Construction were unified as Building.
 * 0.8.0: BUILD orders persist their deterministic construction work point.
 * 0.9.0: player supply and Supply Depot state joined canonical snapshots.
 * 0.10.0: production queues and reserved supply joined canonical snapshots.
 * 0.11.0: producer rally points joined canonical snapshots.
 * 0.12.0: Castle II, Research, modifiers, and fixed-point movement joined
 * canonical snapshots.
 * 0.13.0: Monk and Research entries joined one canonical Monastery queue.
 * 0.14.0: Monk Heal orders, cooldowns, and ability events joined canonical state.
 */
export const SIMULATION_VERSION = '0.14.0'
