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

function defaultRendererFactory(config: MatchConfig): GameRenderer {
  return new PixiRenderer({
    worldWidth: config.map.width * 32,
    worldHeight: config.map.height * 32,
    initialZoom: 1,
    initialCenter: { x: 64, y: 64 },
    assetsUrl: '',
    map: config.map
  })
}

function disposeRenderer(disposed: Set<GameRenderer>, renderer: GameRenderer): void {
  if (disposed.has(renderer)) {
    return
  }
  disposed.add(renderer)
  renderer.dispose()
}

/** Mounts a configured renderer, presenting any frame that arrived early. */
function mountRenderer(
  options: MatchRendererLifecycleOptions,
  factory: (config: MatchConfig) => GameRenderer,
  disposed: Set<GameRenderer>,
  config: MatchConfig
): void {
  const { host, runtime, callbacks, onReady, onError } = options
  if (!runtime.sessionActive || runtime.renderer !== null) {
    return
  }
  const configuredRenderer = factory(config)
  runtime.renderer = configuredRenderer
  void configuredRenderer
    .mount(host, callbacks)
    .then(() => {
      if (!runtime.sessionActive || runtime.renderer !== configuredRenderer) {
        disposeRenderer(disposed, configuredRenderer)
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
      disposeRenderer(disposed, configuredRenderer)
      runtime.renderer = null
      runtime.rendererReady = false
      runtime.pendingFrame = null
      onError(error)
    })
}

export function createMatchRendererLifecycle(options: MatchRendererLifecycleOptions): MatchRendererLifecycle {
  const { runtime } = options
  const factory = options.rendererFactory ?? defaultRendererFactory
  const disposedRenderers = new Set<GameRenderer>()

  return {
    mount(config) {
      mountRenderer(options, factory, disposedRenderers, config)
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
        disposeRenderer(disposedRenderers, runtime.renderer)
        runtime.renderer = null
      }
    }
  }
}
