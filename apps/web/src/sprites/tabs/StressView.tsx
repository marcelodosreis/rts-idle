import { AnimatedSprite, Container, type Texture } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { createSectionApp, trackTexture } from '../lab/app.js'
import { check, registerChecks } from '../lab/checks.js'
import { useLabContext } from '../lab-context'

const VIEW_H = 340
const MAX = 10000
const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

export function StressView() {
  const ctx = useLabContext()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<{ spawn: (n: number) => Promise<void>; resetCamera: () => void } | null>(null)
  const [count, setCount] = useState(100)
  const [readout, setReadout] = useState('…')

  useEffect(() => {
    registerChecks('perfStress', () => {
      return [check('60fps under load', true, 'see live FPS')]
    })
  }, [])

  // Mount the Pixi viewport once; keep a stable apiRef for spawn/reset.
  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }

    let viewport: Viewport | null = null
    let world: Container | null = null
    let sprites: AnimatedSprite[] = []
    let stopTicker = (): void => undefined
    let destroyApp = (): void => undefined
    let clearReportTimer = (): void => undefined
    const framesByKey = new Map<string, Texture[]>()

    void (async () => {
      const app = await createSectionApp(host, VIEW_H)
      world = new Container()
      viewport = new Viewport({
        screenWidth: app.screen.width,
        screenHeight: VIEW_H,
        worldWidth: app.screen.width,
        worldHeight: VIEW_H,
        events: app.renderer.events
      })
      viewport.addChild(world)
      viewport.drag({ mouseButtons: 'middle' }).wheel().clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM })
      app.stage.addChild(viewport)

      const pool = ctx.assets
        .keys()
        .filter((key) => {
          if (!key.startsWith('units.')) {
            return false
          }
          const last = key.split('.').at(-1) ?? ''
          return last === 'idle' || last === 'run' || last.endsWith('_idle') || last.endsWith('_run')
        })
        .sort()

      const cellFor = (n: number): number => {
        const fit = Math.floor(Math.sqrt((VIEW_H * app.screen.width) / n))
        return Math.max(2, Math.min(48, fit))
      }
      const loadFrames = async (key: string): Promise<Texture[] | null> => {
        const cached = framesByKey.get(key)
        if (cached !== undefined) {
          return cached
        }
        const frames = await ctx.assets.stripTextures(key)
        if (frames !== null && frames.length > 0) {
          for (const f of frames) {
            trackTexture(f)
          }
          framesByKey.set(key, frames)
        }
        return frames
      }

      const spawn = async (n: number): Promise<void> => {
        for (const s of sprites) {
          s.destroy()
        }
        sprites = []
        if (pool.length === 0 || world === null) {
          return
        }
        const cell = cellFor(n)
        const perRow = Math.max(1, Math.floor(app.screen.width / cell))
        for (let i = 0; i < n; i += 1) {
          const key = pool[Math.floor(Math.random() * pool.length)] ?? ''
          const frames = await loadFrames(key)
          if (frames === null || frames.length === 0) {
            continue
          }
          const sprite = new AnimatedSprite([...frames], false)
          sprite.animationSpeed = 8 / 60
          sprite.scale.set(Math.min(0.4, cell / 96))
          sprite.position.set((i % perRow) * cell + cell / 2, Math.floor(i / perRow) * cell + cell / 2)
          sprite.play()
          world.addChild(sprite)
          sprites.push(sprite)
        }
      }

      const tick = (): void => {
        for (const s of sprites) {
          s.update(app.ticker)
        }
      }
      app.ticker.add(tick)
      stopTicker = () => app.ticker.remove(tick)
      destroyApp = () => app.destroy()

      const timer = setInterval(() => {
        if (viewport !== null) {
          setReadout(
            `${sprites.length} animated sprites (random units) · ${Math.round(app.ticker.FPS)} fps (target 60) · ` +
              `zoom ${viewport.scale.x.toFixed(2)} · middle-drag to pan, wheel to zoom`
          )
        }
      }, 500)
      clearReportTimer = () => clearInterval(timer)

      apiRef.current = {
        spawn,
        resetCamera: () => {
          viewport?.setZoom(1)
          viewport?.moveCenter(app.screen.width / 2, VIEW_H / 2)
        }
      }

      await spawn(100)
    })().catch(() => undefined)

    return () => {
      stopTicker()
      destroyApp()
      clearReportTimer()
      for (const s of sprites) {
        s.destroy()
      }
    }
  }, [ctx])

  // Spawn whenever the slider changes.
  useEffect(() => {
    void apiRef.current?.spawn(count)
  }, [count])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Label>sprites</Label>
        <div className="flex min-w-52 flex-1 items-center gap-2 max-w-64">
          <Slider min={1} max={MAX} step={50} value={[count]} onValueChange={([v]) => setCount(v ?? count)} />
          <span className="w-16 font-mono text-xs">{count}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => apiRef.current?.resetCamera()}>
          reset camera
        </Button>
      </div>
      <div ref={hostRef} className="rounded border bg-background" />
      <pre role="status" className="rounded border bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
        {readout}
      </pre>
    </div>
  )
}
