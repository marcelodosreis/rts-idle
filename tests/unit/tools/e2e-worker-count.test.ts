import { describe, expect, it } from 'vitest'
import { e2eWorkerCount } from '../../../tools/e2e/worker-count'

describe('e2eWorkerCount', () => {
  it('uses one worker unless an explicit valid override is supplied', () => {
    expect(e2eWorkerCount(undefined)).toBe(1)
    expect(e2eWorkerCount('3')).toBe(3)
  })

  it('rejects invalid worker overrides', () => {
    expect(() => e2eWorkerCount('0')).toThrow('invalid E2E worker count')
    expect(() => e2eWorkerCount('not-a-number')).toThrow('invalid E2E worker count')
  })
})
