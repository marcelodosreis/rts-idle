import type { AssetEntry } from '@rts/shared'
import { AnimatedSprite, type Texture } from 'pixi.js'

/**
 * Builds an `AnimatedSprite` from sliced frame textures using the manifest
 * entry's anchor and frame duration. `animationSpeed` is frames per second
 * (Pixi v8: `elapsed = animationSpeed * ticker.deltaTime` with deltaTime in
 * seconds); `duration` is in milliseconds per frame.
 */
export function createAnimation(entry: AssetEntry, textures: Texture[]): AnimatedSprite {
  const sprite = new AnimatedSprite(textures)
  sprite.anchor.set(entry.anchorX, entry.anchorY)
  sprite.animationSpeed = 1000 / (entry.duration ?? 120)
  return sprite
}
