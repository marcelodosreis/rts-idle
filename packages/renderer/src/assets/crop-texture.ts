import { Rectangle, Texture } from 'pixi.js'

interface VisibleBounds {
  readonly minX: number
  readonly minY: number
  readonly width: number
  readonly height: number
}

function opaqueBounds(rgba: Uint8ClampedArray, width: number, height: number): VisibleBounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((rgba[(y * width + x) * 4 + 3] ?? 0) <= 8) {
        continue
      }
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return maxX < 0 ? null : { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** Crops transparent margins while preserving the source texture's native pixels. */
export function cropTextureToOpaqueBounds(texture: Texture, width: number, height: number): Texture | null {
  if (typeof document === 'undefined') {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) {
    return null
  }
  context.drawImage(texture.source.resource as CanvasImageSource, 0, 0, width, height)
  const bounds = opaqueBounds(context.getImageData(0, 0, width, height).data, width, height)
  if (bounds === null) {
    return null
  }
  return new Texture({
    source: texture.source,
    frame: new Rectangle(bounds.minX, bounds.minY, bounds.width, bounds.height)
  })
}
