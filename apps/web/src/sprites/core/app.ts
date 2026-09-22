import { Application, type TextureSource } from 'pixi.js'

export type FilterMode = 'nearest' | 'linear'

const textureSources = new Set<TextureSource>()
let mode: FilterMode = 'nearest'

/** Every section app created by the lab, so the shell can pause hidden tabs. */
const apps = new Set<Application>()
let appsPaused = false

/** Host observers, keyed by app, so `disposeSectionApp` can disconnect them. */
const resizeObservers = new WeakMap<Application, ResizeObserver>()

/** Logical host size with sane fallbacks for collapsed/zero-sized hosts. */
function measureHost(host: HTMLElement, fallbackHeight: number): { width: number; height: number } {
  const rect = host.getBoundingClientRect()
  return {
    width: Math.max(320, Math.round(rect.width) || 800),
    height: Math.max(160, Math.round(rect.height) || fallbackHeight)
  }
}

/** Current global texture filter. Every section's sprites share this mode. */
export function getFilterMode(): FilterMode {
  return mode
}

/**
 * Applies a texture filter to every tracked source. The lab page uses this to
 * demonstrate the seam artifact: the game's terrain sprite is upscaled without
 * an explicit `scaleMode`, so Pixi defaults to `linear`. The lab defaults to
 * `nearest` so the intended look is the one we port back to the game.
 */
export function setFilterMode(next: FilterMode): void {
  mode = next
  for (const source of textureSources) {
    source.scaleMode = next
  }
}

/** Pauses or resumes every live section app (used when switching tabs). */
export function setAppsPaused(paused: boolean): void {
  appsPaused = paused
  for (const app of apps) {
    if (paused) {
      app.ticker.stop()
    } else {
      app.ticker.start()
    }
  }
}

/** Pauses or resumes the apps living inside a given DOM host (one tab). */
export function setHostPaused(host: HTMLElement, paused: boolean): void {
  for (const app of apps) {
    if (host.contains(app.canvas)) {
      if (paused) {
        app.ticker.stop()
      } else {
        app.ticker.start()
      }
    }
  }
}

/** Removes a section app from the global tracking set. */
export function removeApp(app: Application): void {
  apps.delete(app)
}

/**
 * Disconnects the host observer and unregisters a section app. Call this
 * before `app.destroy()` so a pending resize never touches a destroyed
 * renderer.
 */
export function disposeSectionApp(app: Application): void {
  resizeObservers.get(app)?.disconnect()
  resizeObservers.delete(app)
  removeApp(app)
}

/** Registers a texture source so the global toggle controls it. */
export function trackTextureSource(source: TextureSource): void {
  textureSources.add(source)
  source.scaleMode = mode
}

/** Convenience: registers the source behind any Pixi texture/frame. */
export function trackTexture(texture: { readonly source: TextureSource }): void {
  trackTextureSource(texture.source)
}

/**
 * Creates a self-contained Pixi Application inside a section host. Sections
 * are isolated (one context each) and mirror `PixiRenderer.mount`: art is
 * presentational only and never touches the simulation.
 *
 * The app tracks its host box with a `ResizeObserver` and resizes the renderer
 * to it, then notifies `onResize` (used by sections that must re-render or
 * refit their camera on layout changes). `height` is the fallback used while
 * the host has no measurable height.
 */
export async function createSectionApp(
  host: HTMLElement,
  height: number,
  onResize?: (width: number, height: number) => void
): Promise<Application> {
  const initial = measureHost(host, height)
  const app = new Application()
  await app.init({
    width: initial.width,
    height: initial.height,
    background: 0xf4efe4,
    antialias: true,
    preference: 'webgl'
  })
  apps.add(app)
  if (appsPaused) {
    app.ticker.stop()
  }
  // Keep the app ticker active so AnimatedSprites update at 60 fps (matches the game).
  // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op to keep ticker alive
  app.ticker.add(() => {})
  host.appendChild(app.canvas)

  const observer = new ResizeObserver(() => {
    const size = measureHost(host, height)
    if (size.width === app.screen.width && size.height === app.screen.height) {
      return
    }
    app.renderer.resize(size.width, size.height)
    onResize?.(size.width, size.height)
  })
  observer.observe(host)
  resizeObservers.set(app, observer)

  return app
}
