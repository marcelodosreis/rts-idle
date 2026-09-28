import {
  BUILDING_GEOMETRY,
  type BuildingType,
  type BuildingVisualSize,
  FIXED_SCALE,
  fixedToRenderPixels
} from '@rts/shared'
import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import type { RenderBuilding, RenderBuildPreview, RenderMineralNode } from '../core/types.js'
import {
  BAR_BACKGROUND,
  BAR_BORDER,
  BAR_HEIGHT,
  BAR_RADIUS,
  clampRatio,
  drawProgressBar,
  hpColor
} from '../effects/progress-bar.js'
import { progressFillColor } from '../effects/progress-palette.js'
import { buildingVisualStyle } from './building-visual-style.js'

const MINERAL_RADIUS = 30
const MINERAL_COLOR = progressFillColor('mining')
const MINERAL_OUTLINE_COLOR = 0xffffff
const BUILDING_FACTIONS = ['blue', 'red', 'purple', 'yellow'] as const
const BUILDING_ASSET_NAMES = {
  BASE: 'castle',
  BARRACKS: 'barracks',
  SUPPLY_DEPOT: 'house1'
} as const

const pixelsPerTile = fixedToRenderPixels(FIXED_SCALE)

interface RenderBuildingSize {
  readonly width: number
  readonly height: number
}

function renderVisualSize(size: BuildingVisualSize): RenderBuildingSize {
  return { width: fixedToRenderPixels(size.width), height: fixedToRenderPixels(size.height) }
}

