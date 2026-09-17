import { Application, type TextureSource } from 'pixi.js'

export type FilterMode = 'nearest' | 'linear'

const textureSources = new Set<TextureSource>()
let mode: FilterMode = 'nearest'

/** Every section app created by the lab, so the shell can pause hidden tabs. */
const apps = new Set<Application>()
let appsPaused = false

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
 */
export async function createSectionApp(host: HTMLElement, height: number): Promise<Application> {
  const width = Math.max(320, Math.round(host.getBoundingClientRect().width) || 800)
  const app = new Application()
  await app.init({
    width,
    height,
    background: 0xf4efe4,
    antialias: true,
    preference: 'webgl'
  })
  apps.add(app)
  if (appsPaused) {
    app.ticker.stop()
  }
  host.appendChild(app.canvas)
  return app
}
