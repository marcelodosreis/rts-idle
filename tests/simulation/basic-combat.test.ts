import { tilesToFixed } from '@rts/shared'
import { createSimulation, Health } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import {
  buildAttackCommand,
  buildAttackMoveCommand,
  buildHoldCommand,
  SEEDS,
  TEST_IDENTITY,
  worldWithCombatants
} from '../fixtures/index.js'

describe('basic combat', () => {
  it('fires at an explicit target in range and applies damage', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 1, kind: 'military', x: 11, y: 10 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const attacker = ids[0]!
    const target = ids[1]!
    const initialHp = sim.inspectState().world.store(Health).get(target)!.current

    const result = sim.step([buildAttackCommand([attacker], target)])

    expect(result.rejected).toHaveLength(0)
    const after = sim.inspectState()
    expect(after.world.store(Health).get(target)!.current).toBeLessThan(initialHp)
    const damageEvents = result.events.filter((event) => event.type === 'damageDealt')
    expect(damageEvents.length).toBeGreaterThanOrEqual(1)
    // The explicit target is hit (the enemy may also retaliate).
    expect(damageEvents.some((event) => event.targetId === target)).toBe(true)
  })

  it('respects the cooldown: no second hit until it expires', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 1, kind: 'military', x: 11, y: 10 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const attacker = ids[0]!
    const target = ids[1]!

    sim.step([buildAttackCommand([attacker], target)])
    const afterFirst = sim.inspectState().world.store(Health).get(target)!.current

    sim.step()
    const afterSecond = sim.inspectState().world.store(Health).get(target)!.current
    expect(afterSecond).toBe(afterFirst)

    // After the cooldown (15 ticks for military at 0.75 s), it fires again.
    for (let i = 0; i < 16; i += 1) {
      sim.step()
    }
    const afterCooldown = sim.inspectState().world.store(Health).get(target)!.current
    expect(afterCooldown).toBeLessThan(afterSecond)
  })

  it('does not fire when the target is out of range', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 1, kind: 'military', x: 30, y: 30 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const attacker = ids[0]!
    const target = ids[1]!

    const result = sim.step([buildAttackCommand([attacker], target)])
    expect(result.events).toHaveLength(0)
  })

  it('rejects an ATTACK on a nonexistent or friendly target', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 0, kind: 'military', x: 11, y: 10 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const attacker = ids[0]!
    const friend = ids[1]!

    const missing = sim.step([buildAttackCommand([attacker], 999)])
    expect(missing.rejected[0]!.code).toBe('TARGET_UNAVAILABLE')

    const friendly = sim.step([buildAttackCommand([attacker], friend)])
    expect(friendly.rejected[0]!.code).toBe('TARGET_UNAVAILABLE')
  })

  it('auto-acquires and fires at a military target before a worker in range', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 1, kind: 'military', x: 11, y: 10 },
        { owner: 1, kind: 'worker', x: 11, y: 11 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const military = ids[1]!
    const worker = ids[2]!

    const result = sim.step([])
    const damageEvent = result.events.find((event) => event.type === 'damageDealt')
    expect(damageEvent).toBeDefined()
    expect(damageEvent!.targetId).toBe(military)
    expect(sim.inspectState().world.store(Health).get(worker)!.current).toBe(
      sim.inspectState().world.store(Health).get(worker)!.max
    )
  })

  it('HOLD auto-attacks targets in range without moving', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 1, kind: 'worker', x: 10, y: 11 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const holder = ids[0]!
    const target = ids[1]!

    sim.step([buildHoldCommand([holder])])
    const result = sim.step([])

    // Fired on the hold tick (or a later one once the cooldown resets).
    let fired = result.events.some((event) => event.type === 'damageDealt')
    for (let i = 0; i < 20 && !fired; i += 1) {
      fired = sim.step([]).events.some((event) => event.type === 'damageDealt')
    }
    expect(fired).toBe(true)
    expect(sim.inspectState().world.store(Health).get(target)!.current).toBeLessThan(60)
  })

  it('ATTACK_MOVE advances toward the point and fires at enemies in range', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithCombatants([
        { owner: 0, kind: 'military', x: 10, y: 10 },
        { owner: 1, kind: 'military', x: 11, y: 10 }
      ])
    })
    const ids = sim.inspectState().world.aliveIds()
    const attacker = ids[0]!
    const enemy = ids[1]!

    const result = sim.step([buildAttackMoveCommand([attacker], tilesToFixed(30), tilesToFixed(30))])
    void result

    // The enemy is in range immediately, so the attack-move fires.
    let fired = result.events.some((event) => event.type === 'damageDealt')
    for (let i = 0; i < 20 && !fired; i += 1) {
      fired = sim.step([]).events.some((event) => event.type === 'damageDealt')
    }
    expect(fired).toBe(true)
    expect(sim.inspectState().world.store(Health).get(enemy)!.current).toBeLessThan(90)
  })
})
