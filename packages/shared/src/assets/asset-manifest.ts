/**
 * Asset manifest types — the JSON contract between the asset build tool
 * (`tools/assets`) and the renderer (ADR-015, master plan §23.2).
 *
 * The manifest is generated output (`pnpm assets:prepare`): it describes every
 * curated PNG by its semantic key, target file, and frame geometry. Consumers
 * (the renderer) read it from the assets URL. Art and generated manifests stay
 * out of git until the pack license is validated (golden rule, ADR-015).
 */

export const ASSET_KINDS = ['strip', 'static', 'tileset'] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export function isAssetKind(value: unknown): value is AssetKind {
  return typeof value === 'string' && (ASSET_KINDS as readonly string[]).includes(value)
}

declare const assetKeyBrand: unique symbol

/** Branded semantic asset key, e.g. `units.blue.pawn.pawn_idle`. */
export type AssetKey = string & { readonly [assetKeyBrand]: true }

export function isAssetKey(value: string): value is AssetKey {
  return value.length > 0
}

export function toAssetKey(value: string): AssetKey | null {
  return isAssetKey(value) ? value : null
}

export interface AssetEntry {
  /** Semantic key, e.g. `units.blue.pawn.pawn_idle`. */
  readonly key: AssetKey
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
