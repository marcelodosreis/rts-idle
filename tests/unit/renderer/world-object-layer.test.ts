import { BARRACKS_BUILDING, CASTLE_BUILDING } from '@rts/game-data'
import { BUILDING_GEOMETRY, fixedToRenderPixels } from '@rts/shared'
import type { Container as ContainerType } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { buildingVisualStyle } from '../../../packages/renderer/src/world/building-visual-style.js'

if (typeof navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: '' } })
}
const { Container } = await import('pixi.js')
const { WorldObjectLayer } = await import('../../../packages/renderer/src/world/object-layer.js')

function layerContainers(): { readonly worldObjects: ContainerType; readonly interaction: ContainerType } {
  return { worldObjects: new Container(), interaction: new Container() }
}

describe('WorldObjectLayer construction anchors', () => {
  it('uses a tile-aligned Castle canvas for foundation, preview, and completed geometry', () => {
    const layers = layerContainers()
    const layer = new WorldObjectLayer(layers.worldObjects, layers.interaction)
    const baseFootprint = CASTLE_BUILDING.footprint
    const construction = {
      id: 42,
      buildingType: 'CASTLE' as const,
      x: 768,
      y: 512,
      owner: 0,
      footprint: { ...baseFootprint },
      status: 'FOUNDATION' as const,
      progressTicks: 0,
      totalTicks: 100
    }

    layer.present([construction])
    const foundation = layers.worldObjects.children[0]!
    const foundationPosition = { x: foundation.position.x, y: foundation.position.y }
    expect(foundationPosition).toEqual({ x: 192, y: 128 })
    const foundationBounds = foundation.getLocalBounds()
    const foundationWidth = foundationBounds.width
    expect(foundationBounds.width).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.CASTLE.visualSize.width) + 4)
    expect(foundationBounds.height).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.CASTLE.visualSize.height) + 13)
    expect(foundation.getLocalBounds().x).toBeGreaterThanOrEqual(-3)
    expect(layer.buildingAt(200, 140)).toBe(42)
    expect(layer.buildingAt(515, 337)).toBeNull()
    expect(layer.buildingAt(500, 500)).toBeNull()

    layer.setBuildPreview({
      x: construction.x,
      y: construction.y,
      width: baseFootprint.width,
      height: baseFootprint.height,
      buildingType: 'CASTLE',
      valid: true
    })
    const preview = layers.interaction.children[0]!
    expect({ x: preview.position.x, y: preview.position.y }).toEqual(foundationPosition)
    expect(preview.getLocalBounds().width).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.CASTLE.visualSize.width) + 4)
    expect(preview.getLocalBounds().height).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.CASTLE.visualSize.height) + 4)

    layer.present([construction])
    expect(layers.interaction.children).toEqual([preview])

    layer.setBuildPreview(null)
    layer.present([{ ...construction, status: 'COMPLETED', progressTicks: 100 }])
    const completed = layers.worldObjects.children[0]!
    expect({ x: completed.position.x, y: completed.position.y }).toEqual(foundationPosition)
    expect(completed.getLocalBounds().width).toBeCloseTo(foundationWidth, 0)
    expect(completed.getLocalBounds().height).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.CASTLE.visualSize.height) + 4)
    expect(completed.getLocalBounds().x).toBeGreaterThanOrEqual(-3)
  })

  it('uses a tile-aligned Barracks canvas for geometry', () => {
    const layers = layerContainers()
    const layer = new WorldObjectLayer(layers.worldObjects, layers.interaction)
    layer.present([
      {
        id: 7,
        buildingType: 'BARRACKS',
        x: 0,
        y: 0,
        owner: 0,
        footprint: BARRACKS_BUILDING.footprint,
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100
      }
    ])
    const barracks = layers.worldObjects.children[0]!
    expect(barracks.getLocalBounds().width).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.BARRACKS.visualSize.width) + 4)
    expect(barracks.getLocalBounds().height).toBe(fixedToRenderPixels(BUILDING_GEOMETRY.BARRACKS.visualSize.height) + 4)
  })

  it('draws the training progress bar above a completed producer', () => {
    const layers = layerContainers()
    const layer = new WorldObjectLayer(layers.worldObjects, layers.interaction)
    layer.present([
      {
        id: 8,
        buildingType: 'BARRACKS',
        x: 0,
        y: 0,
        owner: 0,
        footprint: BARRACKS_BUILDING.footprint,
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        production: {
          queue: [
            {
              unitKind: 'warrior',
              cost: { GOLD: 50 },
              reservedSupply: 1,
              progressTicks: 30,
              totalTicks: 60,
              status: 'ACTIVE'
            }
          ]
        }
      }
    ])

    expect(layers.worldObjects.children[0]!.getLocalBounds().y).toBeLessThan(0)
  })

  it('draws the construction progress bar above a Castle during tier upgrade', () => {
    const layers = layerContainers()
    const layer = new WorldObjectLayer(layers.worldObjects, layers.interaction)
    layer.present([
      {
        id: 10,
        buildingType: 'CASTLE',
        x: 0,
        y: 0,
        owner: 0,
        footprint: CASTLE_BUILDING.footprint,
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        tier: 1,
        tierUpgrade: { progressTicks: 40, totalTicks: 100 }
      }
    ])

    expect(layers.worldObjects.children[0]!.getLocalBounds().y).toBeLessThan(0)
  })

  it('draws a health bar above a damaged building', () => {
    const layers = layerContainers()
    const layer = new WorldObjectLayer(layers.worldObjects, layers.interaction)
    layer.present([
      {
        id: 9,
        buildingType: 'CASTLE',
        x: 0,
        y: 0,
        owner: 0,
        footprint: CASTLE_BUILDING.footprint,
        status: 'COMPLETED',
        progressTicks: 100,
        totalTicks: 100,
        hp: 250,
        maxHp: 500
      }
    ])

    expect(layers.worldObjects.children[0]!.getLocalBounds().y).toBeLessThan(-10)
  })
})

describe('building presentation styles', () => {
  it('uses the owner-colored Castle style for initial and completed Castles', () => {
    expect(buildingVisualStyle('CASTLE', 'COMPLETED', 0)).toEqual({
      kind: 'castle',
      fillColor: 0x2e7d32,
      fillAlpha: 0.8,
      strokeColor: 0xc084fc
    })
    expect(buildingVisualStyle('CASTLE', 'COMPLETED', 1)).toEqual({
      kind: 'castle',
      fillColor: 0xc62828,
      fillAlpha: 0.8,
      strokeColor: 0xc084fc
    })
  })

  it('keeps Barracks distinct while using the same owner-color convention', () => {
    expect(buildingVisualStyle('BARRACKS', 'COMPLETED', 0)).toMatchObject({
      kind: 'completed',
      fillColor: 0x2e7d32,
      strokeColor: 0xc084fc
    })
    expect(buildingVisualStyle('BARRACKS', 'COMPLETED', 0).kind).not.toBe('base')
  })

  it('preserves an owner-colored foundation state for progress rendering', () => {
    expect(buildingVisualStyle('CASTLE', 'UNDER_CONSTRUCTION', 0)).toEqual({
      kind: 'foundation',
      fillColor: 0x2e7d32,
      fillAlpha: 0.3,
      strokeColor: 0xc084fc
    })
  })
})
