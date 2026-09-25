import type { SectionContext } from '../shared/core/types.js'
import { TerrainEditorController } from './terrain-editor-controller.js'
import type { TerrainController } from './terrain-editor-data.js'

export * from './terrain-editor-data.js'

/**
 * Creates the imperative terrain playground controller. React drives it via a
 * stable handle; cell paint/hover never round-trips React. Terrain visuals
 * render through the shared `TerrainScene` so the editor looks exactly like the
 * game.
 */
export async function createTerrainController(
  host: HTMLElement,
  ctx: SectionContext,
  onReadout: (text: string) => void,
  onCursor: (cell: import('./terrain-geometry.js').Cell | null) => void,
  onChange: () => void
): Promise<TerrainController> {
  return TerrainEditorController.create(host, ctx, onReadout, onCursor, onChange)
}
