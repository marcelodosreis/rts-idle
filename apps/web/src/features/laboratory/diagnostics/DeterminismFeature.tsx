import { runDeterminismFixture } from '@rts/simulation/fixtures'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

declare global {
  interface Window {
    __runDetFixture?: (seed: number, ticks: number) => string[]
  }
}

export function DeterminismFeature() {
  const [seed, setSeed] = useState(1)
  const [ticks, setTicks] = useState(400)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    readonly passed: boolean
    readonly comparedTicks: number
    readonly mismatchTick: number | null
    readonly firstHash: string | null
    readonly lastHash: string | null
  } | null>(null)

  useEffect(() => {
    window.__runDetFixture = (fixtureSeed, fixtureTicks) => runDeterminismFixture(fixtureSeed, fixtureTicks)
    return () => {
      delete window.__runDetFixture
    }
  }, [])

  const runCheck = (): void => {
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const fixture = window.__runDetFixture
      if (fixture === undefined) {
        throw new Error('The determinism fixture is not ready yet.')
      }

      const first = fixture(seed, ticks)
      const second = fixture(seed, ticks)
      const comparedTicks = Math.max(first.length, second.length)
      let mismatchTick: number | null = null
      for (let tick = 0; tick < comparedTicks; tick += 1) {
        if (first[tick] !== second[tick]) {
          mismatchTick = tick
          break
        }
      }

      setResult({
        passed: mismatchTick === null && first.length === second.length,
        comparedTicks,
        mismatchTick,
        firstHash: first[0] ?? null,
        lastHash: first.at(-1) ?? null
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The determinism check failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="space-y-5 rounded-lg border border-border/60 bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Determinism browser harness</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Run the same fixture twice in the browser and compare every state hash.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="determinism-seed">Seed</Label>
          <Input
            id="determinism-seed"
            type="number"
            min={0}
            step={1}
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="determinism-ticks">Ticks</Label>
          <Input
            id="determinism-ticks"
            type="number"
            min={1}
            step={1}
            value={ticks}
            onChange={(event) => setTicks(Number(event.target.value))}
          />
        </div>
        <Button type="button" onClick={runCheck} disabled={running || seed < 0 || ticks < 1}>
          {running ? 'Running...' : 'Run Determinism Check'}
        </Button>
      </div>

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
          data-testid="determinism-result"
          role="status"
          className={`rounded-md border p-4 ${result.passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-destructive/40 bg-destructive/10'}`}
        >
          <p className="font-semibold">{result.passed ? 'Passed' : 'Mismatch detected'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.passed
              ? `${result.comparedTicks} ticks produced identical hashes in both browser runs.`
              : `First mismatch at tick ${result.mismatchTick ?? 'unknown'}.`}
          </p>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">First hash</dt>
              <dd className="mt-1 truncate font-mono">{result.firstHash ?? 'none'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last hash</dt>
              <dd className="mt-1 truncate font-mono">{result.lastHash ?? 'none'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Compared ticks</dt>
              <dd className="mt-1 font-mono">{result.comparedTicks}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  )
}
