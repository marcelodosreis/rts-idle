import { describe, expect, it } from 'vitest'
import { COMMAND_LAYOUTS, createSubmenuLayout } from '../../../apps/web/src/features/match/types/command-layout'

describe('HUD command layouts', () => {
  it('keeps all nine slots empty without a selection', () => {
    expect(COMMAND_LAYOUTS.empty).toEqual(Array.from({ length: 9 }, (): null => null))
  })

  it('keeps common unit commands in deterministic slots', () => {
    expect(COMMAND_LAYOUTS.unit).toEqual([
      'stop',
      'hold',
      'patrol',
      'attack',
      'attack-move',
      'contextual',
      null,
      null,
      null
    ])
  })

  it('keeps worker contextual actions in slots six through nine', () => {
    expect(COMMAND_LAYOUTS.worker).toEqual([
      'stop',
      'hold',
      'patrol',
      'attack',
      'attack-move',
      'gather',
      'repair',
      'build',
      'deposit'
    ])
  })

  it('keeps building actions and construction cancellation fixed', () => {
    expect(COMMAND_LAYOUTS.building).toEqual([
      'train',
      'research',
      'upgrade',
      'rally',
      'cancel-current',
      null,
      null,
      null,
      null
    ])
    expect(COMMAND_LAYOUTS.construction).toEqual([
      'cancel-construction',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ])
  })

  it('places up to eight submenu items before Back in slot nine', () => {
    expect(createSubmenuLayout(['a', 'b', 'c'])).toEqual(['a', 'b', 'c', null, null, null, null, null, 'back'])
    expect(createSubmenuLayout(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'back'
    ])
  })
})
