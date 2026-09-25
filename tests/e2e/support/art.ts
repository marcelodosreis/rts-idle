import type { Page } from '@playwright/test'

/**
 * Whether the asset manifest is served. Art is CI-safe optional (ADR-015):
 * assets are generated from a license-gated vendor pack that is not checked
 * in, so e2e tests that require art skip when it is unavailable.
 */
export async function hasArt(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      return fetch('/assets/manifest.json')
        .then(async (response) => {
          if (!response.ok) {
            return false
          }

          const manifest: unknown = await response.json()
          if (
            typeof manifest !== 'object' ||
            manifest === null ||
            typeof (manifest as { assets?: unknown }).assets !== 'object' ||
            (manifest as { assets: object }).assets === null ||
            Object.keys((manifest as { assets: object }).assets).length === 0
          ) {
            return false
          }

          const debug = window.__rtsDebug
          if (debug === undefined) {
            return true
          }

          const unitIds = Object.keys(debug.getUnitOwners())
          return unitIds.length > 0 && unitIds.some((id) => debug.getSpriteState(Number(id))?.anim !== 'fallback')
        })
        .catch(() => false)
    })
    .catch(() => false)
}
