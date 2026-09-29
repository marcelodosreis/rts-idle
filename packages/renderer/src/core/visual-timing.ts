/** Pixi's animation speed is frames per 60 FPS visual tick. */
export const PIXI_BASE_FPS = 60
/** Shared visual attack-cycle duration for every combat animation. */
export const STANDARD_ATTACK_CYCLE_MS = 400

export function durationMsToFps(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('durationMsToFps: duration must be positive')
  }
  return 1000 / durationMs
}

export function fpsToPixiAnimationSpeed(fps: number): number {
  if (!Number.isFinite(fps) || fps < 0) {
    throw new Error('fpsToPixiAnimationSpeed: fps must be non-negative')
  }
  return fps / PIXI_BASE_FPS
}

export function durationMsToPixiAnimationSpeed(durationMs: number): number {
  return fpsToPixiAnimationSpeed(durationMsToFps(durationMs))
}

export function frameCountToPixiAnimationSpeed(frameCount: number, cycleMs: number): number {
  if (!Number.isInteger(frameCount) || frameCount <= 0) {
    throw new Error('frameCountToPixiAnimationSpeed: frame count must be positive')
  }
  return fpsToPixiAnimationSpeed(frameCount / (cycleMs / 1000))
}
