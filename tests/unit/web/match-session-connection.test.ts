import type { CommandIntent } from '@rts/shared'
import { describe, expect, it, vi } from 'vitest'
import { createMatchSessionConnectionOwner } from '../../../apps/web/src/features/match/services/match-session-connection'

const command: CommandIntent = { type: 'STOP', payload: { unitIds: [1] } }

function connection() {
  return { sendCommand: vi.fn(), reconnect: vi.fn(), close: vi.fn() }
}

describe('match session connection ownership', () => {
  it('closes the owned connection once', () => {
    const owner = createMatchSessionConnectionOwner()
    const first = connection()
    owner.set(first)
    owner.cleanup(first)
    owner.cleanup(first)
    expect(first.close).toHaveBeenCalledOnce()
    expect(owner.current()).toBeNull()
  })

  it('does not let stale cleanup close a newer connection', () => {
    const owner = createMatchSessionConnectionOwner()
    const first = connection()
    const second = connection()
    owner.set(first)
    owner.set(second)
    owner.cleanup(first)
    expect(first.close).not.toHaveBeenCalled()
    expect(second.close).not.toHaveBeenCalled()
    expect(owner.current()).toBe(second)
  })

  it('blocks sends without a connection or after the match finishes', () => {
    const owner = createMatchSessionConnectionOwner()
    expect(owner.send(command, false)).toBe(false)
    const current = connection()
    owner.set(current)
    expect(owner.send(command, true)).toBe(false)
    expect(owner.send(command, false)).toBe(true)
    expect(current.sendCommand).toHaveBeenCalledWith(command)
  })
})
