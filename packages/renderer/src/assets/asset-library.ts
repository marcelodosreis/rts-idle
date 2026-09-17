import type { AssetEntry, AssetManifest } from '@rts/shared'
import { type AnimatedSprite, Assets, Rectangle, Sprite, Texture } from 'pixi.js'
import { createAnimation } from './create-animation.js'
import { loadManifest } from './load-manifest.js'
import { sliceStrip } from './slice-strip.js'

/**
 * Presentation asset library: loads the manifest from the assets base URL,
 * caches raw textures, and builds sprites from manifest entries. Every method
 * returns `null` on failure so callers fall back to placeholders (CI-safe
 * without art, ADR-015).
 */
export class AssetLibrary {
  private manifest: AssetManifest | null = null
  private readonly textures = new Map<string, Texture>()
  private readonly strips = new Map<string, Texture[]>()

  constructor(private readonly baseUrl: string) {}

  /** Loads the manifest. Returns `false` (fallback mode) if unavailable. */
  async load(): Promise<boolean> {
    this.manifest = await loadManifest(this.baseUrl)
    return this.manifest !== null
  }

  entry(key: string): AssetEntry | null {
    return this.manifest?.assets[key] ?? null
  }

  /** Loads (and caches) the raw texture for a manifest entry. */
  async texture(key: string): Promise<Texture | null> {
    const cached = this.textures.get(key)
    if (cached !== undefined) {
      return cached
    }
    const entry = this.entry(key)
    if (entry === null) {
      return null
    }
    try {
      const url = `${this.baseUrl}/${entry.file}`
      const texture = await Assets.load<Texture>(url)
      this.textures.set(key, texture)
      return texture
    } catch {
      return null
    }
  }

  /** Sliced frame textures for a strip entry (cached). */
  async stripTextures(key: string): Promise<Texture[] | null> {
    const cached = this.strips.get(key)
    if (cached !== undefined) {
      return cached
    }
    const entry = this.entry(key)
    if (entry === null || entry.kind !== 'strip') {
      return null
    }
    const texture = await this.texture(key)
    if (texture === null) {
      return null
    }
    const frames = sliceStrip(texture, entry.cellW, entry.cellH, entry.frames)
    this.strips.set(key, frames)
    return frames
  }

  /** A new animated sprite for a strip entry, or `null` on failure. */
  async animated(key: string): Promise<AnimatedSprite | null> {
    const entry = this.entry(key)
    if (entry === null || entry.kind !== 'strip') {
      return null
    }
    const frames = await this.stripTextures(key)
    if (frames === null) {
      return null
    }
    return createAnimation(entry, frames)
  }

  /** A static sprite for a `static`/`tileset` entry (first tile), or `null`. */
  async staticSprite(key: string): Promise<Sprite | null> {
    const entry = this.entry(key)
    if (entry === null || entry.kind === 'strip') {
      return null
    }
    const texture = await this.texture(key)
    if (texture === null) {
      return null
    }
    const sprite = new Sprite(texture)
    sprite.anchor.set(entry.anchorX, entry.anchorY)
    return sprite
  }

  /** Row-major tile textures of a `tileset` entry, or `null`. */
  async tileTextures(key: string): Promise<Texture[] | null> {
    const entry = this.entry(key)
    if (entry === null || entry.kind !== 'tileset' || entry.columns === undefined || entry.rows === undefined) {
      return null
    }
    const texture = await this.texture(key)
    if (texture === null) {
      return null
    }
    const tiles: Texture[] = []
    for (let row = 0; row < entry.rows; row += 1) {
      for (let column = 0; column < entry.columns; column += 1) {
        tiles.push(
          new Texture({
            source: texture.source,
            frame: new Rectangle(column * entry.cellW, row * entry.cellH, entry.cellW, entry.cellH)
          })
        )
      }
    }
    return tiles
  }

  /** Destroys cached textures (call on dispose). */
  destroy(): void {
    for (const texture of this.textures.values()) {
      texture.destroy()
    }
    this.textures.clear()
    this.strips.clear()
    this.manifest = null
  }
}
