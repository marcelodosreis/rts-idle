import { describe, expect, it } from 'vitest'
import {
  inputPreferencesStorageKey,
  readInputPreferences,
  writeInputPreferences
} from '../../../apps/web/src/features/match/services/input-preferences'

function storage(initial: string | null = null) {
  let value = initial
  return {
    getItem: (_key: string) => value,
    setItem: (_key: string, next: string) => {
      value = next
    }
  }
}

describe('input preferences', () => {
  it('defaults to mouse and validates persisted profiles', () => {
    expect(readInputPreferences(storage())).toEqual({ inputProfile: 'mouse' })
    expect(readInputPreferences(storage('{"inputProfile":"trackpad"}'))).toEqual({ inputProfile: 'trackpad' })
    expect(readInputPreferences(storage('{"inputProfile":"unknown"}'))).toEqual({ inputProfile: 'mouse' })
  })

  it('writes a versioned preference payload', () => {
    const target = storage()
    writeInputPreferences(target, { inputProfile: 'trackpad' })
    expect(target.getItem(inputPreferencesStorageKey)).toBe('{"inputProfile":"trackpad"}')
  })
})
