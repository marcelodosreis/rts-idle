import type { Graphics } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { resourceFallbackGraphic } from '../../../packages/renderer/src/resources/resource-fallback.js'

const TREE_GREEN = 0x65a30d
const TREE_STUMP = 0x8a5728
const GOLD_MINE = 0xfacc15
const WHITE = 0xffffff

function fillColors(graphic: Graphics): readonly number[] {
  return graphic.context.instructions
    .filter((instruction) => instruction.action === 'fill')
    .map((instruction) => instruction.data.style.color)
}

function fillAlphas(graphic: Graphics): readonly number[] {
  return graphic.context.instructions
    .filter((instruction) => instruction.action === 'fill')
    .map((instruction) => instruction.data.style.alpha)
}

function strokeWidths(graphic: Graphics): readonly number[] {
  return graphic.context.instructions
    .filter((instruction) => instruction.action === 'stroke')
    .map((instruction) => instruction.data.style.width)
}

function strokeColors(graphic: Graphics): readonly number[] {
  return graphic.context.instructions
    .filter((instruction) => instruction.action === 'stroke')
    .map((instruction) => instruction.data.style.color)
}

describe('resource fallback graphics', () => {
  it('renders the tree as a green diamond and the gold mine as an amber diamond', () => {
    const tree = fillColors(resourceFallbackGraphic('TREE', false))
    expect(tree).toContain(TREE_GREEN)
    expect(tree).not.toContain(GOLD_MINE)

    const mine = fillColors(resourceFallbackGraphic('GOLD_MINE', false))
    expect(mine).toContain(GOLD_MINE)
    expect(mine).not.toContain(TREE_GREEN)
  })

  it('keeps depleted states distinguishable from active ones', () => {
    const treeStump = resourceFallbackGraphic('TREE', true)
    expect(fillColors(treeStump)).toContain(TREE_STUMP)
    expect(fillColors(treeStump)).not.toContain(TREE_GREEN)
    expect(fillAlphas(treeStump)).toContain(0.35)

    expect(fillAlphas(resourceFallbackGraphic('TREE', false))).toContain(0.9)
    expect(fillAlphas(resourceFallbackGraphic('GOLD_MINE', false))).toContain(0.9)
    expect(fillAlphas(resourceFallbackGraphic('GOLD_MINE', true))).toContain(0.35)
  })

  it('outlines both kinds against the terrain', () => {
    expect(strokeColors(resourceFallbackGraphic('TREE', false))).toContain(WHITE)
    expect(strokeColors(resourceFallbackGraphic('GOLD_MINE', false))).toContain(WHITE)
    expect(strokeWidths(resourceFallbackGraphic('TREE', false))).toContain(4)
    expect(strokeWidths(resourceFallbackGraphic('TREE', true))).toContain(2)
    expect(strokeWidths(resourceFallbackGraphic('GOLD_MINE', false))).toContain(4)
  })
})
