import type { AssetManifest } from '@rts/shared'

/**
 * Fetches and validates the asset manifest from the assets base URL. Returns
 * `null` (caller falls back to placeholders) on any network or parse failure.
 */
export async function loadManifest(baseUrl: string): Promise<AssetManifest | null> {
  try {
    const response = await fetch(`${baseUrl}/manifest.json`)
    if (!response.ok) {
      return null
    }
    const manifest: unknown = await response.json()
    if (!isAssetManifest(manifest)) {
      return null
    }
    return manifest
  } catch {
    return null
  }
}

function isAssetManifest(value: unknown): value is AssetManifest {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const assets = (value as { assets?: unknown }).assets
  if (typeof assets !== 'object' || assets === null) {
    return false
  }
  return (value as { version?: unknown }).version === 1
}
