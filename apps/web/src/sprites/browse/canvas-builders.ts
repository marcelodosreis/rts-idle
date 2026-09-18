import { Container, Graphics, Sprite } from 'pixi.js'
import { trackTexture } from '../lab/app.js'
import { drawAnchor, drawCenteredCell, drawTileGrid } from '../lab/context.js'
import { croppedFrames, nativeScale } from '../lab/crop.js'
import { type BlendChoice, StripPlayer } from '../lab/player.js'
import type { SectionContext } from '../sections/types.js'
import type { BuildKind, RenderOptions } from './canvas.js'

export interface Active {
  readonly player: StripPlayer | null
  destroy(): void
}

export interface BuildContext {
  readonly app: {
    readonly screen: { readonly width: number; readonly height: number }
    readonly ticker: import('pixi.js').Ticker
  }
  readonly ctx: SectionContext
  readonly content: Container
  setSliceTextures(textures: readonly import('pixi.js').Texture[], active: number): void
}

/** Simple ticker driver so animations advance without per-sprite callbacks. */
export function drive(players: readonly StripPlayer[], ticker: import('pixi.js').Ticker): () => void {
  const cb = (t: import('pixi.js').Ticker): void => {
    for (const player of players) {
      player.update(t)
    }
  }
  ticker.add(cb)
  return () => ticker.remove(cb)
}

/** Strips a given kind's overlay, returning the ground-less active. */
export async function buildUnit(c: BuildContext, key: string, options: RenderOptions): Promise<Active> {
  const { ctx, content, app } = c
  const cropped = await croppedFrames(ctx.assets, key)
  if (cropped === null) {
    return { player: null, destroy: () => undefined }
  }
  c.setSliceTextures(cropped.textures, options.variant)
  const scale = nativeScale(cropped.bounds.w, cropped.bounds.h, app.screen.width - 80)
  const spriteH = cropped.bounds.h * scale
  const cx = app.screen.width / 2
  const cy = app.screen.height / 2 - 24
  const baseY = cy + spriteH / 2
  const ground = new Graphics()
  ground
    .moveTo(cx - 64, baseY)
    .lineTo(cx + 64, baseY)
    .stroke({ width: 2, color: 0x2a2418, alpha: 0.35 })
  content.addChild(ground)
  if (options.shadow) {
    const shadow = await ctx.assets.staticSprite('terrain.shadow')
    if (shadow !== null) {
      const decal = new Sprite(shadow.texture)
      decal.anchor.set(0.5, 0.5)
      decal.position.set(cx, baseY + 6)
      content.addChild(decal)
    }
  }
  const player = new StripPlayer({ frames: cropped.textures, scale, fps: options.fps })
  player.sprite.anchor.set(0.5, 0.5)
  player.sprite.position.set(cx, cy)
  if (options.flip) {
    player.sprite.scale.x = -Math.abs(player.sprite.scale.x)
  }
  if (options.paused) {
    player.setPaused(true)
  }
  content.addChild(player.sprite)
  if (options.overlay) {
    const overlay = new Graphics()
    drawCenteredCell(overlay, cx, cy, cropped.bounds.w * scale, cropped.bounds.h * scale)
    content.addChild(overlay)
  }
  const stop = drive([player], app.ticker)
  return {
    player,
    destroy: () => {
      stop()
      player.destroy()
    }
  }
}

export async function buildStrip(
  c: BuildContext,
  key: string,
  options: RenderOptions,
  kind: BuildKind
): Promise<Active> {
  const { ctx, content, app } = c
  const cropped = await croppedFrames(ctx.assets, key)
  if (cropped === null) {
    return { player: null, destroy: () => undefined }
  }
  c.setSliceTextures(cropped.textures, options.variant)
  const loop = !key.startsWith('fx.explosion_')
  const isFire = key.startsWith('fx.fire_')
  const scale = nativeScale(cropped.bounds.w, cropped.bounds.h, app.screen.width - 80)
  const player = new StripPlayer({
    frames: cropped.textures,
    scale,
    fps: options.fps,
    ...(kind === 'fx' ? { loop, blend: (isFire ? 'add' : options.blend) as BlendChoice, autoReplay: !loop } : {})
  })
  player.sprite.anchor.set(0.5, 0.5)
  player.sprite.position.set(app.screen.width / 2, app.screen.height / 2 - 24)
  if (options.paused) {
    player.setPaused(true)
  }
  content.addChild(player.sprite)
  if (options.overlay) {
    const overlay = new Graphics()
    drawCenteredCell(
      overlay,
      app.screen.width / 2,
      app.screen.height / 2 - 24,
      cropped.bounds.w * scale,
      cropped.bounds.h * scale
    )
    content.addChild(overlay)
  }
  const stop = drive([player], app.ticker)
  return {
    player,
    destroy: () => {
      stop()
      player.destroy()
    }
  }
}

