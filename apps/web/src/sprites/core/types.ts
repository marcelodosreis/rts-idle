import type { AssetLibrary } from '@rts/renderer'

/** Shared context passed to every section of the sprite lab. */
export interface SectionContext {
  readonly assets: AssetLibrary
  /** Whether the asset manifest loaded; `false` switches sections to placeholders. */
  readonly art: boolean
}

/** Key/value readouts a section reports to the page debug hook (e2e asserts). */
export interface SectionStats {
  readonly [key: string]: string | number | boolean
}
