import { AssetLibrary, ProjectileLayer, type RenderProjectile } from '@rts/renderer'
import { Container, Sprite, Texture } from 'pixi.js'
import { describe, expect, it, vi } from 'vitest'

function projectile(x: number, y: number): RenderProjectile {
  return { id: 1, kind: 'arrow', owner: 0, x, y }
}

describe('ProjectileLayer', () => {
  it('renders a geometric fallback while its faction asset is unavailable', () => {
    const viewport = new Container()
    const layer = new ProjectileLayer(viewport, new AssetLibrary(''))

    layer.present([projectile(256, 512)], 0)

    expect(layer.presentationState(1)).toMatchObject({ x: 64, y: 128, fallback: true, inTree: true })
  })

  it('replaces the fallback with the faction asset without losing its transform', async () => {
    const viewport = new Container()
    const library = new AssetLibrary('')
    const sprite = new Sprite(Texture.EMPTY)
    const asset = vi.spyOn(library, 'staticSprite').mockResolvedValue(sprite)
    const layer = new ProjectileLayer(viewport, library)

    layer.present([projectile(256, 256)], 0)
    layer.present([projectile(512, 512)], 50)
    await vi.waitFor(() => expect(layer.presentationState(1)?.fallback).toBe(false))

    expect(asset).toHaveBeenCalledWith('units.blue.archer.arrow')
    expect(layer.presentationState(1)).toMatchObject({ x: 128, y: 128, rotation: Math.PI / 4, inTree: true })
  })

  it('rotates an arrow toward its observed movement direction', () => {
    const viewport = new Container()
    const layer = new ProjectileLayer(viewport, new AssetLibrary(''))

    layer.present([projectile(0, 0)], 0)
    layer.present([projectile(64, 64)], 50)

    expect(viewport.children[0]?.rotation).toBeCloseTo(Math.PI / 4)
  })

  it('keeps a right-facing arrow horizontal when movement is horizontal', () => {
    const viewport = new Container()
    const layer = new ProjectileLayer(viewport, new AssetLibrary(''))

    layer.present([projectile(0, 0)], 0)
    layer.present([projectile(64, 0)], 50)

    expect(viewport.children[0]?.rotation).toBeCloseTo(0)
  })

  it('interpolates only between consecutive observed positions', () => {
    const viewport = new Container()
    const layer = new ProjectileLayer(viewport, new AssetLibrary(''))

    layer.present([projectile(0, 0)], 0)
    layer.present([projectile(256, 0)], 100)
    layer.interpolate(150)

    expect(layer.presentationState(1)?.x).toBe(32)
  })

  it('removes the visual when the projectile leaves the observation', () => {
    const viewport = new Container()
    const layer = new ProjectileLayer(viewport, new AssetLibrary(''))
    layer.present([projectile(0, 0)], 0)

    layer.present([], 50)

    expect(layer.presentationState(1)).toBeNull()
    expect(viewport.children).toHaveLength(0)
  })

  it('destroys a deferred asset replacement after disposal', async () => {
    const viewport = new Container()
    const library = new AssetLibrary('')
    let resolveReplacement = (_sprite: Sprite | null): void => {
      throw new Error('deferred sprite resolver was not initialized')
    }
    const replacementPromise = new Promise<Sprite | null>((resolve) => {
      resolveReplacement = resolve
    })
    vi.spyOn(library, 'staticSprite').mockReturnValue(replacementPromise)
    const layer = new ProjectileLayer(viewport, library)
    layer.present([projectile(256, 256)], 0)
    const fallback = viewport.children[0]!

    layer.dispose()
    const replacement = new Sprite(Texture.EMPTY)
    resolveReplacement(replacement)
    await replacementPromise
    await vi.waitFor(() => expect(replacement.destroyed).toBe(true))

    expect(fallback.destroyed).toBe(true)
    expect(viewport.children).toHaveLength(0)
    expect(layer.presentationState(1)).toBeNull()
  })
})
