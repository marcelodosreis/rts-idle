import { AssetLibrary, createTerrainScene } from '@rts/renderer'
import { type AssetEntry, toAssetKey } from '@rts/shared'
import { Texture, TextureSource } from 'pixi.js'
import { describe, expect, it, vi } from 'vitest'

function testTexture(): Texture {
  return new Texture({
    source: new TextureSource({
      width: 64,
      height: 64,
      resource: new Uint8ClampedArray(64 * 64 * 4)
    })
  })
}

const bushEntry: AssetEntry = {
  key: toAssetKey('terrain.decorations.bushes.bushe1')!,
  file: 'bush.png',
  kind: 'static',
  cellW: 64,
  cellH: 64,
  frames: 1,
  anchorX: 0.5,
  anchorY: 1
}

describe('TerrainScene async rendering', () => {
  it('does not attach decorations from an obsolete render', async () => {
    const assets = new AssetLibrary('')
    let resolveDecoration: ((texture: Texture) => void) | undefined
    const decoration = new Promise<Texture>((resolve) => {
      resolveDecoration = resolve
    })
    vi.spyOn(assets, 'tileTextures').mockResolvedValue(null)
    vi.spyOn(assets, 'stripTextures').mockResolvedValue(null)
    vi.spyOn(assets, 'entry').mockImplementation((key) => (key === bushEntry.key ? bushEntry : null))
    vi.spyOn(assets, 'texture').mockImplementation((key) =>
      key === bushEntry.key ? decoration : Promise.resolve(null)
    )

    const scene = await createTerrainScene(assets)
    scene.render([['land']], new Map(), { seed: 1, counts: { bush: 1 } }, new Map())
    scene.render([['land']], new Map(), { seed: 1, counts: {} }, new Map())

    resolveDecoration?.(testTexture())
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const dressingContainer = scene.container.children[4]
    expect(dressingContainer?.children).toHaveLength(0)
    scene.destroy()
  })
})
