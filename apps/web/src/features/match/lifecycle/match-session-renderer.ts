import type { MatchConfig } from '@rts/protocol'
import type { GameRenderer, RendererCallbacks, RenderFrame } from '@rts/renderer'
import { PixiRenderer } from '@rts/renderer'
import type { MatchSessionRuntime } from './match-session-runtime'

export interface MatchRendererLifecycleOptions {
  readonly host: HTMLElement
  readonly runtime: MatchSessionRuntime
  readonly rendererFactory?: (config: MatchConfig) => GameRenderer
  readonly callbacks: RendererCallbacks
  readonly onReady: (renderer: GameRenderer, config: MatchConfig) => void
  readonly onError: (error: unknown) => void
}

export interface MatchRendererLifecycle {
  mount(config: MatchConfig): void
  present(frame: RenderFrame): void
  dispose(): void
}

export function createMatchRendererLifecycle(options: MatchRendererLifecycleOptions): MatchRendererLifecycle {
  const { host, runtime, callbacks, onReady, onError } = options
  const rendererFactory =
    options.rendererFactory ??
    ((config) =>
      new PixiRenderer({
        worldWidth: config.map.width * 32,
        worldHeight: config.map.height * 32,
        initialZoom: 1,
        initialCenter: { x: 64, y: 64 },
        assetsUrl: '',
        map: config.map
      }))
  const disposedRenderers = new Set<GameRenderer>()

  const disposeRenderer = (renderer: GameRenderer): void => {
    if (disposedRenderers.has(renderer)) {
      return
    }
    disposedRenderers.add(renderer)
    renderer.dispose()
  }

  return {
    mount(config) {
      if (!runtime.sessionActive || runtime.renderer !== null) {
        return
      }
      const configuredRenderer = rendererFactory(config)
      runtime.renderer = configuredRenderer
      void configuredRenderer
        .mount(host, callbacks)
        .then(() => {
          if (!runtime.sessionActive || runtime.renderer !== configuredRenderer) {
            disposeRenderer(configuredRenderer)
            return
          }
          runtime.rendererReady = true
          if (runtime.pendingFrame !== null) {
            configuredRenderer.present(runtime.pendingFrame)
            runtime.pendingFrame = null
          }
          onReady(configuredRenderer, config)
        })
        .catch((error: unknown) => {
          if (!runtime.sessionActive || runtime.renderer !== configuredRenderer) {
            return
          }
          disposeRenderer(configuredRenderer)
          runtime.renderer = null
          runtime.rendererReady = false
          runtime.pendingFrame = null
          onError(error)
        })
    },
    present(frame) {
      if (!runtime.rendererReady || runtime.renderer === null) {
        runtime.pendingFrame = frame
        return
      }
      runtime.renderer.present(frame)
    },
    dispose() {
      runtime.sessionActive = false
      runtime.rendererReady = false
      runtime.pendingFrame = null
      if (runtime.renderer !== null) {
        disposeRenderer(runtime.renderer)
        runtime.renderer = null
      }
    }
  }
}
