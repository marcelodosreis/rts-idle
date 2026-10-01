import { describe, expect, it } from 'vitest'
import { instanceFromArgs, portsForInstance } from '../../../tools/dev/ports'

describe('development instances', () => {
  it('derives isolated ports for each instance', () => {
    expect(portsForInstance(1)).toEqual({ serverPort: 8080, webPort: 5173 })
    expect(portsForInstance(2)).toEqual({ serverPort: 8081, webPort: 5174 })
  })

  it('accepts one positive instance argument only', () => {
    expect(instanceFromArgs([])).toBe(1)
    expect(instanceFromArgs(['3'])).toBe(3)
    expect(instanceFromArgs(['--', '3'])).toBe(3)
    expect(() => instanceFromArgs(['0'])).toThrow('positive integer')
    expect(() => instanceFromArgs(['two'])).toThrow('positive integer')
  })
})
