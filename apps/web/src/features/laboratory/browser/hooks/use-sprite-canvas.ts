import { useEffect, useRef, useState } from 'react'
import type { SectionContext } from '../../shared/types/section-context'
import { type CanvasResult, createCanvas, type RenderOptions } from '../services/canvas'

export interface SpriteCanvasHandle {
  render: (key: string, options: RenderOptions) => Promise<CanvasResult>
  selectSlice: (index: number) => void
}

/**
 * Mounts the imperative Pixi canvas into a host and exposes its handle.
 * React owns the state (key + options); this hook only bridges commands down
 * and events (summary/slice) up. Returns a stable handle ref plus a `ready`
 * flag that flips once the async canvas creation resolves, so callers can
 * re-run render effects when the canvas becomes available.
 */
export function useSpriteCanvas(
  hostRef: React.RefObject<HTMLDivElement | null>,
  ctx: SectionContext,
  onSummary: (summary: string) => void,
  onSlice: (index: number) => void
): { readonly ref: React.RefObject<SpriteCanvasHandle | null>; readonly ready: boolean } {
  const handleRef = useRef<SpriteCanvasHandle | null>(null)
  const [ready, setReady] = useState(false)
  const summaryRef = useRef(onSummary)
  const sliceRef = useRef(onSlice)
  summaryRef.current = onSummary
  sliceRef.current = onSlice

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }
    let handle: {
      render: (k: string, o: RenderOptions) => Promise<CanvasResult>
      selectSlice: (i: number) => void
      destroy: () => void
    } | null = null
    let disposed = false
    void createCanvas(
      host,
      ctx,
      (s) => summaryRef.current(s),
      (i) => sliceRef.current(i)
    ).then((canvas) => {
      if (disposed) {
        canvas.destroy()
        return
      }
      handle = canvas
      handleRef.current = canvas
      setReady(true)
    })
    return () => {
      disposed = true
      handle?.destroy()
      handleRef.current = null
      setReady(false)
    }
  }, [hostRef, ctx])

  return { ref: handleRef, ready }
}
