import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import { FIXED_SCALE, gridPosition } from '@rts/shared'

export interface RendererPerfResult {
  readonly count: number
  readonly frames: number
  readonly avgMs: number
  readonly p95Ms: number
  readonly maxMs: number
}

declare global {
  interface Window {
    __runRendererPerf?: (count: number) => Promise<RendererPerfResult>
  }
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[index] ?? 0
}

window.__runRendererPerf = async (count) => {
  const host = document.createElement('div')
  host.style.width = '1280px'
  host.style.height = '720px'
  document.body.appendChild(host)

  const renderer: GameRenderer = new PixiRenderer({
    worldWidth: 49152,
    worldHeight: 49152,
    initialZoom: 0.05,
    initialCenter: { x: 24576, y: 24576 }
  })
  await renderer.mount(host, {})

  const units = Array.from({ length: count }, (_, i) => {
    const position = gridPosition(i, 64, FIXED_SCALE)
    return { id: i + 1, x: position.x, y: position.y, owner: i % 2 }
  })
  renderer.present({ tick: 1, units })

  const frames: number[] = []
  const targetFrames = 120
  await new Promise<void>((resolve) => {
    let last = performance.now()
    let done = 0
    const loop = (now: number): void => {
      frames.push(now - last)
      last = now
      done += 1
      if (done >= targetFrames) {
        resolve()
      } else {
        requestAnimationFrame(loop)
      }
    }
    requestAnimationFrame(loop)
  })

  const sorted = [...frames].sort((a, b) => a - b)
  const avgMs = frames.reduce((acc, v) => acc + v, 0) / frames.length
  const p95Ms = percentile(sorted, 0.95)
  const maxMs = sorted.at(-1) ?? 0

  renderer.dispose()
  host.remove()
  return { count, frames: frames.length, avgMs, p95Ms, maxMs }
}
