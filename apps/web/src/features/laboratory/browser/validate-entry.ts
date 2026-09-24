import { validateAsset } from '@rts/renderer'
import type { AssetEntry } from '@rts/shared'
import { frameRgba } from '../shared/core/pixels.js'
import type { SectionContext } from '../shared/core/types.js'

/** Runs the shared validator over a key and formats the result for the readout. */
export async function validateEntry(ctx: SectionContext, key: string, entry: AssetEntry): Promise<string> {
  const texture = await ctx.assets.texture(key)
  if (texture === null) {
    return `${key}\nload failed`
  }
  const image = texture.source.resource as CanvasImageSource
  const geometry = { width: texture.width, height: texture.height }
  const frames: { readonly index: number; readonly rgba: Uint8ClampedArray }[] = []
  if (entry.kind === 'strip') {
    for (let i = 0; i < entry.frames; i += 1) {
      frames.push({
        index: i,
        rgba: await frameRgba(image, { x: i * entry.cellW, y: 0, w: entry.cellW, h: entry.cellH })
      })
    }
  } else if (entry.kind === 'tileset' && entry.columns !== undefined && entry.rows !== undefined) {
    for (let r = 0; r < entry.rows; r += 1) {
      for (let c = 0; c < entry.columns; c += 1) {
        frames.push({
          index: r * entry.columns + c,
          rgba: await frameRgba(image, { x: c * entry.cellW, y: r * entry.cellH, w: entry.cellW, h: entry.cellH })
        })
      }
    }
  } else {
    frames.push({ index: 0, rgba: await frameRgba(image, { x: 0, y: 0, w: entry.cellW, h: entry.cellH }) })
  }
  const issues = validateAsset(entry, { geometry, frames })
  const lines = issues.map(
    (i) => `${i.severity.toUpperCase()} ${i.code}${i.frame !== undefined ? ` [frame ${i.frame}]` : ''} — ${i.message}`
  )
  return `${key}\n${lines.length === 0 ? 'PASS — no issues' : lines.join('\n')}`
}
