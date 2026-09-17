import { deserializeState } from '../snapshot/serialize.js'
import { Simulation } from './simulation.js'
import type { SimulationHost, SimulationSnapshot } from './simulation-host.js'

/** Restores a running simulation from a previously exported snapshot. */
export function simulationFromSnapshot(snapshot: SimulationSnapshot): SimulationHost {
  const state = deserializeState(snapshot.bytes)
  return new Simulation(state)
}
