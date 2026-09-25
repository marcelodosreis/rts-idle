import type { GameRenderer } from '@rts/renderer'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { type RendererPerfResult, runRendererPerf } from './renderer-perf.js'

export type { RendererPerfResult }

declare global {
  interface Window {
    __runRendererPerf?: (count: number, targetFrames?: number) => Promise<RendererPerfResult>
  }
}

const PRESETS = [100, 1000, 5000] as const

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
    </div>
  )
}

function PerfForm({
  count,
  frames,
  running,
  onCount,
  onFrames,
  onRun
}: {
  readonly count: number
  readonly frames: number
  readonly running: boolean
  readonly onCount: (value: number) => void
  readonly onFrames: (value: number) => void
  readonly onRun: () => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="performance-unit-count">Units</Label>
        <Input
          id="performance-unit-count"
          type="number"
          min={1}
          step={1}
          value={count}
          onChange={(event) => onCount(Number(event.target.value))}
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
          onChange={(event) => onFrames(Number(event.target.value))}
        />
      </div>
      <Button type="button" onClick={onRun} disabled={running || count < 1 || frames < 1}>
        {running ? 'Running...' : 'Run Performance Test'}
      </Button>
    </div>
  )
}

function PerfResult({ result }: { readonly result: RendererPerfResult }) {
  return (
    <div data-testid="performance-result" role="status" className="rounded-md border border-border/60 bg-muted/20 p-4">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Units" value={result.count.toLocaleString()} />
        <Metric label="Average" value={`${result.avgMs.toFixed(2)} ms`} />
        <Metric label="P95" value={`${result.p95Ms.toFixed(2)} ms`} />
        <Metric label="Maximum" value={`${result.maxMs.toFixed(2)} ms`} />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        {result.frames} frames measured · estimated {result.avgMs > 0 ? (1000 / result.avgMs).toFixed(1) : '0.0'} FPS ·
        target 16.67 ms / 60 FPS
      </p>
    </div>
  )
}

function useRendererBenchmark(hostRef: RefObject<HTMLDivElement | null>): {
  readonly count: number
  readonly frames: number
  readonly running: boolean
  readonly error: string | null
  readonly result: RendererPerfResult | null
  readonly setCount: (value: number) => void
  readonly setFrames: (value: number) => void
  readonly run: () => void
} {
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

  const run = useCallback((): void => {
    void (async () => {
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
              : (r) => {
                  rendererRef.current = r
                }
          )
        )
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'The renderer benchmark failed.')
      } finally {
        setRunning(false)
      }
    })()
  }, [count, frames, hostRef])

  return { count, frames, running, error, result, setCount, setFrames, run }
}

export function RendererPerformanceFeature() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const benchmark = useRendererBenchmark(hostRef)
  return (
    <section className="space-y-5 rounded-lg border border-border/60 bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Renderer performance harness</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Render a controlled number of units and measure frame time. Results are diagnostic, not a hard CI gate.
        </p>
      </div>
      <PerfForm
        count={benchmark.count}
        frames={benchmark.frames}
        running={benchmark.running}
        onCount={benchmark.setCount}
        onFrames={benchmark.setFrames}
        onRun={benchmark.run}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Presets:</span>
        {PRESETS.map((preset) => (
          <Button key={preset} type="button" variant="outline" size="sm" onClick={() => benchmark.setCount(preset)}>
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
      {benchmark.error !== null && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {benchmark.error}
        </p>
      )}
      {benchmark.result !== null && <PerfResult result={benchmark.result} />}
    </section>
  )
}
