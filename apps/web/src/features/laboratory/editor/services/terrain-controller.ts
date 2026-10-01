import type { SectionContext } from '../../shared/types/section-context'
import type { TerrainController } from '../types/terrain-editor-data'
import { TerrainEditorController } from './terrain-editor-controller'

export * from '../types/terrain-editor-data'

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
  onCursor: (cell: import('../lib/terrain-geometry').Cell | null) => void,
  onChange: () => void
): Promise<TerrainController> {
  return TerrainEditorController.create(host, ctx, onReadout, onCursor, onChange)
}
