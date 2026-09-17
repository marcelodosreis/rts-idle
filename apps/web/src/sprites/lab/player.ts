import { AnimatedSprite, type BLEND_MODES, type Container, type Texture, type Ticker } from 'pixi.js'

/** Common player contract the sections drive via the global fps/pause controls. */
export interface LabPlayer {
  readonly sprite: Container
  update(ticker: Ticker): void
  setFps(fps: number): void
  setPaused(paused: boolean): void
  destroy(): void
}

/** Pixi v8 uses `'add'` for additive blending. */
export type BlendChoice = 'normal' | 'add'

function blendMode(choice: BlendChoice): BLEND_MODES {
  return choice
}

export interface StripPlayerOptions {
  readonly frames: readonly Texture[]
  /** Frames per second; defaults to `1000 / durationMs`. */
  readonly fps?: number
  readonly durationMs?: number
  readonly loop?: boolean
  readonly blend?: BlendChoice
  readonly anchorX?: number
  readonly anchorY?: number
  readonly scale?: number
  /** Restart from frame 0 when a non-loop animation completes. */
  readonly autoReplay?: boolean
}

/**
 * Reusable strip player: an `AnimatedSprite` advanced via `update(ticker)`
 * from the owning app's ticker, mirroring how the game drives animations
 * through the renderer's visual tick. Controls live in React (shadcn); this
 * class only owns playback state.
 */
export class StripPlayer {
  readonly sprite: AnimatedSprite
  private paused = false
  private readonly loop: boolean
  private fps: number

  constructor(options: StripPlayerOptions) {
    this.fps = options.fps ?? Math.round(1000 / (options.durationMs ?? 100))
    this.loop = options.loop ?? true
    this.sprite = new AnimatedSprite([...options.frames], false)
    this.sprite.anchor.set(options.anchorX ?? 0.5, options.anchorY ?? 0.5)
    this.sprite.animationSpeed = this.fps / 60
    this.sprite.loop = this.loop
    this.sprite.play()
    if (options.blend !== undefined) {
      this.sprite.blendMode = blendMode(options.blend)
    }
    if (options.scale !== undefined) {
      this.sprite.scale.set(options.scale)
    }
    if (options.autoReplay === true) {
      this.sprite.onComplete = () => {
        this.sprite.gotoAndPlay(0)
      }
    }
  }

  /** Sets the play speed in absolute frames per second. */
  setFps(fps: number): void {
    this.fps = fps
    this.sprite.animationSpeed = fps / 60
  }

  get currentFps(): number {
    return this.fps
  }

  get isPaused(): boolean {
    return this.paused
  }

  /** Flips play/pause and returns the new paused state. */
  togglePaused(): boolean {
    this.paused = !this.paused
    return this.paused
  }

  setPaused(paused: boolean): void {
    if (this.paused !== paused) {
      this.togglePaused()
    }
  }

  /** Advances animation when playing; call from the section's app ticker. */
  update(ticker: Ticker): void {
    if (this.paused) {
      return
    }
    this.sprite.update(ticker)
  }

  destroy(): void {
    this.sprite.destroy()
  }
}
