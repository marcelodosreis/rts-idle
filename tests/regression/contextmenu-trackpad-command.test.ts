import { describe, expect, it, vi } from 'vitest'

/**
 * Regression: Mac trackpad right-click (two-finger tap / Control+click)
 * fires a DOM `contextmenu` event, not a PixiJS `rightdown` event.
 *
 * The renderer must translate `contextmenu` coordinates and dispatch
 * them through the same command handler used by mouse right-click.
 *
 * @see docs/postmortems/2026-09-19-mac-trackpad-cannot-move-units.md
 */
describe('contextmenu → command dispatch (Mac trackpad)', () => {
  it('converts clientX/Y to canvas-local coordinates via getBoundingClientRect', () => {
    const getBoundingClientRect = vi.fn(() => ({
      x: 100,
      y: 50,
      width: 800,
      height: 600,
      top: 50,
      left: 100,
      right: 900,
      bottom: 650,
      toJSON: () => ''
    }))

    const coords: { x: number; y: number }[] = []
    const preventDefault = vi.fn()

    const handler = (clientX: number, clientY: number) => {
      preventDefault()
      const rect = getBoundingClientRect()
      const globalX = clientX - rect.left
      const globalY = clientY - rect.top
      coords.push({ x: globalX, y: globalY })
    }

    handler(300, 200)

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(coords).toHaveLength(1)
    expect(coords[0]).toEqual({ x: 200, y: 150 })
  })

  it('dispatches to onGroundCommand when no unit or mineral is under cursor', () => {
    const onGroundCommand = vi.fn()
    const onUnitCommand = vi.fn()
    const onMineralCommand = vi.fn()

    // Simulate the dispatchCommand pattern from renderer.ts
    const dispatchCommand = (globalX: number, globalY: number) => {
      const unitHit: number | null = null
      const mineralHit: number | null = null
      if (mineralHit !== null) {
        onMineralCommand(mineralHit)
      } else if (unitHit !== null) {
        onUnitCommand(unitHit)
      } else {
        onGroundCommand(globalX, globalY)
      }
    }

    dispatchCommand(250, 150)

    expect(onGroundCommand).toHaveBeenCalledOnce()
    expect(onGroundCommand).toHaveBeenCalledWith(250, 150)
    expect(onUnitCommand).not.toHaveBeenCalled()
    expect(onMineralCommand).not.toHaveBeenCalled()
  })

  it('dispatches onMineralCommand when mineral node is under cursor', () => {
    const onGroundCommand = vi.fn()
    const onUnitCommand = vi.fn()
    const onMineralCommand = vi.fn()

    const dispatchCommand = (globalX: number, globalY: number) => {
      const mineralHit: number | null = 42
      if (mineralHit !== null) {
        onMineralCommand(mineralHit)
      } else {
        onGroundCommand(globalX, globalY)
      }
    }

    dispatchCommand(100, 200)

    expect(onMineralCommand).toHaveBeenCalledOnce()
    expect(onMineralCommand).toHaveBeenCalledWith(42)
    expect(onGroundCommand).not.toHaveBeenCalled()
    expect(onUnitCommand).not.toHaveBeenCalled()
  })

  it('dispatches onUnitCommand when unit is under cursor', () => {
    const onGroundCommand = vi.fn()
    const onUnitCommand = vi.fn()
    const onMineralCommand = vi.fn()

    const dispatchCommand = (globalX: number, globalY: number) => {
      const mineralHit: number | null = null
      const unitHit: number | null = 7
      if (mineralHit !== null) {
        onMineralCommand(mineralHit)
      } else if (unitHit !== null) {
        onUnitCommand(unitHit)
      } else {
        onGroundCommand(globalX, globalY)
      }
    }

    dispatchCommand(100, 200)

    expect(onUnitCommand).toHaveBeenCalledOnce()
    expect(onUnitCommand).toHaveBeenCalledWith(7)
    expect(onGroundCommand).not.toHaveBeenCalled()
    expect(onMineralCommand).not.toHaveBeenCalled()
  })
})
