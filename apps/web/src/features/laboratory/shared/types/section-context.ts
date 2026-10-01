import type { AssetLibrary } from '@rts/renderer'

/** Shared context passed to every section of the sprite lab. */
export interface SectionContext {
  readonly assets: AssetLibrary
  /** Whether the asset manifest loaded; `false` switches sections to placeholders. */
  readonly art: boolean
}
