import { createSimulation, Health } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildAttackCommand, SEEDS, TEST_IDENTITY, worldWithCombatants } from '../fixtures/index.js'

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
    const attackEvents = result.events.filter((event) => event.type === 'attackFired')
    const damageEvents = result.events.filter((event) => event.type === 'damageDealt')
    expect(attackEvents).toHaveLength(1)
    expect(damageEvents).toHaveLength(1)
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
})
