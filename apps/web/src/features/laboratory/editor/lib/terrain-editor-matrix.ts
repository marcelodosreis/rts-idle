import { type AutoTileTerrain, autotileTile, cliffBase, type TerrainScene } from '@rts/renderer'
import { Container, Graphics, Sprite } from 'pixi.js'
import { CORNER_COLOR, GRASS_COLOR, type MatrixMode, parseGrid, TILE, WATER_COLOR } from '../types/terrain-editor-data'

type Scene = Pick<TerrainScene, 'tileTexture'>

function clearContainer(container: Container): void {
  const children = [...container.children]
  container.removeChildren(0, container.children.length)
  for (const child of children) {
    child.destroy()
  }
}

function tileSprite(scene: Scene, index: number): Container {
  const texture = scene.tileTexture(index)
  const sprite = new Container()
  if (texture !== null) {
    const frame = new Sprite(texture)
    frame.width = TILE
    frame.height = TILE
    sprite.addChild(frame)
    return sprite
  }
  sprite.addChild(new Graphics().rect(0, 0, TILE, TILE).fill(GRASS_COLOR))
  return sprite
}

function cellColor(cell: AutoTileTerrain | 'corner' | undefined): number {
  if (cell === 'water') {
    return WATER_COLOR
  }
  if (cell === 'land' || cell === 'elevated') {
    return GRASS_COLOR
  }
  return CORNER_COLOR
}

function maskNeighbor(bit: string): AutoTileTerrain {
  return bit === '1' ? 'land' : 'water'
}

function renderMaskPanel(
  container: Container,
  scene: Scene,
  mask: number,
  matrixKind: MatrixMode,
  onReadout: (text: string) => void
): void {
  const bits = mask.toString(2).padStart(4, '0')
  const center: AutoTileTerrain = matrixKind === 'elevated' ? 'elevated' : 'land'
  const panelX = (mask % 4) * (3 * TILE + 16) + 8
  const panelY = Math.floor(mask / 4) * (3 * TILE + 16) + 8
  const cells: (AutoTileTerrain | 'corner')[] = [
    'corner',
    maskNeighbor(bits.charAt(0)),
    'corner',
    maskNeighbor(bits.charAt(3)),
    center,
    maskNeighbor(bits.charAt(1)),
    'corner',
    maskNeighbor(bits.charAt(2)),
    'corner'
  ]
  for (let index = 0; index < cells.length; index += 1) {
    const cx = panelX + (index % 3) * TILE
    const cy = panelY + Math.floor(index / 3) * TILE
    container.addChild(new Graphics().rect(cx, cy, TILE, TILE).fill(cellColor(cells[index])))
  }
  const panelGrid: AutoTileTerrain[][] = [
    [center, maskNeighbor(bits.charAt(0)), center],
    [maskNeighbor(bits.charAt(3)), center, maskNeighbor(bits.charAt(1))],
    [center, maskNeighbor(bits.charAt(2)), center]
  ]
  const result = autotileTile(panelGrid, 1, 1)
  const centerTile = tileSprite(scene, result.atlasIndex ?? 0)
  centerTile.position.set(panelX + TILE, panelY + TILE)
  centerTile.eventMode = 'static'
  centerTile.on('pointerover', () => {
    onReadout(`mask ${bits}  piece ${result.semanticId}  atlas #${result.atlasIndex}`)
  })
  container.addChild(centerTile)
}

function renderCliffBackground(
  container: Container,
  panelGrid: AutoTileTerrain[][],
  panelX: number,
  panelY: number
): void {
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      container.addChild(
        new Graphics().rect(panelX + x * TILE, panelY + y * TILE, TILE, TILE).fill(cellColor(panelGrid[y]?.[x]))
      )
    }
  }
}

function renderCliffPieces(
  container: Container,
  scene: Scene,
  panelGrid: AutoTileTerrain[][],
  panelX: number,
  panelY: number
): void {
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      const cell = panelGrid[y]?.[x]
      if (cell === undefined || cell === 'water') {
        continue
      }
      const piece = autotileTile(panelGrid, x, y)
      if (piece.atlasIndex !== null) {
        const sprite = tileSprite(scene, piece.atlasIndex)
        sprite.position.set(panelX + x * TILE, panelY + y * TILE)
        container.addChild(sprite)
      }
      const base = cliffBase(panelGrid, x, y)
      if (base !== null) {
        const baseSprite = tileSprite(scene, base)
        baseSprite.position.set(panelX + x * TILE, panelY + y * TILE + TILE)
        container.addChild(baseSprite)
      }
    }
  }
}

function renderCliffMatrix(container: Container, scene: Scene): void {
  const cases: readonly (readonly string[])[] = [
    ['ellle', 'ellle', 'eeeee'],
    ['ellle', 'ellle', 'eeee', 'ellle'],
    ['ellle', 'ellle', 'ewwwe'],
    ['ellle', 'ellle', 'eeee', 'ellle']
  ]
  for (let index = 0; index < cases.length; index += 1) {
    const panelGrid = parseGrid(cases[index]!)
    const panelX = (index % 2) * (5 * TILE + 24) + 8
    const panelY = Math.floor(index / 2) * (4 * TILE + 16) + 8
    renderCliffBackground(container, panelGrid, panelX, panelY)
    renderCliffPieces(container, scene, panelGrid, panelX, panelY)
  }
}

/** Renders the autotile/cliff reference matrix into the editor overlay. */
export function renderMatrixInto(
  container: Container,
  scene: Scene,
  matrixKind: MatrixMode,
  onReadout: (text: string) => void
): void {
  clearContainer(container)
  if (matrixKind === 'cliff') {
    renderCliffMatrix(container, scene)
    return
  }
  for (let mask = 0; mask < 16; mask += 1) {
    renderMaskPanel(container, scene, mask, matrixKind, onReadout)
  }
}
