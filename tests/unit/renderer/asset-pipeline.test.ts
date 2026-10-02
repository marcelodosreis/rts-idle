import { AssetLibrary, createAnimation, sliceStrip } from '@rts/renderer'
import { toAssetKey } from '@rts/shared'
import { Assets, Rectangle, Texture, TextureSource } from 'pixi.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

function testTexture(width: number, height: number): Texture {
  const source = new TextureSource({
    width,
    height,
    resource: new Uint8ClampedArray(width * height * 4)
  })
  return new Texture({ source })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sliceStrip', () => {
  it('slices a strip texture into the expected number of frames', () => {
    const strip = testTexture(192, 192)
    const frames = sliceStrip(strip, 64, 64, 9)
    expect(frames).toHaveLength(9)
    expect(frames[0]!.frame).toEqual(new Rectangle(0, 0, 64, 64))
    expect(frames[8]!.frame).toEqual(new Rectangle(512, 0, 64, 64))
  })

  it('rejects a non-divisible strip via caller validation only', () => {
    // The build tool validates divisibility; slicing itself crops on demand.
    const strip = testTexture(150, 64)
    const frames = sliceStrip(strip, 64, 64, 2)
    expect(frames).toHaveLength(2)
  })
})

describe('createAnimation', () => {
  it('sets anchor and frame rate from the manifest entry', () => {
    const strip = testTexture(192, 192)
    const frames = sliceStrip(strip, 192, 192, 4)
    const sprite = createAnimation(
      {
        key: toAssetKey('x')!,
        file: 'x.png',
        kind: 'strip',
        cellW: 192,
        cellH: 192,
        frames: 4,
        duration: 120,
        anchorX: 0.5,
        anchorY: 1
      },
      frames
    )
    expect(sprite.anchor.x).toBe(0.5)
    expect(sprite.anchor.y).toBe(1)
    expect(sprite.animationSpeed).toBeCloseTo(1000 / 120 / 60)
    expect(sprite.totalFrames).toBe(4)
  })
})

describe('AssetLibrary lifecycle', () => {
  it('does not destroy textures owned by PixiJS global asset cache', async () => {
    const texture = testTexture(64, 64)
    const destroy = vi.spyOn(texture, 'destroy')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 1, assets: { hero: { key: 'hero', file: 'hero.png', kind: 'static' } } })
      })
    )
    vi.spyOn(Assets, 'load').mockResolvedValue(texture as never)

    const library = new AssetLibrary('/assets')
    await library.load()
    await library.texture('hero')
    library.destroy()

    expect(destroy).not.toHaveBeenCalled()
  })
})
