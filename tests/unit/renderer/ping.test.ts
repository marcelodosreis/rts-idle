import { describe, expect, it } from 'vitest'
import { CommandPing } from '../../../packages/renderer/src/effects/ping.js'

if (typeof navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: '' } })
}

const { Container } = await import('pixi.js')

describe('CommandPing', () => {
  it('keeps the selected construction rally point visible', () => {
    const layer = new Container()
    const ping = new CommandPing(layer)

    ping.showPersistent(120, 240, 0xc084fc)
    ping.expireIfElapsed(Date.now() + 10_000)

    expect(ping.position()).toEqual({ x: 120, y: 240 })
  })
})
