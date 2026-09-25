import { type AssetIssue, type AssetLibrary, validateAsset } from '@rts/renderer'
import type { AssetEntry } from '@rts/shared'
import { frameRgba } from '../shared/core/pixels.js'

export interface ReportRow {
  readonly key: string
  readonly entry: AssetEntry
  readonly issues: readonly AssetIssue[]
}

export type ReportFilter = 0 | 1 | 2

export function statusOf(row: ReportRow): number {
  if (row.issues.some((issue) => issue.severity === 'error')) {
    return 2
  }
  return row.issues.length > 0 ? 1 : 0
}

export function statusText(row: ReportRow): string {
  const status = statusOf(row)
  if (status === 0) {
    return 'PASS'
  }
  if (status === 1) {
    return `WARN (${row.issues.map((issue) => issue.code).join(',')})`
  }
  return `FAIL (${row.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => issue.code)
    .join(',')})`
}

export function statusClass(row: ReportRow): string {
  const status = statusOf(row)
  if (status === 0) {
    return 'text-green-700'
  }
  return status === 1 ? 'text-amber-700' : 'text-red-700'
}

export function summarizeRows(rows: readonly ReportRow[], filter: ReportFilter): string {
  const count = (status: number): number => rows.filter((row) => statusOf(row) === status).length
  const shown = rows.filter((row) => statusOf(row) >= filter).length
  return `${rows.length} assets · pass ${count(0)} · warn ${count(1)} · fail ${count(2)} · showing ${shown}`
}

interface FrameSample {
  readonly index: number
  readonly rgba: Uint8ClampedArray
}

async function frameSamples(entry: AssetEntry, image: CanvasImageSource): Promise<readonly FrameSample[]> {
  const cell = { w: entry.cellW, h: entry.cellH }
  if (entry.kind === 'tileset' && entry.columns !== undefined && entry.rows !== undefined) {
    const samples: FrameSample[] = []
    for (let row = 0; row < entry.rows; row += 1) {
      for (let column = 0; column < entry.columns; column += 1) {
        samples.push({
          index: row * entry.columns + column,
          rgba: await frameRgba(image, { x: column * cell.w, y: row * cell.h, ...cell })
        })
      }
    }
    return samples
  }
  if (entry.kind === 'strip') {
    const samples: FrameSample[] = []
    for (let index = 0; index < entry.frames; index += 1) {
      samples.push({ index, rgba: await frameRgba(image, { x: index * cell.w, y: 0, ...cell }) })
    }
    return samples
  }
  return [{ index: 0, rgba: await frameRgba(image, { x: 0, y: 0, ...cell }) }]
}

/** Loads and deep-validates one manifest entry, returning its issues. */
export async function validateAssetKey(
  assets: AssetLibrary,
  key: string,
  entry: AssetEntry
): Promise<readonly AssetIssue[]> {
  try {
    const texture = await assets.texture(key)
    if (texture === null) {
      return [{ severity: 'error', code: 'load-failed', message: 'texture failed to load' }]
    }
    const image = texture.source.resource as CanvasImageSource
    const geometry = { width: texture.width, height: texture.height }
    return validateAsset(entry, { geometry, frames: await frameSamples(entry, image) })
  } catch (error) {
    return [{ severity: 'error', code: 'exception', message: error instanceof Error ? error.message : String(error) }]
  }
}
