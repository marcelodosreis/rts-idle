import { type MatchConfig, PROTOCOL_VERSION } from '@rts/protocol'
import type { GameRenderer, RenderFrame } from '@rts/renderer'
import type { MapDefinition } from '@rts/shared'
import { describe, expect, it, vi } from 'vitest'
import { createMatchRendererLifecycle } from '../../../apps/web/src/features/match/services/match-session-renderer'
import { createMatchSessionRuntime } from '../../../apps/web/src/features/match/services/match-session-runtime'

function fakeRenderer(mount: () => Promise<void>): GameRenderer & { presented: RenderFrame[]; disposed: number } {
  const value = {
    presented: [] as RenderFrame[],
    disposed: 0,
    mount,
    present(nextFrame: RenderFrame): void {
      value.presented.push(nextFrame)
    },
    resize: vi.fn((_: number, __: number): void => undefined),
    dispose() {
      value.disposed += 1
    },
    setSelection: vi.fn((_: readonly number[]): void => undefined),
    getSelection: (): readonly number[] => [],
    getSelectionBoxState: () => ({ visible: false, x: 0, y: 0, width: 0, height: 0 }),
    getUnitPositions: (): ReadonlyMap<number, { readonly x: number; readonly y: number }> => new Map(),
    getUnitAnimationFrame: (_: number): number | null => null,
    getUnitHealth: (_: number): { readonly current: number; readonly max: number } | null => null,
    getUnitSpriteState: (_: number): null => null,
    getZoom: () => 1,
    setInputProfile: vi.fn((_: 'mouse' | 'trackpad'): void => undefined),
    getPing: (): { readonly x: number; readonly y: number } | null => null,
    setSelectedRallyProducer: vi.fn((_: number | null): void => undefined),
    setSelectedRallyPoint: vi.fn((_: { readonly x: number; readonly y: number } | null): void => undefined),
    getResourceStats: () => ({
      definitions: 0,
      active: 0,
      depleted: 0,
      visibleChunks: 0,
      materializedChunks: 0,
      activeVisuals: 0,
      stumps: 0
    }),
    moveCamera: vi.fn((_: number, __: number): void => undefined),
    worldToScreen: (x: number, y: number) => ({ x, y }),
    setBuildPreview: vi.fn(
      (
        _: null | {
          readonly x: number
          readonly y: number
          readonly width: number
          readonly height: number
          readonly valid: boolean
        }
      ): void => undefined
    )
  }
  return value
}

const config: MatchConfig = {
  type: 'match_config',
  protocolVersion: PROTOCOL_VERSION,
  resumeToken: 'resume-token',
  map: { width: 2, height: 2, tiles: ['land', 'land', 'land', 'land'], resources: [] } satisfies MapDefinition,
  buildings: [],
  production: [],
  research: [],
  scenarios: [],
  scenario: { id: 'test', label: 'Test' }
}
const frame: RenderFrame = { tick: 1, units: [] }
const host = {} as HTMLElement

describe('match renderer lifecycle', () => {
  it('presents the pending snapshot after delayed mount', async () => {
    let resolveMount!: () => void
    const renderer = fakeRenderer(
      () =>
        new Promise<void>((resolve) => {
          resolveMount = resolve
        })
    )
    const runtime = createMatchSessionRuntime()
    const ready = vi.fn()
    const lifecycle = createMatchRendererLifecycle({
      host,
      runtime,
      rendererFactory: () => renderer,
      callbacks: { onInteraction: vi.fn() },
      onReady: ready,
      onFramePresented: vi.fn(),
      onError: vi.fn()
    })

    lifecycle.mount(config)
    lifecycle.present(frame)
    expect(runtime.pendingFrame).toBe(frame)
    resolveMount()
    await Promise.resolve()
    await Promise.resolve()
    expect(renderer.presented).toEqual([frame])
    expect(ready).toHaveBeenCalledOnce()
  })

  it('disposes a renderer once when unmounted before mount resolves', async () => {
    let resolveMount!: () => void
    const renderer = fakeRenderer(
      () =>
        new Promise<void>((resolve) => {
          resolveMount = resolve
        })
    )
    const runtime = createMatchSessionRuntime()
    const lifecycle = createMatchRendererLifecycle({
      host,
      runtime,
      rendererFactory: () => renderer,
      callbacks: { onInteraction: vi.fn() },
      onReady: vi.fn(),
      onFramePresented: vi.fn(),
      onError: vi.fn()
    })
    lifecycle.mount(config)
    lifecycle.dispose()
    resolveMount()
    await Promise.resolve()
    await Promise.resolve()
    expect(renderer.disposed).toBe(1)
  })

  it('disposes and reports a mount failure', async () => {
    const error = new Error('mount failed')
    const renderer = fakeRenderer(() => Promise.reject(error))
    const runtime = createMatchSessionRuntime()
    const onError = vi.fn()
    const lifecycle = createMatchRendererLifecycle({
      host,
      runtime,
      rendererFactory: () => renderer,
      callbacks: { onInteraction: vi.fn() },
      onReady: vi.fn(),
      onFramePresented: vi.fn(),
      onError
    })
    lifecycle.mount(config)
    await Promise.resolve()
    await Promise.resolve()
    expect(renderer.disposed).toBe(1)
    expect(onError).toHaveBeenCalledWith(error)
    expect(runtime.renderer).toBeNull()
  })
})
