import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import { FIXED_SCALE, gridPosition } from '@rts/shared'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

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

declare global {
  interface Window {
    __runRendererPerf?: (count: number, targetFrames?: number) => Promise<RendererPerfResult>
  }
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[index] ?? 0
}

const PERF_COLUMNS = 64
const TILE_PIXELS = 64

async function runRendererPerf(
  count: number,
  targetFrames = 120,
  mountHost?: HTMLElement,
  onRendererReady?: (renderer: GameRenderer) => void
): Promise<RendererPerfResult> {
  const ownsHost = mountHost === undefined
  const host = mountHost ?? document.createElement('div')
  if (ownsHost) {
    host.style.position = 'fixed'
    host.style.left = '-10000px'
    host.style.top = '0'
    host.style.width = '1280px'
    host.style.height = '720px'
    host.style.pointerEvents = 'none'
    document.body.appendChild(host)
  } else {
    host.replaceChildren()
  }

  const rows = Math.ceil(count / PERF_COLUMNS)
  const contentWidth = Math.min(PERF_COLUMNS, count) * TILE_PIXELS
  const contentHeight = rows * TILE_PIXELS
  const centerX = contentWidth / 2
  const centerY = contentHeight / 2
  const zoom = Math.min(
    1,
    Math.max(0.05, Math.min(host.clientWidth / contentWidth, host.clientHeight / contentHeight) * 0.9)
  )

  const renderer: GameRenderer = new PixiRenderer({
    worldWidth: 12288,
    worldHeight: 12288,
    initialZoom: zoom,
    initialCenter: { x: centerX, y: centerY }
  })
  await renderer.mount(host, { onInteraction: () => undefined })

  const units = Array.from({ length: count }, (_, i) => {
    const position = gridPosition(i, PERF_COLUMNS, FIXED_SCALE)
    return { id: i + 1, x: position.x, y: position.y, owner: i % 2 }
  })
  renderer.present({ tick: 1, units })

  const frames: number[] = []
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
  const avgMs = frames.reduce((acc, value) => acc + value, 0) / frames.length
  const p95Ms = percentile(sorted, 0.95)
  const maxMs = sorted.at(-1) ?? 0

  if (onRendererReady === undefined) {
    renderer.dispose()
    if (ownsHost) {
      host.remove()
    }
  } else {
    onRendererReady(renderer)
  }
  return { count, frames: frames.length, avgMs, p95Ms, maxMs, layout: { centerX, centerY, zoom } }
}

export function RendererPerformanceFeature() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const [count, setCount] = useState(1000)
  const [frames, setFrames] = useState(120)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RendererPerfResult | null>(null)

  useEffect(() => {
    window.__runRendererPerf = runRendererPerf
    return () => {
      delete window.__runRendererPerf
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  const runBenchmark = async (): Promise<void> => {
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      rendererRef.current?.dispose()
      rendererRef.current = null
      const host = hostRef.current
      setResult(
        await runRendererPerf(
          count,
          frames,
          host ?? undefined,
          host === null
            ? undefined
            : (renderer) => {
                rendererRef.current = renderer
              }
        )
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The renderer benchmark failed.')
    } finally {
      setRunning(false)
    }
  }

  const applyPreset = (preset: number): void => {
    setCount(preset)
  }

  return (
    <section className="space-y-5 rounded-lg border border-border/60 bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Renderer performance harness</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Render a controlled number of units and measure frame time. Results are diagnostic, not a hard CI gate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="performance-unit-count">Units</Label>
          <Input
            id="performance-unit-count"
            type="number"
            min={1}
            step={1}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="performance-frame-count">Frames</Label>
          <Input
            id="performance-frame-count"
            type="number"
            min={1}
            step={1}
            value={frames}
            onChange={(event) => setFrames(Number(event.target.value))}
          />
        </div>
        <Button type="button" onClick={() => void runBenchmark()} disabled={running || count < 1 || frames < 1}>
          {running ? 'Running...' : 'Run Performance Test'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Presets:</span>
        {[100, 1000, 5000].map((preset) => (
          <Button key={preset} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)}>
            {preset.toLocaleString()}
          </Button>
        ))}
      </div>

      <div
        ref={hostRef}
        data-testid="performance-canvas-host"
        role="img"
        aria-label="Performance renderer preview"
        className="h-64 min-w-0 overflow-hidden rounded-md border border-border/60 bg-background sm:h-80"
      />

      {error !== null && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {result !== null && (
        <div
          data-testid="performance-result"
          role="status"
          className="rounded-md border border-border/60 bg-muted/20 p-4"
        >
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Units" value={result.count.toLocaleString()} />
            <Metric label="Average" value={`${result.avgMs.toFixed(2)} ms`} />
            <Metric label="P95" value={`${result.p95Ms.toFixed(2)} ms`} />
            <Metric label="Maximum" value={`${result.maxMs.toFixed(2)} ms`} />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {result.frames} frames measured · estimated {result.avgMs > 0 ? (1000 / result.avgMs).toFixed(1) : '0.0'}{' '}
            FPS · target 16.67 ms / 60 FPS
          </p>
        </div>
      )}
    </section>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
    </div>
  )
}
