import { runDeterminismFixture } from '@rts/simulation/fixtures'

declare global {
  interface Window {
    __runDetFixture?: (seed: number, ticks: number) => string[]
  }
}

window.__runDetFixture = (seed, ticks) => runDeterminismFixture(seed, ticks)
