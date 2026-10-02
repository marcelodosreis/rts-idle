import { type MatchConfig, PROTOCOL_VERSION } from '@rts/protocol'
import type { GameRenderer, RenderFrame } from '@rts/renderer'
import { describe, expect, it, vi } from 'vitest'
import { createMatchRendererLifecycle } from '../../../apps/web/src/features/match/services/match-session-renderer'
import { createMatchSessionRuntime } from '../../../apps/web/src/features/match/services/match-session-runtime'

function fakeRenderer(mount: () => Promise<void>): GameRenderer & { presented: RenderFrame[]; disposed: number } {
  const value = {
    presented: [] as RenderFrame[],
    disposed: 0,
    mount,
    present(nextFrame: RenderFrame) {
      value.presented.push(nextFrame)
    },
    resize: vi.fn(),
    dispose() {
      value.disposed += 1
    },
    setSelection: vi.fn(),
    getSelection: () => [],
    getSelectionBoxState: () => ({ visible: false, x: 0, y: 0, width: 0, height: 0 }),
    getUnitPositions: () => new Map(),
    getUnitAnimationFrame: () => null,
    getUnitHealth: () => null,
    getUnitSpriteState: () => null,
    getZoom: () => 1,
    setInputProfile: vi.fn(),
    getPing: () => null,
    moveCamera: vi.fn(),
    worldToScreen: (x: number, y: number) => ({ x, y }),
    setBuildPreview: vi.fn()
  }
  return value
}

const config: MatchConfig = {
  type: 'match_config',
  protocolVersion: PROTOCOL_VERSION,
  resumeToken: 'resume-token',
  map: { width: 2, height: 2, tiles: ['land', 'land', 'land', 'land'] },
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
