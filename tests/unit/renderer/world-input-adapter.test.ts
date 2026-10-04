import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorldInteraction } from '../../../packages/renderer/src/input/input-types.js'
import { createWorldHitTester } from '../../../packages/renderer/src/input/world-hit-tester.js'
import {
  type InputCanvas,
  type InputViewport,
  WorldInputAdapter
} from '../../../packages/renderer/src/input/world-input-adapter.js'

interface PointerLike {
  readonly button: number
  readonly pointerId: number
  readonly clientX: number
  readonly clientY: number
  readonly ctrlKey: boolean
  readonly metaKey: boolean
}

type InputListener = (...args: readonly never[]) => void

class FakeCanvas implements InputCanvas {
  private readonly listeners = new Map<string, InputListener[]>()
  private capturedPointerId: number | null = null

  addEventListener(type: string, listener: InputListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  removeEventListener(type: string, listener: InputListener): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener)
    )
  }

  getBoundingClientRect(): { readonly left: number; readonly top: number } {
    return { left: 0, top: 0 }
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointerId = pointerId
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.capturedPointerId === pointerId
  }

  releasePointerCapture(pointerId: number): void {
    if (this.capturedPointerId === pointerId) {
      this.capturedPointerId = null
    }
  }

  emit(type: string, event: PointerLike): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as never)
    }
  }
}

function pointer(pointerId: number, clientX: number, clientY: number): PointerLike {
  return { button: 0, pointerId, clientX, clientY, ctrlKey: false, metaKey: false }
}

function setup(zoom: number) {
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
  const canvas = new FakeCanvas()
  const interactions: WorldInteraction[] = []
  const viewport: InputViewport = { toWorld: (x, y) => ({ x: x / zoom, y: y / zoom }) }
  const adapter = new WorldInputAdapter({
    canvas,
    viewport,
    hitTester: createWorldHitTester({ resourceAt: () => null, unitAt: () => null, buildingAt: () => null }),
    onInteraction: (interaction) => interactions.push(interaction),
    dragThresholdPx: 6
  })
  return { adapter, canvas, interactions }
}

function types(interactions: readonly WorldInteraction[]): string[] {
  return interactions.map((interaction) => interaction.type)
}

describe('world input adapter drag threshold', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts a selection only after the screen-space threshold at every zoom', () => {
    for (const zoom of [0.1, 1, 10]) {
      const { adapter, canvas, interactions } = setup(zoom)
      canvas.emit('pointerdown', pointer(1, 100, 100))
      canvas.emit('pointermove', pointer(1, 105, 100))
      expect(types(interactions)).not.toContain('selection-start')

      canvas.emit('pointermove', pointer(1, 108, 100))
      expect(types(interactions)).toContain('selection-start')

      canvas.emit('pointerup', pointer(1, 108, 100))
      expect(types(interactions)).toContain('selection-end')
      expect(types(interactions)).not.toContain('primary-activate')

      adapter.dispose()
    }
  })

  it('treats a click below the threshold as a primary activation', () => {
    const { adapter, canvas, interactions } = setup(10)
    canvas.emit('pointerdown', pointer(2, 50, 50))
    canvas.emit('pointerup', pointer(2, 52, 52))

    expect(types(interactions)).toContain('primary-activate')
    expect(types(interactions)).not.toContain('selection-end')
    adapter.dispose()
  })

  it('ignores stale pointer events from a released pointer', () => {
    const { adapter, canvas, interactions } = setup(1)
    canvas.emit('pointerdown', pointer(3, 10, 10))
    canvas.emit('pointerup', pointer(3, 10, 10))
    canvas.emit('pointermove', pointer(3, 40, 40))

    expect(types(interactions)).toEqual(['primary-activate', 'pointer-move'])
    adapter.dispose()
  })
})