export async function buildTileset(c: BuildContext, key: string, options: RenderOptions): Promise<Active> {
  const { ctx, content, app } = c
  const tiles = await ctx.assets.tileTextures(key)
  const count = tiles?.length ?? 0
  if (count === 0) {
    return { player: null, destroy: () => undefined }
  }
  const active = Math.min(options.variant, count - 1)
  c.setSliceTextures(tiles ?? [], active)
  const texture = tiles?.[active]
  if (texture === undefined) {
    return { player: null, destroy: () => undefined }
  }
  trackTexture(texture)
  const scale = Math.min(1, 240 / texture.width, 240 / texture.height)
  const cx = app.screen.width / 2
  const baseY = app.screen.height / 2
  const grid = new Graphics()
  drawTileGrid(grid, 2, 2, 64)
  grid.position.set(cx - 64, baseY - 64)
  content.addChild(grid)
  const sprite = new Sprite(texture)
  sprite.scale.set(scale)
  sprite.anchor.set(0.5, 1)
  sprite.position.set(cx, baseY)
  content.addChild(sprite)
  if (options.overlay) {
    const overlay = new Graphics()
    drawAnchor(overlay, cx, baseY, 0x1565c0)
    content.addChild(overlay)
  }
  return { player: null, destroy: () => undefined }
}

export async function buildGrid(c: BuildContext, key: string): Promise<Active> {
  const { ctx, content, app } = c
  const tiles = await ctx.assets.tileTextures(key)
  c.setSliceTextures(tiles ?? [], 0)
  const DISPLAY = 64
  const GRID_GAP = 2
  const root = new Container()
  const cols = Math.max(1, Math.ceil(Math.sqrt(tiles?.length ?? 1)))
  for (let index = 0; index < (tiles?.length ?? 0); index += 1) {
    const frame = tiles?.[index]
    if (frame === undefined) {
      continue
    }
    trackTexture(frame)
    const sprite = new Sprite(frame)
    sprite.width = DISPLAY
    sprite.height = DISPLAY
    sprite.position.set((index % cols) * (DISPLAY + GRID_GAP), Math.floor(index / cols) * (DISPLAY + GRID_GAP))
    root.addChild(sprite)
  }
  const w = cols * (DISPLAY + GRID_GAP)
  const h = Math.ceil((tiles?.length ?? 0) / cols) * (DISPLAY + GRID_GAP)
  root.position.set((app.screen.width - w) / 2, (app.screen.height - h) / 2)
  content.addChild(root)
  return { player: null, destroy: () => undefined }
}

export async function buildStatic(c: BuildContext, key: string, options: RenderOptions): Promise<Active> {
  const { ctx, content, app } = c
  const cropped = await croppedFrames(ctx.assets, key)
  if (cropped === null) {
    return { player: null, destroy: () => undefined }
  }
  c.setSliceTextures(cropped.textures.slice(0, 1), 0)
  const frame = cropped.textures[0]
  if (frame === undefined) {
    return { player: null, destroy: () => undefined }
  }
  trackTexture(frame)
  const scale = nativeScale(cropped.bounds.w, cropped.bounds.h, app.screen.width - 80)
  const sprite = new Sprite(frame)
  sprite.anchor.set(0.5, 0.5)
  sprite.scale.set(scale)
  sprite.position.set(app.screen.width / 2, app.screen.height / 2 - 24)
  content.addChild(sprite)
  if (options.overlay) {
    const overlay = new Graphics()
    drawCenteredCell(
      overlay,
      app.screen.width / 2,
      app.screen.height / 2 - 24,
      cropped.bounds.w * scale,
      cropped.bounds.h * scale
    )
    content.addChild(overlay)
  }
  return { player: null, destroy: () => undefined }
}

/**
 * Slice grid in the normal display format: every frame/tile rendered at 1:1
 * native size (cropped to visible pixels), centered in its own cell on a
 * checkerboard — the same look as the main canvas, one per slice.
 */
export async function buildSlicesGrid(
  c: BuildContext,
  textures: readonly import('pixi.js').Texture[],
  active: number,
  onSelect: (index: number) => void
): Promise<Active> {
  const { content, app } = c
  if (textures.length === 0) {
    return { player: null, destroy: () => undefined }
  }
  const maxW = Math.max(...textures.map((t) => t.width))
  const maxH = Math.max(...textures.map((t) => t.height))
  const GAP = 8
  const cols = Math.max(1, Math.min(textures.length, Math.floor((app.screen.width - 48) / (maxW + GAP))))
  const rows = Math.ceil(textures.length / cols)
  const gridScale = Math.min(
    1,
    (app.screen.width - (cols - 1) * GAP - 24) / (cols * maxW),
    (app.screen.height - (rows - 1) * GAP - 40) / (rows * maxH)
  )
  const cellW = maxW * gridScale
  const cellH = maxH * gridScale
  const width = cols * cellW + (cols - 1) * GAP
  const height = rows * cellH + (rows - 1) * GAP
  const originX = (app.screen.width - width) / 2
  const originY = (app.screen.height - height) / 2

  const bg = new Graphics()
  bg.rect(originX - 8, originY - 8, width + 16, height + 16).fill(0xf4efe4)
  content.addChild(bg)

  for (let index = 0; index < textures.length; index += 1) {
    const texture = textures[index]
    if (texture === undefined) {
      continue
    }
    trackTexture(texture)
    const col = index % cols
    const row = Math.floor(index / cols)
    const cx = originX + col * (cellW + GAP) + cellW / 2
    const cy = originY + row * (cellH + GAP) + cellH / 2
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(gridScale)
    sprite.position.set(cx, cy)
    sprite.eventMode = 'static'
    sprite.cursor = 'pointer'
    sprite.on('pointertap', () => onSelect(index))
    content.addChild(sprite)
    if (index === active) {
      const hl = new Graphics()
      hl.rect(cx - cellW / 2 - 2, cy - cellH / 2 - 2, cellW + 4, cellH + 4).stroke({
        width: 2,
        color: 0x1565c0
      })
      content.addChild(hl)
    }
  }
  return { player: null, destroy: () => undefined }
}
