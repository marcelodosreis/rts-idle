import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AssetEntry, AssetManifest } from '@rts/shared'
import { CURATED } from './curated.js'
import { deriveFrameGeometry } from './derive-frame-geometry.js'

export interface PrepareOptions {
  /** Vendor pack root (`tmp/tiny_swords`). */
  readonly sourceRoot: string
  /** Curated asset root (`apps/web/public/assets`). */
  readonly targetRoot: string
}

/**
 * Prepares the curated asset tree: copies each curated source from the vendor
 * pack into the assets root and writes `manifest.json` describing every asset.
 * The vendor pack is never mutated and uncurated files are never copied.
 */
export function prepareAssets(options: PrepareOptions): AssetManifest {
  const { sourceRoot, targetRoot } = options
  const assets: Record<string, AssetEntry> = {}

  for (const entry of CURATED) {
    const source = join(sourceRoot, entry.source)
    const target = join(targetRoot, entry.file)
    const geometry = deriveFrameGeometry({
      file: source,
      kind: entry.kind,
      ...(entry.cell !== undefined ? { cell: entry.cell } : {})
    })

    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)

    const asset: AssetEntry = {
      key: entry.key,
      file: entry.file,
      kind: entry.kind,
      cellW: geometry.cellW,
      cellH: geometry.cellH,
      frames: geometry.frames,
      anchorX: entry.anchorX,
      anchorY: entry.anchorY,
      ...(geometry.columns !== undefined ? { columns: geometry.columns } : {}),
      ...(geometry.rows !== undefined ? { rows: geometry.rows } : {}),
      ...(entry.duration !== undefined ? { duration: entry.duration } : {}),
      ...(entry.flipOnMoveX === true ? { flipOnMoveX: true } : {})
    }

    assets[entry.key] = asset
  }

  const manifest: AssetManifest = { version: 1, assets }
  writeFileSync(join(targetRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}
