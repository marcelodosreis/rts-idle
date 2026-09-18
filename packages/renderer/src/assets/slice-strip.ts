import { Rectangle, Texture } from 'pixi.js'

/**
 * Slices a strip texture into `frames` subtextures laid out horizontally at
 * `cellW`/`cellH` intervals. Subtextures share the source atlas, so they are
 * cheap and destroyed with it (Pixi v8 `Texture` frame crop).
 */
export function sliceStrip(texture: Texture, cellW: number, cellH: number, frames: number): Texture[] {
  const out: Texture[] = []
  for (let index = 0; index < frames; index += 1) {
    out.push(
      new Texture({
        source: texture.source,
        frame: new Rectangle(index * cellW, 0, cellW, cellH)
      })
    )
  }
  return out
}
