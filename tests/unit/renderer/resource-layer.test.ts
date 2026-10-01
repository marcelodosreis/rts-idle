import type { ResourceDefinition } from '@rts/shared'
import { Container, type Particle, ParticleContainer, Texture } from 'pixi.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResourceFallbackTextures } from '../../../packages/renderer/src/resources/resource-fallback.js'
import { ResourceLayer } from '../../../packages/renderer/src/resources/resource-layer.js'

if (typeof navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: '' } })
}

const TREE: ResourceDefinition = {
  resourceId: 1,
  kind: 'TREE',
  x: 5120,
  y: 2560,
  variant: 0,
  initialAmount: 30,
  harvestAmount: 10,
  harvestTicks: 200,
  blocksNavigation: false
}

const GOLD_MINE: ResourceDefinition = { ...TREE, resourceId: 2, kind: 'GOLD_MINE', x: 5632 }

function testTexture(): Texture {
  return new Texture({ source: Texture.WHITE.source })
}

const TREE_ACTIVE = testTexture()
const TREE_DEPLETED = testTexture()
const MINE_ACTIVE = testTexture()
const MINE_DEPLETED = testTexture()

const FALLBACK_TEXTURES: ResourceFallbackTextures = {
  TREE: { active: TREE_ACTIVE, depleted: TREE_DEPLETED },
  GOLD_MINE: { active: MINE_ACTIVE, depleted: MINE_DEPLETED }
}

function mapWith(...resources: readonly ResourceDefinition[]) {
  return {
    width: 48,
    height: 32,
    tiles: Array.from({ length: 48 * 32 }, () => 'land' as const),
    resources
  }
}

function texturesIn(container: Container): readonly Texture[] {
  return container.children.flatMap((child) =>
    child instanceof ParticleContainer ? child.particleChildren.map((particle: Particle) => particle.texture) : []
  )
}

describe('ResourceLayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads static particles and keeps a depleted resource as a visible stump', () => {
    const update = vi.spyOn(ParticleContainer.prototype, 'update')
    const layer = new ResourceLayer(new Container(), mapWith(TREE), FALLBACK_TEXTURES)

    layer.setViewBounds({ left: 0, right: 2048, top: 0, bottom: 2048 })
    expect(layer.visibleObjectCount()).toBe(1)
    expect(update).toHaveBeenCalled()

    layer.present([{ resourceId: TREE.resourceId, remaining: 0 }])
    expect(layer.visibleObjectCount()).toBe(1)
    expect(layer.resourceAt(1280, 640)).toBe(TREE.resourceId)
  })

  it('materializes only chunks intersecting the viewport', () => {
    const second = { ...TREE, resourceId: 2, x: 10240 }
    const layer = new ResourceLayer(new Container(), mapWith(TREE, second), FALLBACK_TEXTURES)

    layer.setViewBounds({ left: 0, right: 2048, top: 0, bottom: 2048 })
    expect(layer.resourceStats().materializedChunks).toBe(1)
    expect(layer.visibleObjectCount()).toBe(1)
  })

  it('uses distinct textures per resource kind and depletion state', () => {
    const container = new Container()
    const layer = new ResourceLayer(container, mapWith(TREE, GOLD_MINE), FALLBACK_TEXTURES)
    layer.setViewBounds({ left: 0, right: 2048, top: 0, bottom: 2048 })

    expect(texturesIn(container)).toEqual([TREE_ACTIVE, MINE_ACTIVE])
    expect(layer.resourceAt(1280, 640)).toBe(TREE.resourceId)
    expect(layer.resourceAt(1408, 640)).toBe(GOLD_MINE.resourceId)

    layer.present([{ resourceId: TREE.resourceId, remaining: 0 }])
    expect(texturesIn(container)).toEqual([TREE_DEPLETED, MINE_ACTIVE])
    expect(layer.resourceAt(1280, 640)).toBe(TREE.resourceId)

    layer.present([{ resourceId: GOLD_MINE.resourceId, remaining: 0 }])
    expect(texturesIn(container)).toEqual([TREE_DEPLETED, MINE_DEPLETED])
    expect(layer.resourceAt(1408, 640)).toBe(GOLD_MINE.resourceId)
  })
})
