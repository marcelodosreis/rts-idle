import type { AssetEntry } from '@rts/shared'

/**
 * Pure asset validation shared by the sprite lab and (later) the asset CI.
 * Everything here is data-in/data-out — no Pixi, no DOM — so it runs in Node
 * unit tests with synthetic RGBA buffers and in the browser with canvas-decoded
 * frames. Warnings are advisory (art may intentionally bleed, e.g. foam);
 * errors break the manifest contract.
 */

export type AssetSeverity = 'error' | 'warning'

export interface AssetIssue {
  readonly severity: AssetSeverity
  readonly code: string
  readonly message: string
  readonly frame?: number
}

/** Whole-texture pixel dimensions as decoded by the caller. */
export interface AssetGeometry {
  readonly width: number
  readonly height: number
}

/** Decoded RGBA pixels of one sliced frame (cellW×cellH). */
export interface FramePixels {
  readonly index: number
  readonly rgba: Uint8ClampedArray
}

export interface ValidateOptions {
  readonly geometry: AssetGeometry
  /** Decoded frames (strip/tileset). Statics pass the single full frame. */
  readonly frames?: readonly FramePixels[]
}

function isMultiple(value: number, divisor: number): boolean {
  return value % divisor === 0
}

/** Geometry contract: strip = height-wide cells, frames = width/height. */
function checkGeometry(entry: AssetEntry, geometry: AssetGeometry, issues: AssetIssue[]): void {
  const { width, height } = geometry
  if (entry.kind === 'strip') {
    if (!isMultiple(width, height)) {
      issues.push({
        severity: 'error',
        code: 'strip-cell-mismatch',
        message: `strip width ${width} not divisible by cell height ${height}`
      })
    }
    const derivedFrames = Math.floor(width / height)
    if (derivedFrames !== entry.frames) {
      issues.push({
        severity: 'error',
        code: 'strip-frame-count',
        message: `strip has ${derivedFrames} frames but manifest declares ${entry.frames}`
      })
    }
    if (entry.cellW !== height || entry.cellH !== height) {
      issues.push({
        severity: 'error',
        code: 'strip-cell-size',
        message: `strip cell ${entry.cellW}×${entry.cellH} does not match height ${height}`
      })
    }
    return
  }
  if (entry.kind === 'tileset') {
    if (!isMultiple(width, entry.cellW) || !isMultiple(height, entry.cellH)) {
      issues.push({
        severity: 'error',
        code: 'tileset-cell-division',
        message: `tileset ${width}×${height} not divisible by cell ${entry.cellW}×${entry.cellH}`
      })
    }
    const cols = Math.floor(width / entry.cellW)
    const rows = Math.floor(height / entry.cellH)
    if (entry.columns !== undefined && entry.columns !== cols) {
      issues.push({
        severity: 'error',
        code: 'tileset-columns',
        message: `tileset has ${cols} columns but manifest declares ${entry.columns}`
      })
    }
    if (entry.rows !== undefined && entry.rows !== rows) {
      issues.push({
        severity: 'error',
        code: 'tileset-rows',
        message: `tileset has ${rows} rows but manifest declares ${entry.rows}`
      })
    }
    return
  }
  if (entry.cellW !== width || entry.cellH !== height) {
    issues.push({
      severity: 'error',
      code: 'static-size-mismatch',
      message: `static ${entry.cellW}×${entry.cellH} does not match texture ${width}×${height}`
    })
  }
}

function frameBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
  readonly opaque: number
} {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let opaque = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rgba[(y * width + x) * 4 + 3] ?? 0
      if (alpha <= 8) {
        continue
      }
      opaque += 1
      if (x < minX) {
        minX = x
      }
      if (x > maxX) {
        maxX = x
      }
      if (y < minY) {
        minY = y
      }
      if (y > maxY) {
        maxY = y
      }
    }
  }
  return { minX, minY, maxX, maxY, opaque }
}

function checkFramePixels(entry: AssetEntry, frames: readonly FramePixels[], issues: AssetIssue[]): void {
  const cellW = entry.cellW
  const cellH = entry.cellH
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i]!
    const expected = cellW * cellH * 4
    if (frame.rgba.length !== expected) {
      issues.push({
        severity: 'error',
        code: 'frame-size',
        frame: frame.index,
        message: `frame ${frame.index} is ${frame.rgba.length / 4}px but cell is ${cellW}×${cellH}`
      })
      continue
    }
    const bounds = frameBounds(frame.rgba, cellW, cellH)
    if (bounds.opaque === 0) {
      issues.push({
        severity: 'error',
        code: 'blank-frame',
        frame: frame.index,
        message: `frame ${frame.index} is fully transparent`
      })
      continue
    }
    if (bounds.maxX >= cellW - 1 || bounds.maxY >= cellH - 1) {
      issues.push({
        severity: 'warning',
        code: 'edge-touching',
        frame: frame.index,
        message: `frame ${frame.index} content touches the cell edge (bleeds into the neighbor)`
      })
    }
    if (bounds.opaque < cellW * cellH * 0.04) {
      issues.push({
        severity: 'warning',
        code: 'tiny-content',
        frame: frame.index,
        message: `frame ${frame.index} is mostly empty (${bounds.opaque}px)`
      })
    }
    if (i > 0) {
      const prev = frames[i - 1]!
      if (prev.rgba.length === frame.rgba.length && bytesEqual(prev.rgba, frame.rgba)) {
        issues.push({
          severity: 'warning',
          code: 'duplicate-frame',
          frame: frame.index,
          message: `frame ${frame.index} is identical to frame ${prev.index}`
        })
      }
    }
  }
}

function bytesEqual(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function checkAnchor(entry: AssetEntry, issues: AssetIssue[]): void {
  if (entry.anchorX < 0 || entry.anchorX > 1 || entry.anchorY < 0 || entry.anchorY > 1) {
    issues.push({
      severity: 'error',
      code: 'anchor-range',
      message: `anchor (${entry.anchorX}, ${entry.anchorY}) outside 0..1`
    })
  }
}

function checkCellScale(entry: AssetEntry, issues: AssetIssue[]): void {
  if (entry.kind === 'static' && (!isMultiple(entry.cellW, 64) || !isMultiple(entry.cellH, 64))) {
    issues.push({
      severity: 'warning',
      code: 'non-64-cell',
      message: `static cell ${entry.cellW}×${entry.cellH} is not a multiple of 64`
    })
  }
}

/**
 * Unit keys must match the game contract `units.{faction}.{kind}.{anim}`. The
 * `anim` segment may repeat the kind prefix (e.g. `pawn_idle`, `archer_run`)
 * or stand alone (`lancer.idle`, `arrow`), so only the shape is enforced here.
 */
export function checkKeyContract(key: string): AssetIssue[] {
  const issues: AssetIssue[] = []
  if (!key.startsWith('units.')) {
    return issues
  }
  const segments = key.split('.')
  if (segments.length !== 4) {
    issues.push({
      severity: 'warning',
      code: 'key-contract',
      message: `key ${key} does not match units.{faction}.{kind}.{anim}`
    })
  }
  return issues
}

/** Runs every check for an asset and returns the collected issues. */
export function validateAsset(entry: AssetEntry, options: ValidateOptions): readonly AssetIssue[] {
  const issues: AssetIssue[] = []
  checkGeometry(entry, options.geometry, issues)
  if (options.frames !== undefined) {
    checkFramePixels(entry, options.frames, issues)
  }
  checkAnchor(entry, issues)
  checkCellScale(entry, issues)
  return issues
}
