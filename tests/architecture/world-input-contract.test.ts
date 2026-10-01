import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rendererTypes = readFileSync(new URL('../../packages/renderer/src/core/types.ts', import.meta.url), 'utf8')
const renderer = readFileSync(new URL('../../packages/renderer/src/core/renderer.ts', import.meta.url), 'utf8')
const session = readFileSync(
  new URL('../../apps/web/src/features/match/hooks/use-match-session.ts', import.meta.url),
  'utf8'
)

describe('unified world input contract', () => {
  it('does not reintroduce renderer callback APIs', () => {
    for (const legacyName of [
      'onUnitSelected',
      'onBuildingSelected',
      'onMineralSelected',
      'onBoxSelected',
      'onGroundCommand',
      'onGroundClick',
      'onGroundMove',
      'onUnitCommand',
      'onBuildingCommand',
      'onMineralCommand'
    ]) {
      expect(rendererTypes).not.toContain(legacyName)
      expect(renderer).not.toContain(legacyName)
      expect(session).not.toContain(legacyName)
    }
  })
})
