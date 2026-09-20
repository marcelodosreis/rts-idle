import { BARRACKS_BUILDING, BASE_BUILDING } from '@rts/game-data'
import { describe, expect, it } from 'vitest'
import { buildingVisualStyle } from '../../packages/renderer/src/building-visual-style.js'

if (typeof navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: '' } })
}
const { Graphics } = await import('pixi.js')
const { WorldObjectLayer } = await import('../../packages/renderer/src/world-object-layer.js')

function viewportStub(): {
  readonly children: InstanceType<typeof Graphics>[]
  addChild: (graphic: InstanceType<typeof Graphics>) => InstanceType<typeof Graphics>
  removeChild: (graphic: InstanceType<typeof Graphics>) => InstanceType<typeof Graphics>
} {
  const children: Graphics[] = []
  return {
    children,
    addChild: (graphic) => {
      children.push(graphic)
      return graphic
    },
    removeChild: (graphic) => {
      const index = children.indexOf(graphic)
      if (index >= 0) {
        children.splice(index, 1)
      }
      return graphic
    }
  }
}

describe('WorldObjectLayer construction anchors', () => {
  it('uses the catalog footprint for initial, foundation, preview, and completed BASE geometry', () => {
    const viewport = viewportStub()
    const layer = new WorldObjectLayer(viewport as never)
    const baseFootprint = BASE_BUILDING.footprint
    const construction = {
      id: 42,
      buildingType: 'BASE' as const,
      x: 768,
      y: 512,
      owner: 0,
      footprint: { ...baseFootprint },
      status: 'FOUNDATION' as const,
      progressTicks: 0,
      totalTicks: 100
    }

    layer.present([], [], [construction])
    const foundation = viewport.children[0]!
    const foundationPosition = { x: foundation.position.x, y: foundation.position.y }
    expect(foundationPosition).toEqual({ x: 192, y: 128 })
    const foundationBounds = foundation.getLocalBounds()
    const foundationWidth = foundationBounds.width
    expect(foundationBounds.width).toBeGreaterThanOrEqual(baseFootprint.width * 64)
    expect(foundationBounds.height).toBeGreaterThanOrEqual(baseFootprint.height * 64)
    expect(foundation.getLocalBounds().x).toBeGreaterThanOrEqual(-3)
    expect(layer.constructionAt(200, 140)).toBe(42)
    expect(layer.constructionAt(500, 500)).toBeNull()

    layer.present([{ id: 42, x: construction.x, y: construction.y, owner: construction.owner }], [], [])
    const initial = viewport.children[0]!
    expect({ x: initial.position.x, y: initial.position.y }).toEqual(foundationPosition)
    expect(initial.getLocalBounds().width).toBeCloseTo(foundationWidth, 0)
    expect(initial.getLocalBounds().height).toBeGreaterThanOrEqual(baseFootprint.height * 64)

    layer.setBuildPreview({
      x: construction.x,
      y: construction.y,
      width: baseFootprint.width,
      height: baseFootprint.height,
      valid: true
    })
    const preview = viewport.children[1]!
    expect({ x: preview.position.x, y: preview.position.y }).toEqual(foundationPosition)
    expect(preview.getLocalBounds().width).toBe(baseFootprint.width * 64 + 4)
    expect(preview.getLocalBounds().height).toBe(baseFootprint.height * 64 + 4)

    layer.setBuildPreview(null)
    layer.present([], [], [{ ...construction, status: 'COMPLETED', progressTicks: 100 }])
    const completed = viewport.children[0]!
    expect({ x: completed.position.x, y: completed.position.y }).toEqual(foundationPosition)
    expect(completed.getLocalBounds().width).toBeCloseTo(foundationWidth, 0)
    expect(completed.getLocalBounds().height).toBeGreaterThanOrEqual(baseFootprint.height * 64)
    expect(completed.getLocalBounds().x).toBeGreaterThanOrEqual(-3)
  })

  it('uses the catalog footprint for Barracks geometry', () => {
    const viewport = viewportStub()
    const layer = new WorldObjectLayer(viewport as never)
    layer.present(
      [],
      [],
      [
        {
          id: 7,
          buildingType: 'BARRACKS',
          x: 0,
          y: 0,
          owner: 0,
          footprint: { width: 1, height: 1 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100
        }
      ]
    )
    const barracks = viewport.children[0]!
    expect(barracks.getLocalBounds().width).toBe(BARRACKS_BUILDING.footprint.width * 64 + 4)
    expect(barracks.getLocalBounds().height).toBe(BARRACKS_BUILDING.footprint.height * 64 + 4)
  })
})

describe('building presentation styles', () => {
  it('uses the owner-colored Base style for initial and completed Bases', () => {
    expect(buildingVisualStyle('BASE', 'COMPLETED', 0)).toEqual({
      kind: 'base',
      fillColor: 0x2e7d32,
      fillAlpha: 0.8,
      strokeColor: 0xf8fafc
    })
    expect(buildingVisualStyle('BASE', 'COMPLETED', 1)).toEqual({
      kind: 'base',
      fillColor: 0xc62828,
      fillAlpha: 0.8,
      strokeColor: 0xf8fafc
    })
  })

  it('keeps Barracks distinct while using the same owner-color convention', () => {
    expect(buildingVisualStyle('BARRACKS', 'COMPLETED', 0)).toMatchObject({
      kind: 'barracks',
      fillColor: 0x2e7d32
    })
    expect(buildingVisualStyle('BARRACKS', 'COMPLETED', 0).kind).not.toBe('base')
  })

  it('preserves an owner-colored foundation state for progress rendering', () => {
    expect(buildingVisualStyle('BASE', 'UNDER_CONSTRUCTION', 0)).toEqual({
      kind: 'foundation',
      fillColor: 0x2e7d32,
      fillAlpha: 0.3,
      strokeColor: 0xfacc15
    })
  })
})

describe('WorldObjectLayer hit testing', () => {
  it('selects a mineral node across consecutive presentation frames', () => {
    const viewport = viewportStub()
    const layer = new WorldObjectLayer(viewport as never)
    const node = { id: 9, x: 640, y: 384, remaining: 300 }

    layer.present([], [node])
    expect(layer.mineralNodeAt(160, 96)).toBe(9)

    layer.present([], [{ ...node, remaining: 275 }])
    expect(layer.mineralNodeAt(160, 96)).toBe(9)
  })

  it('keeps building and mineral hit targets distinct', () => {
    const viewport = viewportStub()
    const layer = new WorldObjectLayer(viewport as never)

    layer.present(
      [
        {
          id: 7,
          buildingType: 'BASE',
          x: 0,
          y: 0,
          owner: 0,
          footprint: { width: 2, height: 2 },
          status: 'COMPLETED',
          progressTicks: 100,
          totalTicks: 100
        }
      ],
      [{ id: 9, x: 640, y: 384, remaining: 300 }]
    )

    expect(layer.buildingAt(32, 32)).toBe(7)
    expect(layer.mineralNodeAt(160, 96)).toBe(9)
    expect(layer.buildingAt(500, 500)).toBeNull()
    expect(layer.mineralNodeAt(500, 500)).toBeNull()
  })
})
