import type { Page } from '@playwright/test'

/**
 * Whether the asset manifest is served. Art is CI-safe optional (ADR-015):
 * assets are generated from a license-gated vendor pack that is not checked
 * in, so e2e tests that require art skip when it is unavailable.
 */
export async function hasArt(page: Page): Promise<boolean> {
  return page
    .evaluate(() =>
      fetch('/assets/manifest.json')
        .then((r) => r.ok)
        .catch(() => false)
    )
    .catch(() => false)
}
