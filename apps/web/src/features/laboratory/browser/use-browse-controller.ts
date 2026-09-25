import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react'
import type { BuildKind } from './canvas.js'
import type { BrowseState } from './use-browse.js'
import type { SpriteCanvasHandle } from './use-sprite-canvas.js'

export interface BrowseControllerOptions {
  readonly onSelectReady: (select: (key: string) => void) => void
  readonly requestedBrowse: string | null
  readonly onBrowseHandled: () => void
  readonly canvasRef: RefObject<SpriteCanvasHandle | null>
  readonly canvasReady: boolean
}

export interface BrowseController {
  readonly kind: BuildKind
  readonly slices: number
  readonly summary: string
  readonly position: string
  readonly hasSelection: boolean
  readonly crumbParts: readonly string[]
  readonly crumbKeys: readonly string[]
  readonly select: (key: string) => void
  readonly step: (delta: number) => void
  readonly setSummary: (text: string) => void
}

function crumbPrefixes(parts: readonly string[]): readonly string[] {
  let prefix = ''
  return parts.map((part) => {
    prefix = prefix === '' ? part : `${prefix}.${part}`
    return prefix
  })
}

/** Renders the selected asset into the canvas and records the render result. */
function useCanvasRender(
  browse: BrowseState,
  canvasRef: RefObject<SpriteCanvasHandle | null>,
  canvasReady: boolean
): { readonly kind: BuildKind; readonly slices: number } {
  const [kind, setKind] = useState<BuildKind>('static')
  const [slices, setSlices] = useState(0)
  const { selection, options, setSummary } = browse

  useEffect(() => {
    const canvas = canvasRef.current
    if (selection.key === '' || !canvasReady || canvas === null) {
      return
    }
    void canvas.render(selection.key, options).then((result) => {
      setKind(result.kind)
      setSlices(result.slices)
      setSummary(result.summary)
    })
  }, [selection.key, options, canvasReady, canvasRef, setSummary])

  return { kind, slices }
}

/** Selection/step callbacks plus the requested-browse and keyboard effects. */
function useAssetNavigation(
  browse: BrowseState,
  options: BrowseControllerOptions
): { readonly select: (key: string) => void; readonly step: (delta: number) => void } {
  const { onSelectReady, requestedBrowse, onBrowseHandled } = options
  const { filteredKeys, patchSelection, selection } = browse

  const select = useCallback(
    (key: string): void => {
      if (key !== '') {
        patchSelection({ key })
      }
    },
    [patchSelection]
  )

  useEffect(() => {
    if (filteredKeys.length > 0) {
      onSelectReady(select)
    }
  }, [filteredKeys.length, onSelectReady, select])

  useEffect(() => {
    if (requestedBrowse !== null) {
      select(requestedBrowse)
      onBrowseHandled()
    }
  }, [onBrowseHandled, requestedBrowse, select])

  const step = useCallback(
    (delta: number): void => {
      if (filteredKeys.length === 0) {
        return
      }
      const index = filteredKeys.indexOf(selection.key)
      const next = index === -1 ? 0 : (index + delta + filteredKeys.length) % filteredKeys.length
      select(filteredKeys[next] ?? '')
    },
    [filteredKeys, selection.key, select]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        step(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  return { select, step }
}

function useBrowseDerivations(browse: BrowseState): {
  readonly crumbParts: readonly string[]
  readonly crumbKeys: readonly string[]
  readonly position: string
} {
  const crumbParts = useMemo(() => browse.selection.key.split('.'), [browse.selection.key])
  const crumbKeys = useMemo(() => crumbPrefixes(crumbParts), [crumbParts])
  const position = useMemo(() => {
    const index = browse.filteredKeys.indexOf(browse.selection.key)
    return browse.filteredKeys.length === 0 ? '0/0' : `${index + 1}/${browse.filteredKeys.length}`
  }, [browse.filteredKeys, browse.selection.key])
  return { crumbParts, crumbKeys, position }
}

/** Owns the browse tab's derived state and side effects; the view stays presentational. */
export function useBrowseController(browse: BrowseState, options: BrowseControllerOptions): BrowseController {
  const { kind, slices } = useCanvasRender(browse, options.canvasRef, options.canvasReady)
  const { select, step } = useAssetNavigation(browse, options)
  const { crumbParts, crumbKeys, position } = useBrowseDerivations(browse)
  return {
    kind,
    slices,
    summary: browse.summary,
    position,
    hasSelection: browse.selection.key !== '',
    crumbParts,
    crumbKeys,
    select,
    step,
    setSummary: browse.setSummary
  }
}