/** Minimal static presentation and hit testing for economy world objects. */
export class WorldObjectLayer {
  private readonly worldObjectsLayer: Container
  private readonly interactionLayer: Container
  private readonly buildings = new Map<number, Container>()
  private readonly buildingArt = new Map<number, Sprite | Graphics>()
  private readonly buildingOverlays = new Map<number, Graphics>()
  private readonly buildingTextures = new Map<string, Texture>()
  private readonly constructionHitboxes = new Map<
    number,
    { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  >()
  private readonly mineralNodes = new Map<number, Graphics>()
  private readonly mineralNodePositions = new Map<number, { readonly x: number; readonly y: number }>()
  private readonly activeMineralNodes = new Set<number>()
  private preview: RenderBuildPreview | null = null
  private previewGraphic: Graphics | null = null

  constructor(
    worldObjectsLayer: Container,
    interactionLayer: Container,
    private readonly assets: AssetLibrary | null = null
  ) {
    this.worldObjectsLayer = worldObjectsLayer
    this.interactionLayer = interactionLayer
  }

  async loadAssets(): Promise<void> {
    if (this.assets === null) {
      return
    }
    const keys = BUILDING_FACTIONS.flatMap((faction) =>
      Object.values(BUILDING_ASSET_NAMES).map((name) => `buildings.${faction}.${name}`)
    )
    const loaded = await Promise.all(
      keys.map(async (key) => ({ key, texture: await this.assets!.croppedTexture(key) }))
    )
    for (const entry of loaded) {
      if (entry.texture !== null) {
        this.buildingTextures.set(entry.key, entry.texture)
      }
    }
  }

  present(buildings: readonly RenderBuilding[], mineralNodes: readonly RenderMineralNode[]): void {
    this.presentBuildings(buildings)
    this.presentMineralNodes(mineralNodes)
    this.renderPreview()
  }

  private presentBuildings(buildings: readonly RenderBuilding[]): void {
    const seenBuildings = new Set<number>()
    this.constructionHitboxes.clear()
    for (const building of buildings) {
      seenBuildings.add(building.id)
      this.drawBuilding(building)
    }
    this.removeMissing(this.buildings, seenBuildings)
  }

  private drawBuilding(building: RenderBuilding): void {
    const graphic = this.getBuildingContainer(building)
    const style = buildingVisualStyle(building.buildingType, building.status, building.owner)
    const visualSize = this.buildingVisualSize(building)
    const artSize = this.buildingArtSize(building)
    const art = this.buildingArt.get(building.id)
    if (art instanceof Graphics) {
      this.drawFallbackBuilding(art, style, visualSize, artSize)
    } else if (art !== undefined) {
      art.alpha = style.kind === 'foundation' ? 0.4 : 1
    }
    const overlay = this.buildingOverlays.get(building.id)!
    this.drawBuildingOverlay(overlay, building, style.kind === 'foundation', visualSize)
    graphic.position.set(fixedToRenderPixels(building.x), fixedToRenderPixels(building.y))
    this.constructionHitboxes.set(building.id, {
      x: fixedToRenderPixels(building.x),
      y: fixedToRenderPixels(building.y),
      width: visualSize.width,
      height: visualSize.height
    })
  }

  private getBuildingContainer(building: RenderBuilding): Container {
    const existing = this.buildings.get(building.id)
    if (existing !== undefined) {
      return existing
    }
    const container = new Container()
    container.eventMode = 'none'
    const texture = this.buildingTextures.get(this.buildingAssetKey(building))
    const visualSize = this.buildingVisualSize(building)
    const artSize = this.buildingArtSize(building)
    const art = texture === undefined ? new Graphics() : this.createBuildingSprite(texture, visualSize, artSize)
    const overlay = new Graphics()
    container.addChild(art, overlay)
    this.worldObjectsLayer.addChild(container)
    this.buildings.set(building.id, container)
    this.buildingArt.set(building.id, art)
    this.buildingOverlays.set(building.id, overlay)
    return container
  }

  private createBuildingSprite(texture: Texture, visualSize: RenderBuildingSize, artSize: RenderBuildingSize): Sprite {
    const sprite = new Sprite(texture)
    sprite.width = artSize.width
    sprite.height = artSize.height
    sprite.anchor.set(0.5, 0.5)
    sprite.position.set(visualSize.width / 2, visualSize.height / 2)
    return sprite
  }

  private buildingVisualSize(building: RenderBuilding): RenderBuildingSize {
    return renderVisualSize(BUILDING_GEOMETRY[building.buildingType].visualSize)
  }

  private buildingArtSize(building: RenderBuilding): RenderBuildingSize {
    return renderVisualSize(BUILDING_GEOMETRY[building.buildingType].artSize)
  }

  private buildingAssetKey(building: RenderBuilding): string {
    const faction = BUILDING_FACTIONS[building.owner % BUILDING_FACTIONS.length] ?? BUILDING_FACTIONS[0]
    return this.buildingAssetKeyForType(faction, building.buildingType)
  }

  private buildingAssetKeyForType(faction: (typeof BUILDING_FACTIONS)[number], buildingType: BuildingType): string {
    return `buildings.${faction}.${BUILDING_ASSET_NAMES[buildingType]}`
  }

  private drawFallbackBuilding(
    graphic: Graphics,
    style: ReturnType<typeof buildingVisualStyle>,
    size: RenderBuildingSize,
    artSize: RenderBuildingSize
  ): void {
    if (style.kind === 'base') {
      this.drawBase(graphic, size, artSize, style)
      return
    }
    graphic
      .clear()
      .rect((size.width - artSize.width) / 2, (size.height - artSize.height) / 2, artSize.width, artSize.height)
      .fill({ color: style.fillColor, alpha: style.fillAlpha })
      .stroke({ color: style.strokeColor, width: 4 })
  }

  private drawBuildingOverlay(
    graphic: Graphics,
    building: RenderBuilding,
    isFoundation: boolean,
    size: { readonly width: number; readonly height: number }
  ): void {
    const width = size.width
    const height = size.height
    graphic
      .clear()
      .rect(0, 0, width, height)
      .stroke({ color: progressFillColor('construction'), width: 4 })
    if (building.hp !== undefined && building.maxHp !== undefined) {
      const healthRatio = clampRatio(building.hp, building.maxHp)
      drawProgressBar(graphic, {
        x: 0,
        y: -20,
        width,
        height: BAR_HEIGHT,
        ratio: healthRatio,
        fillColor: hpColor(healthRatio),
        background: BAR_BACKGROUND,
        border: BAR_BORDER,
        radius: BAR_RADIUS
      })
    }
    if (isFoundation) {
      drawProgressBar(graphic, {
        x: 0,
        y: -10,
        width,
        height: BAR_HEIGHT,
        ratio: clampRatio(building.progressTicks, building.totalTicks),
        fillColor: progressFillColor('construction'),
        background: BAR_BACKGROUND,
        border: BAR_BORDER,
        radius: BAR_RADIUS
      })
    } else if (building.production?.queue[0] !== undefined) {
      const item = building.production.queue[0]
      drawProgressBar(graphic, {
        x: 0,
        y: -10,
        width,
        height: BAR_HEIGHT,
        ratio: clampRatio(item.progressTicks, item.totalTicks),
        fillColor: progressFillColor('training'),
        background: BAR_BACKGROUND,
        border: BAR_BORDER,
        radius: BAR_RADIUS
      })
    }
  }

  private presentMineralNodes(mineralNodes: readonly RenderMineralNode[]): void {
    const seenNodes = new Set<number>()
    this.mineralNodePositions.clear()
    for (const node of mineralNodes) {
      seenNodes.add(node.id)
      this.drawMineralNode(node)
    }
    this.removeMissing(this.mineralNodes, seenNodes)
  }

  private drawMineralNode(node: RenderMineralNode): void {
    let graphic = this.mineralNodes.get(node.id)
    if (graphic === undefined) {
      graphic = new Graphics()
      graphic.poly([0, -34, 28, 0, 0, 34, -28, 0]).fill({ color: MINERAL_COLOR, alpha: 0.9 })
      graphic.poly([0, -34, 28, 0, 0, 34, -28, 0]).stroke({ color: MINERAL_OUTLINE_COLOR, width: 4 })
      graphic.eventMode = 'none'
      this.worldObjectsLayer.addChild(graphic)
      this.mineralNodes.set(node.id, graphic)
    }
    const x = fixedToRenderPixels(node.x)
    const y = fixedToRenderPixels(node.y)
    graphic.position.set(x, y)
    graphic.alpha = node.remaining === 0 ? 0.35 : 1
    graphic.scale.set(this.activeMineralNodes.has(node.id) ? 1.2 : 1)
    if (node.remaining > 0) {
      this.mineralNodePositions.set(node.id, { x, y })
    }
  }

  private drawBase(
    graphic: Graphics,
    size: RenderBuildingSize,
    artSize: RenderBuildingSize,
    style: ReturnType<typeof buildingVisualStyle>
  ): void {
    const x = (size.width - artSize.width) / 2
    const y = (size.height - artSize.height) / 2
    graphic.clear()
    graphic.rect(x, y, artSize.width, artSize.height)
    graphic.fill({ color: style.fillColor, alpha: style.fillAlpha })
    graphic.stroke({ color: style.strokeColor, width: 4 })
  }

  setBuildPreview(preview: RenderBuildPreview | null): void {
    this.preview = preview
    this.renderPreview()
  }

  private renderPreview(): void {
    if (this.preview === null) {
      if (this.previewGraphic !== null) {
        this.interactionLayer.removeChild(this.previewGraphic)
        this.previewGraphic.destroy()
        this.previewGraphic = null
      }
      return
    }
    if (this.previewGraphic === null) {
      this.previewGraphic = new Graphics()
      this.previewGraphic.eventMode = 'none'
      this.interactionLayer.addChild(this.previewGraphic)
    }
    const graphic = this.previewGraphic
    const fallbackSize =
      this.preview.buildingType === undefined
        ? null
        : renderVisualSize(BUILDING_GEOMETRY[this.preview.buildingType].visualSize)
    const width = fallbackSize?.width ?? this.preview.width * pixelsPerTile
    const height = fallbackSize?.height ?? this.preview.height * pixelsPerTile
    graphic.clear()
    graphic.rect(0, 0, width, height)
    graphic.fill({ color: this.preview.valid ? 0x22c55e : 0xef4444, alpha: 0.28 })
    graphic.stroke({ color: this.preview.valid ? 0x86efac : 0xfca5a5, width: 4 })
    graphic.position.set(fixedToRenderPixels(this.preview.x), fixedToRenderPixels(this.preview.y))
  }

  setActiveMineralNodes(ids: ReadonlySet<number>): void {
    this.activeMineralNodes.clear()
    for (const id of ids) {
      this.activeMineralNodes.add(id)
    }
    for (const [id, graphic] of this.mineralNodes) {
      graphic.scale.set(this.activeMineralNodes.has(id) ? 1.2 : 1)
    }
  }

  mineralNodeAt(x: number, y: number): number | null {
    const threshold = MINERAL_RADIUS * MINERAL_RADIUS
    for (const [id, position] of this.mineralNodePositions) {
      const dx = position.x - x
      const dy = position.y - y
      if (dx * dx + dy * dy <= threshold) {
        return id
      }
    }
    return null
  }

  buildingAt(x: number, y: number): number | null {
    let topmost: number | null = null
    for (const [id, hitbox] of this.constructionHitboxes) {
      if (x >= hitbox.x && x < hitbox.x + hitbox.width && y >= hitbox.y && y < hitbox.y + hitbox.height) {
        topmost = id
      }
    }
    return topmost
  }

  private removeMissing(graphics: Map<number, Container | Graphics>, seen: ReadonlySet<number>): void {
    for (const [id, graphic] of graphics) {
      if (seen.has(id)) {
        continue
      }
      this.worldObjectsLayer.removeChild(graphic)
      graphic.destroy()
      graphics.delete(id)
      if (graphics === this.buildings) {
        this.buildingArt.delete(id)
        this.buildingOverlays.delete(id)
      }
    }
  }
}
