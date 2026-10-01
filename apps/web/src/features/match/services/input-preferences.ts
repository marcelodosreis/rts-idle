import type { InputProfile } from '@rts/renderer'

const STORAGE_KEY = 'rts-idle.input-preferences.v1'

export interface InputPreferences {
  readonly inputProfile: InputProfile
}

const DEFAULT_PREFERENCES: InputPreferences = { inputProfile: 'mouse' }

function isInputProfile(value: unknown): value is InputProfile {
  return value === 'mouse' || value === 'trackpad'
}

export function readInputPreferences(storage: Pick<Storage, 'getItem'>): InputPreferences {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_PREFERENCES
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('inputProfile' in parsed)) {
      return DEFAULT_PREFERENCES
    }
    return isInputProfile(parsed.inputProfile) ? { inputProfile: parsed.inputProfile } : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function writeInputPreferences(storage: Pick<Storage, 'setItem'>, preferences: InputPreferences): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export const inputPreferencesStorageKey = STORAGE_KEY
