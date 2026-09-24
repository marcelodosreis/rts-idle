/** Reads decoded RGBA pixels of a texture region (browser-only helper). */
export async function frameRgba(
  image: CanvasImageSource,
  rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
): Promise<Uint8ClampedArray> {
  const canvas = document.createElement('canvas')
  canvas.width = rect.w
  canvas.height = rect.h
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) {
    return new Uint8ClampedArray(0)
  }
  context.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h)
  return context.getImageData(0, 0, rect.w, rect.h).data
}

/** Opaque content bounds of a RGBA buffer, or `null` when fully transparent. */
export function opaqueBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rgba[(y * width + x) * 4 + 3] ?? 0
      if (alpha <= 8) {
        continue
      }
      if (x < minX) {
        minX = x
      }
      if (x > maxX) {
        maxX = x
      }
      if (y < minY) {
        minY = y
      }
      if (y > maxY) {
        maxY = y
      }
    }
  }
  if (maxX < 0) {
    return null
  }
  return { minX, minY, maxX, maxY }
}
