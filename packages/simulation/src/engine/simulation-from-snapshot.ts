import { hashBytes } from '../snapshot/hash.js'
import { deserializeState } from '../snapshot/serialize.js'
import { Simulation } from './simulation.js'
import type { SimulationHost, SimulationSnapshot } from './simulation-host.js'

/** Restores a running simulation from a previously exported snapshot. */
export function simulationFromSnapshot(snapshot: SimulationSnapshot): SimulationHost {
  const state = deserializeState(snapshot.bytes)
  if (state.tick !== snapshot.tick) {
    throw new Error(`simulationFromSnapshot: envelope tick ${snapshot.tick} does not match state tick ${state.tick}`)
  }
  const canonicalHash = hashBytes(snapshot.bytes)
  if (canonicalHash !== snapshot.hash) {
    throw new Error(`simulationFromSnapshot: envelope hash ${snapshot.hash} does not match ${canonicalHash}`)
  }
  return new Simulation(state)
}
