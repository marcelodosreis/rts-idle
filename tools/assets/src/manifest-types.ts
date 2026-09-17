/**
 * Asset manifest types shared by the build tool and consumers.
 *
 * The manifest is generated output (`pnpm assets:prepare`): it describes every
 * curated PNG by its semantic key, target file, and frame geometry. Consumers
 * (the renderer) read it from the assets URL. Art and generated manifests stay
 * out of git until the pack license is validated (golden rule, ADR-015).
 */

export type AssetKind = 'strip' | 'static' | 'tileset'

export interface AssetEntry {
  /** Semantic key, e.g. `units.blue.pawn.idle`. */
  readonly key: string
  /** Path relative to the assets root, e.g. `units/blue/pawn/idle.png`. */
  readonly file: string
  readonly kind: AssetKind
  readonly cellW: number
  readonly cellH: number
  /** Number of frames (`1` for `static`; strip = width / cellW). */
  readonly frames: number
  /** For `tileset`: tiles per row/column. */
  readonly columns?: number
  readonly rows?: number
  /** Wall-clock frame duration in ms (strip only). */
  readonly duration?: number
  /** Normalized anchor (0..1), e.g. feet for units `{0.5, 1}`. */
  readonly anchorX: number
  readonly anchorY: number
  /** Flip the sprite horizontally when moving in the negative x direction. */
  readonly flipOnMoveX?: boolean
}

export interface AssetManifest {
  readonly version: 1
  readonly assets: Readonly<Record<string, AssetEntry>>
}
