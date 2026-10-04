import type { Page } from '@playwright/test'

const IMPORT_FAILURE_PREFIXES = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module'
] as const

const DEV_MODULE_MARKERS = ['/src/', '/node_modules/.vite/', '/@vite/']

export interface AbortedModuleImports {
  readonly isKnownAbort: (message: string) => boolean
}

export interface ModuleEvidence {
  readonly attempted: Set<string>
  readonly failed: Set<string>
}

/**
 * Tracks Vite dev-server module scripts and the explicit failures among them.
 * An import error is treated as the navigation-abort harness artifact only
 * when the URL was actually requested and never produced an explicit failure
 * (4xx/5xx response or a non-abort network error). A missing chunk, a broken
 * lazy import path, or an offline fetch therefore still fails the test.
 */
export function watchAbortedModuleImports(page: Page): AbortedModuleImports {
  const evidence: ModuleEvidence = { attempted: new Set(), failed: new Set() }
  page.on('request', (request) => {
    if (isDevModuleRequest(request.url(), request.resourceType())) {
      evidence.attempted.add(request.url())
    }
  })
  page.on('response', (response) => {
    if (isDevModuleRequest(response.url(), response.request().resourceType()) && response.status() >= 400) {
      evidence.failed.add(response.url())
    }
  })
  page.on('requestfailed', (request) => {
    const isAbort = request.failure()?.errorText.toUpperCase().includes('ABORTED') === true
    if (isDevModuleRequest(request.url(), request.resourceType()) && !isAbort) {
      evidence.failed.add(request.url())
    }
  })
  return { isKnownAbort: (message) => isAbortedModuleImportError(message, evidence) }
}

function isDevModuleRequest(url: string, resourceType: string): boolean {
  return resourceType === 'script' && DEV_MODULE_MARKERS.some((marker) => url.includes(marker))
}

/** Strict predicate for the aborted Vite module-import harness artifact. */
export function isAbortedModuleImportError(message: string, evidence: ModuleEvidence): boolean {
  const normalized = message.toLowerCase()
  if (!IMPORT_FAILURE_PREFIXES.some((prefix) => normalized.includes(prefix))) {
    return false
  }
  const urls = message.match(/https?:\/\/[^\s)'"]+/g) ?? []
  return urls.length > 0 && urls.every((url) => evidence.attempted.has(url) && !evidence.failed.has(url))
}
