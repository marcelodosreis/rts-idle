import type { AssetEntry } from '@rts/shared'
import { AnimatedSprite, type Texture } from 'pixi.js'
import { durationMsToPixiAnimationSpeed } from '../visual-timing.js'

/**
 * Builds an `AnimatedSprite` from sliced frame textures using the manifest
 * entry's anchor and frame duration. `animationSpeed` is frames per visual
 * tick (Pixi v8: `elapsed = animationSpeed * ticker.deltaTime` with
 * deltaTime in seconds, ~60 ticks/s), so frames-per-second is
 * `(1000 / duration) / 60`.
 */
export function createAnimation(entry: AssetEntry, textures: Texture[]): AnimatedSprite {
  // autoUpdate=false: the renderer advances frames from its own visual tick so
  // animation does not depend on Pixi's shared ticker running.
  const sprite = new AnimatedSprite(textures, false)
  sprite.anchor.set(entry.anchorX, entry.anchorY)
  sprite.animationSpeed = durationMsToPixiAnimationSpeed(entry.duration ?? 100)
  return sprite
}
