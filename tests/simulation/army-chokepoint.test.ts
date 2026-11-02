import { FIXED_SCALE } from '@rts/shared'
import {
  type ScheduledCommand,
  type SimulationHost,
  simulationFromSnapshot,
  UNIT_COLLISION_RADIUS_FIXED
} from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { type ArmyChokepointFixture, armyChokepointCommands, createArmyChokepointFixture } from '../fixtures/index.js'

const COLLISION_DIAMETER = UNIT_COLLISION_RADIUS_FIXED * 2
const DEADLOCK_TICKS = 80
const FINISHED_TICK = 470
const FINISHED_HASH = '546a200710fff2f329ba84b3126eca06eda1c49395a4512fab1f73648c269652'

function tileOf(fixed: number): number {
  return Math.floor(fixed / FIXED_SCALE)
}

function waterKeys(fixture: ArmyChokepointFixture): ReadonlySet<string> {
  return new Set(fixture.invalidTiles.map((tile) => `${tile.x},${tile.y}`))
}

function unitSignature(units: ReturnType<SimulationHost['observe']>['units']): string {
  return units
    .map((unit) => `${unit.id}:${unit.x}:${unit.y}:${unit.hp ?? 0}`)
    .sort()
    .join('|')
}

interface InvariantState {
  readonly water: ReadonlySet<string>
  signature: string
  staleTicks: number
}

function checkTickInvariants(simulation: SimulationHost, tick: number, state: InvariantState): void {
  const observation = simulation.observe(true)
  const aliveFootprints = observation.buildings
    .filter((building) => building.owner === 1)
    .map((building) => ({
      x: Math.floor(building.x / FIXED_SCALE),
      y: Math.floor(building.y / FIXED_SCALE),
      width: building.footprint.width,
      height: building.footprint.height
    }))
  for (const unit of observation.units) {
    const tileX = tileOf(unit.x)
    const tileY = tileOf(unit.y)
    expect(state.water.has(`${tileX},${tileY}`), `unit ${unit.id} entered water at ${tileX},${tileY}`).toBe(false)
    const insideFootprint = aliveFootprints.some(
      (footprint) =>
        tileX >= footprint.x &&
        tileX < footprint.x + footprint.width &&
        tileY >= footprint.y &&
        tileY < footprint.y + footprint.height
    )
    expect(insideFootprint, `unit ${unit.id} entered a completed building footprint`).toBe(false)
  }
  for (let left = 0; left < observation.units.length; left += 1) {
    for (let right = left + 1; right < observation.units.length; right += 1) {
      const a = observation.units[left]!
      const b = observation.units[right]!
      expect(
        Math.hypot(a.x - b.x, a.y - b.y),
        `units ${a.id} and ${b.id} overlapped at tick ${tick}`
      ).toBeGreaterThanOrEqual(COLLISION_DIAMETER)
    }
  }
  const signature = `${unitSignature(observation.units)}|${observation.projectiles.length}|${simulation.phase()}`
  const hasOrders = observation.units.some((unit) => unit.orderState !== 'idle')
  if (hasOrders && signature === state.signature) {
    state.staleTicks += 1
  } else {
    state.staleTicks = 0
    state.signature = signature
  }
  expect(state.staleTicks, `deadlock detected at tick ${tick}`).toBeLessThan(DEADLOCK_TICKS)
}

function createInvariantState(fixture: ArmyChokepointFixture): InvariantState {
  return { water: waterKeys(fixture), signature: '', staleTicks: 0 }
}

describe('army chokepoint stress (P3.12.01)', () => {
  it('advances deterministically without overlap, water entry, footprint entry, or deadlock', () => {
    const first = createArmyChokepointFixture()
    const second = createArmyChokepointFixture()
    const firstState = createInvariantState(first)
    const secondState = createInvariantState(second)
    let areaImpacts = 0
    for (let tick = 1; tick <= 1600; tick += 1) {
      const firstResult = first.simulation.step(armyChokepointCommands(tick, first))
      const secondResult = second.simulation.step(armyChokepointCommands(tick, second))
      expect(firstResult.events).toEqual(secondResult.events)
      expect(first.simulation.hashState()).toBe(second.simulation.hashState())
      expect(first.simulation.phase()).toBe(second.simulation.phase())
      areaImpacts += firstResult.events.filter((event) => event.type === 'areaDamageImpacted').length
      checkTickInvariants(first.simulation, tick, firstState)
      checkTickInvariants(second.simulation, tick, secondState)
      if (first.simulation.phase() === 'FINISHED') {
        break
      }
    }
    expect(first.simulation.tick()).toBe(FINISHED_TICK)
    expect(first.simulation.hashState()).toBe(FINISHED_HASH)
    expect(areaImpacts).toBeGreaterThan(0)
    const survivors = first.simulation
      .observe(true)
      .units.map((unit) => ({ id: unit.id, hp: unit.hp, x: unit.x, y: unit.y }))
      .sort((left, right) => left.id - right.id)
    expect(survivors).toEqual([
      { id: 9, hp: 4, x: 3818, y: 4679 },
      { id: 12, hp: 92, x: 3185, y: 4225 }
    ])
  }, 120_000)

  it('restores immediately before area activation and continues with equal hashes and events', () => {
    const fixture = createArmyChokepointFixture()
    const beforeArea = 299
    for (let tick = 1; tick <= beforeArea; tick += 1) {
      fixture.simulation.step(armyChokepointCommands(tick, fixture))
    }
    const restored = simulationFromSnapshot(fixture.simulation.exportSnapshot())
    expect(restored.hashState()).toBe(fixture.simulation.hashState())
    for (let tick = beforeArea + 1; tick <= FINISHED_TICK; tick += 1) {
      const commands: readonly ScheduledCommand[] = armyChokepointCommands(tick, fixture)
      const original = fixture.simulation.step(commands)
      const copy = restored.step(commands)
      expect(copy.events).toEqual(original.events)
      expect(restored.hashState()).toBe(fixture.simulation.hashState())
    }
    expect(restored.phase()).toBe('FINISHED')
    expect(restored.tick()).toBe(FINISHED_TICK)
  }, 60_000)
})
