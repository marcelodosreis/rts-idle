import type { ResourceKind } from '@rts/shared'
import { Graphics, Rectangle, type Renderer, type Texture } from 'pixi.js'
import { progressFillColor } from '../effects/progress-palette.js'

const RESOURCE_SIZE = 56
const RESOURCE_FRAME = new Rectangle(0, 0, RESOURCE_SIZE, RESOURCE_SIZE)

const RESOURCE_OUTLINE_COLOR = 0xffffff

/** Tree fallback keeps the simple green diamond marker. */
const TREE_GREEN = 0x65a30d
const TREE_STUMP = 0x8a5728
const TREE_ACTIVE_ALPHA = 0.9
const TREE_DEPLETED_ALPHA = 0.35

/** Gold Mine fallback reuses the previous Mineral Node language: amber diamond. */
const GOLD_MINE_COLOR = progressFillColor('harvesting')
const GOLD_MINE_ACTIVE_ALPHA = 0.9
const GOLD_MINE_DEPLETED_ALPHA = 0.35

export interface ResourceFallbackVisual {
  readonly active: Texture
  readonly depleted: Texture
}

/** One active/depleted fallback pair per resource kind. */
export type ResourceFallbackTextures = Readonly<Record<ResourceKind, ResourceFallbackVisual>>

function diamondGraphic(points: number[], color: number, alpha: number, outlineWidth: number): Graphics {
  return new Graphics()
    .poly(points)
    .fill({ color, alpha })
    .stroke({ color: RESOURCE_OUTLINE_COLOR, width: outlineWidth, alpha })
}

/** Builds the no-asset fallback graphic for one resource kind and state. */
export function resourceFallbackGraphic(kind: ResourceKind, depleted: boolean): Graphics {
  if (kind === 'TREE') {
    return depleted
      ? diamondGraphic([28, 2, 54, 28, 28, 54, 2, 28], TREE_STUMP, TREE_DEPLETED_ALPHA, 2)
      : diamondGraphic([28, 2, 54, 28, 28, 54, 2, 28], TREE_GREEN, TREE_ACTIVE_ALPHA, 4)
  }
  const goldMinePoints = [28, 3, 49, 28, 28, 53, 7, 28]
  return depleted
    ? diamondGraphic(goldMinePoints, GOLD_MINE_COLOR, GOLD_MINE_DEPLETED_ALPHA, 3)
    : diamondGraphic(goldMinePoints, GOLD_MINE_COLOR, GOLD_MINE_ACTIVE_ALPHA, 4)
}

function generateTexture(renderer: Renderer, graphic: Graphics): Texture {
  const texture = renderer.generateTexture({ target: graphic, frame: RESOURCE_FRAME })
  graphic.destroy()
  return texture
}

function generateVisual(renderer: Renderer, kind: ResourceKind): ResourceFallbackVisual {
  return {
    active: generateTexture(renderer, resourceFallbackGraphic(kind, false)),
    depleted: generateTexture(renderer, resourceFallbackGraphic(kind, true))
  }
}

/** Generates shared no-asset visuals once per renderer mount. */
export function createResourceFallbackTextures(renderer: Renderer): ResourceFallbackTextures {
  return {
    TREE: generateVisual(renderer, 'TREE'),
    GOLD_MINE: generateVisual(renderer, 'GOLD_MINE')
  }
}
