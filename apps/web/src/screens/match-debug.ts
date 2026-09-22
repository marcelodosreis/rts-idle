import type { MatchConfig, SnapshotMessage } from '@rts/protocol'
import type { GameRenderer } from '@rts/renderer'
import type { SelectionUnitState } from '../interaction/selection-projection'

export interface RtsDebug {
  getPositions(): Record<string, { readonly x: number; readonly y: number }>
  getUnitOwners(): Record<string, number>
  getConstructionStates(): Record<string, { readonly x: number; readonly y: number; readonly status: string }>
  getAnimationFrame(id: number): number | null
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  getSpriteState(id: number): ReturnType<GameRenderer['getUnitSpriteState']>
  getSelection(): readonly number[]
  getSelectionBoxState(): ReturnType<GameRenderer['getSelectionBoxState']>
  setSelection(ids: readonly number[]): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  getTick(): number
  getMapInfo(): {
    readonly width: number
    readonly height: number
    readonly decorations: number
    readonly isPlaytest: boolean
  }
}

declare global {
  interface Window {
    __rtsDebug?: RtsDebug
  }
}

export interface MatchDebugOptions {
  readonly renderer: GameRenderer
  readonly config: MatchConfig
  readonly isPlaytest: boolean
  readonly unitStates: ReadonlyMap<number, SelectionUnitState>
  readonly buildings: () => SnapshotMessage['buildings']
  readonly setSelection: (ids: readonly number[]) => void
  readonly getTick: () => number
  readonly fixedToRenderPixels: (value: number) => number
}

export function createRtsDebug(options: MatchDebugOptions): RtsDebug {
  const { renderer, config, isPlaytest, unitStates, buildings, setSelection, getTick, fixedToRenderPixels } = options
  return {
    getPositions: () => Object.fromEntries([...renderer.getUnitPositions()].map(([id, pos]) => [String(id), pos])),
    getUnitOwners: () => Object.fromEntries([...unitStates].map(([id, state]) => [String(id), state.owner])),
    getConstructionStates: () =>
      Object.fromEntries(
        buildings().map((building) => [String(building.id), { x: building.x, y: building.y, status: building.status }])
      ),
    getAnimationFrame: (id) => renderer.getUnitAnimationFrame(id),
    getUnitHealth: (id) => renderer.getUnitHealth(id),
    getSpriteState: (id) => renderer.getUnitSpriteState(id),
    getSelection: () => renderer.getSelection(),
    getSelectionBoxState: () => renderer.getSelectionBoxState(),
    setSelection,
    worldToScreen: (x, y) => renderer.worldToScreen(fixedToRenderPixels(x), fixedToRenderPixels(y)),
    getZoom: () => renderer.getZoom(),
    getPing: () => renderer.getPing(),
    moveCamera: (x, y) => renderer.moveCamera(fixedToRenderPixels(x), fixedToRenderPixels(y)),
    getTick,
    getMapInfo: () => ({
      width: config.map.width,
      height: config.map.height,
      decorations: config.map.decorations?.length ?? 0,
      isPlaytest
    })
  }
}
