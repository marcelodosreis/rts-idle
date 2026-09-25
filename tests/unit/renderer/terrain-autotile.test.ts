import { type AutoTileTerrain, autotileTile, cliffBase, stairTile } from '@rts/renderer'
import { describe, expect, it } from 'vitest'

// Masks are NESW bit strings; bit = 1 when the neighbor is same-or-higher land.
// Expected indices come from the canonical Tiny Swords lookup (guide.json
// cross-checked against the official Pixel Frog Tilemap Guide devlog).

type CellChar = 'w' | 'l' | 'e'

function grid(rows: readonly string[]): AutoTileTerrain[][] {
  return rows.map((row) =>
    [...row].map((char: string): AutoTileTerrain => {
      if (char === 'w') {
        return 'water'
      }
      if (char === 'e') {
        return 'elevated'
      }
      return 'land'
    })
  )
}

/** Builds a 3x3 around a center cell so the center's 4 neighbors match a mask. */
function maskedGrid(mask: string, center: CellChar): AutoTileTerrain[][] {
  const toCell = (char: string): CellChar => (char === '1' ? 'l' : 'w')
  const [n, e, s, w] = [...mask]
  return grid([`l${toCell(n)}l`, `${toCell(w)}${center}${toCell(e)}`, `l${toCell(s)}l`])
}

describe('autotileTile flat ground (grass/water)', () => {
  const MASK_TO_INDEX: Readonly<Record<string, number>> = {
    '0000': 30,
    '0001': 29,
    '0010': 3,
    '0011': 2,
    '0100': 27,
    '0101': 28,
    '0110': 0,
    '0111': 1,
    '1000': 21,
    '1001': 20,
    '1010': 12,
    '1011': 11,
    '1100': 18,
    '1101': 19,
    '1110': 9,
    '1111': 10
  }

  it('picks the exact atlas tile for all 16 neighbor masks', () => {
    for (const [mask, expected] of Object.entries(MASK_TO_INDEX)) {
      const result = autotileTile(maskedGrid(mask, 'l'), 1, 1)
      expect(result.atlasIndex, `mask ${mask}`).toBe(expected)
      expect(result.mask, `mask ${mask}`).toBe(mask)
    }
  })

  it('returns null for water cells (renderer uses the water fill tile)', () => {
    const result = autotileTile(maskedGrid('1111', 'w'), 1, 1)
    expect(result.atlasIndex).toBeNull()
    expect(result.semanticId).toBeNull()
  })

  it('treats out-of-bounds neighbors as OTHER (bit 0)', () => {
    const result = autotileTile(grid(['l']), 0, 0)
    expect(result.mask).toBe('0000')
    expect(result.atlasIndex).toBe(30)
  })
})

describe('autotileTile elevated ground', () => {
  it('uses the elevated region for a fully-surrounded elevated center', () => {
    const result = autotileTile(grid(['eee', 'eee', 'eee']), 1, 1)
    expect(result.mask).toBe('1111')
    expect(result.atlasIndex).toBe(15)
  })

  it('uses the grass-meets-rock lip when south is water and north is water', () => {
    const result = autotileTile(grid(['wwe', 'wew', 'www']), 1, 1)
    expect(result.mask).toBe('0000')
    expect(result.atlasIndex).toBe(35)
  })

  it('keeps the all-grass lip when south is lower but north is same-elevation land', () => {
    const result = autotileTile(grid(['lee', 'wee', 'lll']), 1, 1)
    expect(result.mask).toBe('1100')
    expect(result.atlasIndex).toBe(23)
  })
})

describe('cliffBase', () => {
  it('returns null for land and water cells', () => {
    expect(cliffBase(grid(['lll', 'lll', 'lll']), 1, 1)).toBeNull()
    expect(cliffBase(grid(['www', 'www', 'www']), 1, 1)).toBeNull()
  })

  it('returns null when the elevated south neighbor is not lower', () => {
    expect(cliffBase(grid(['eee', 'eee', 'eee']), 1, 1)).toBeNull()
  })

  it('draws a mid cliff face onto walkable land below an elevated cell', () => {
    const result = cliffBase(grid(['eee', 'eee', 'lll']), 1, 1)
    expect(result).toBe(42)
  })

  it('draws a mid cliff face into water below an elevated cell', () => {
    const result = cliffBase(grid(['eee', 'eee', 'www']), 1, 1)
    expect(result).toBe(51)
  })

  it('picks the narrow variant when both cliff sides are open (water)', () => {
    const result = cliffBase(grid(['www', 'wew', 'www']), 1, 1)
    expect(result).toBe(53)
  })

  it('picks the right-end variant when only the east side is open', () => {
    const result = cliffBase(grid(['lll', 'eel', 'lll']), 1, 1)
    expect(result).toBe(43)
  })

  it('picks the left-end variant when only the west side is open', () => {
    const result = cliffBase(grid(['lll', 'lee', 'lll']), 1, 1)
    expect(result).toBe(41)
  })
})

describe('stairTile', () => {
  it('returns the left ramp atlas pieces (bottom + top)', () => {
    expect(stairTile('left')).toEqual({ bottom: 45, top: 36 })
  })

  it('returns the right ramp atlas pieces (bottom + top)', () => {
    expect(stairTile('right')).toEqual({ bottom: 48, top: 39 })
  })
})
