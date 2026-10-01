import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import { FIXED_SCALE, gridPosition, percentile, TILE_PIXELS } from '@rts/shared'

export interface RendererPerfResult {
  readonly count: number
  readonly frames: number
  readonly avgMs: number
  readonly p95Ms: number
  readonly maxMs: number
  readonly layout: {
    readonly centerX: number
    readonly centerY: number
    readonly zoom: number
  }
}

const PERF_COLUMNS = 64
function prepareHost(mountHost: HTMLElement | undefined): { readonly host: HTMLElement; readonly ownsHost: boolean } {
  if (mountHost !== undefined) {
    mountHost.replaceChildren()
    return { host: mountHost, ownsHost: false }
  }
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = '1280px'
  host.style.height = '720px'
  host.style.pointerEvents = 'none'
  document.body.appendChild(host)
  return { host, ownsHost: true }
}

function computeLayout(host: HTMLElement, count: number): RendererPerfResult['layout'] {
  const rows = Math.ceil(count / PERF_COLUMNS)
  const contentWidth = Math.min(PERF_COLUMNS, count) * TILE_PIXELS
  const contentHeight = rows * TILE_PIXELS
  const zoom = Math.min(
    1,
    Math.max(0.05, Math.min(host.clientWidth / contentWidth, host.clientHeight / contentHeight) * 0.9)
  )
  return { centerX: contentWidth / 2, centerY: contentHeight / 2, zoom }
}

function buildUnits(count: number): readonly { id: number; x: number; y: number; owner: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const position = gridPosition(index, PERF_COLUMNS, FIXED_SCALE)
    return { id: index + 1, x: position.x, y: position.y, owner: index % 2 }
  })
}

function measureFrames(targetFrames: number): Promise<number[]> {
  const frames: number[] = []
  return new Promise((resolve) => {
    let last = performance.now()
    const loop = (now: number): void => {
      frames.push(now - last)
      last = now
      if (frames.length >= targetFrames) {
        resolve(frames)
        return
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

function summarizeFrames(frames: readonly number[]): {
  readonly avgMs: number
  readonly p95Ms: number
  readonly maxMs: number
} {
  const sorted = [...frames].sort((a, b) => a - b)
  return {
    avgMs: frames.reduce((acc, value) => acc + value, 0) / frames.length,
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1) ?? 0
  }
}

function finalizeRenderer(
  renderer: GameRenderer,
  host: HTMLElement,
  ownsHost: boolean,
  onRendererReady: ((renderer: GameRenderer) => void) | undefined
): void {
  if (onRendererReady !== undefined) {
    onRendererReady(renderer)
    return
  }
  renderer.dispose()
  if (ownsHost) {
    host.remove()
  }
}

/** Mounts an offscreen-capable renderer, presents `count` units, and samples frame times. */
export async function runRendererPerf(
  count: number,
  targetFrames = 120,
  mountHost?: HTMLElement,
  onRendererReady?: (renderer: GameRenderer) => void
): Promise<RendererPerfResult> {
  const { host, ownsHost } = prepareHost(mountHost)
  const layout = computeLayout(host, count)
  const renderer: GameRenderer = new PixiRenderer({
    worldWidth: 12288,
    worldHeight: 12288,
    initialZoom: layout.zoom,
    initialCenter: { x: layout.centerX, y: layout.centerY }
  })
  await renderer.mount(host, { onInteraction: () => undefined })
  renderer.present({ tick: 1, units: buildUnits(count) })
  const frames = await measureFrames(targetFrames)
  const summary = summarizeFrames(frames)
  finalizeRenderer(renderer, host, ownsHost, onRendererReady)
  return { count, frames: frames.length, ...summary, layout }
}
