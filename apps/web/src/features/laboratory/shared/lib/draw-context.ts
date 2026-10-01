import { Graphics } from 'pixi.js'

/** Render-tile size in px (master plan §14, capabilities.md §6: 1 tile = 64 px). */
export const TILE_PX = 64
/** Unit sprite scale used by the game (unit-layer SPRITE_SCALE). */
export const SPRITE_SCALE = 0.5

/** Draws a checkerboard background (transparency inspection). */
export function checkerboard(width: number, height = width, cell = 16): Graphics {
  const g = new Graphics()
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if ((x + y) % 2 === 0) {
        g.rect(x * cell, y * cell, cell, cell).fill(0xffffff)
      }
    }
  }
  return g
}

/** Draws a tile grid overlay. */
export function drawTileGrid(g: Graphics, cols: number, rows: number, tile = TILE_PX): void {
  for (let x = 0; x <= cols; x += 1) {
    g.moveTo(x * tile, 0)
      .lineTo(x * tile, rows * tile)
      .stroke({ width: 1, color: 0x2a2418, alpha: 0.35 })
  }
  for (let y = 0; y <= rows; y += 1) {
    g.moveTo(0, y * tile)
      .lineTo(cols * tile, y * tile)
      .stroke({ width: 1, color: 0x2a2418, alpha: 0.35 })
  }
}

/**
 * Divisory grid overlay: visible dividing lines over the whole canvas so the
 * display is read "on top of" a reference grid (like the game tile grid).
 */
export function drawGridLines(g: Graphics, width: number, height: number, tile = TILE_PX): void {
  for (let x = tile; x < width; x += tile) {
    g.moveTo(x, 0).lineTo(x, height).stroke({ width: 1, color: 0x2a2418, alpha: 0.5 })
  }
  for (let y = tile; y < height; y += tile) {
    g.moveTo(0, y).lineTo(width, y).stroke({ width: 1, color: 0x2a2418, alpha: 0.5 })
  }
}

/** Draws an anchor marker (crosshair + ring) at the sprite anchor point. */
export function drawAnchor(g: Graphics, x: number, y: number, color = 0xc62828): void {
  g.moveTo(x - 8, y)
    .lineTo(x + 8, y)
    .stroke({ width: 2, color })
  g.moveTo(x, y - 8)
    .lineTo(x, y + 8)
    .stroke({ width: 2, color })
  g.circle(x, y, 3).fill(color)
}

/** Draws a tile-footprint outline (e.g. 1-tile unit, 2-tile building). */
export function drawFootprint(
  g: Graphics,
  footprint: { readonly x: number; readonly y: number; readonly tilesW: number; readonly tilesH: number },
  tile = TILE_PX
): void {
  const width = footprint.tilesW * tile
  const height = footprint.tilesH * tile
  g.rect(footprint.x - width / 2, footprint.y - height, width, height).stroke({
    width: 2,
    color: 0x1565c0,
    alpha: 0.8
  })
}

/** Draws a box of `w×h` centered at `(cx, cy)` with an anchor marker. */
export function drawCenteredCell(g: Graphics, cx: number, cy: number, w: number, h: number): void {
  drawFootprint(g, { x: cx, y: cy + h / 2, tilesW: w / TILE_PX, tilesH: h / TILE_PX })
  drawAnchor(g, cx, cy)
}
