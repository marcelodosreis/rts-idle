import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Slider } from '@/shared/ui/slider'
import { check, registerChecks } from '../../shared/services/checks'
import { useLabContext } from '../../shared/services/lab-context'
import { StressScene } from '../services/stress-scene'

const MAX = 10000

export interface StressController {
  readonly pause: () => void
  readonly resume: () => void
}

export function StressView({
  onControllerReady
}: {
  readonly onControllerReady?: (controller: StressController | null) => void
} = {}) {
  const ctx = useLabContext()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<StressScene | null>(null)
  const [count, setCount] = useState(100)
  const [readout, setReadout] = useState('…')

  useEffect(() => {
    registerChecks('perfStress', () => [check('60fps under load', true, 'see live FPS')])
  }, [])

  useStressScene(hostRef, sceneRef, ctx, onControllerReady)
  useSpawnOnCount(sceneRef, count)
  useReadoutLoop(sceneRef, setReadout)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Label>sprites</Label>
        <div className="flex min-w-52 max-w-64 flex-1 items-center gap-2">
          <Slider min={1} max={MAX} step={50} value={[count]} onValueChange={([value]) => setCount(value ?? count)} />
          <span className="w-16 font-mono text-xs">{count}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => sceneRef.current?.resetCamera()}>
          reset camera
        </Button>
      </div>
      <div
        ref={hostRef}
        data-testid="stress-canvas-host"
        className="h-[340px] min-w-0 overflow-hidden rounded border bg-background"
      />
      <pre role="status" className="whitespace-pre-wrap rounded border bg-muted p-3 font-mono text-xs">
        {readout}
      </pre>
    </div>
  )
}

function useStressScene(
  hostRef: React.RefObject<HTMLDivElement | null>,
  sceneRef: React.RefObject<StressScene | null>,
  ctx: ReturnType<typeof useLabContext>,
  onControllerReady: ((controller: StressController | null) => void) | undefined
): void {
  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }
    let disposed = false
    void StressScene.create(host, ctx).then((scene) => {
      if (disposed) {
        scene.dispose()
        return
      }
      sceneRef.current = scene
      onControllerReady?.({ pause: () => scene.pause(), resume: () => scene.resume() })
      void scene.spawn(100)
    })
    return () => {
      disposed = true
      sceneRef.current?.dispose()
      sceneRef.current = null
      onControllerReady?.(null)
    }
  }, [ctx, hostRef, sceneRef, onControllerReady])
}

function useSpawnOnCount(sceneRef: React.RefObject<StressScene | null>, count: number): void {
  useEffect(() => {
    void sceneRef.current?.spawn(count)
  }, [count, sceneRef])
}

function useReadoutLoop(sceneRef: React.RefObject<StressScene | null>, setReadout: (value: string) => void): void {
  useEffect(() => {
    const timer = setInterval(() => {
      const scene = sceneRef.current
      if (scene !== null) {
        setReadout(scene.readout())
      }
    }, 500)
    return () => clearInterval(timer)
  }, [sceneRef, setReadout])
}
