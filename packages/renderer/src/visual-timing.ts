/** Pixi's animation speed is frames per 60 FPS visual tick. */
export const PIXI_BASE_FPS = 60

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
