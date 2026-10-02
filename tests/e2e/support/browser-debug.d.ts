import type { RendererPerfResult } from '@/features/laboratory/diagnostics/services/renderer-perf'
import type { RtsDebug } from '@/features/match/services/match-debug'

declare global {
  interface Window {
    __rtsDebug?: RtsDebug
    __spriteLab?: {
      browse(key: string): void
      tab(): string
      ready: boolean
    }
    __runDetFixture?: (seed: number, ticks: number) => string[]
    __runRendererPerf?: (count: number, targetFrames?: number) => Promise<RendererPerfResult>
  }
}
