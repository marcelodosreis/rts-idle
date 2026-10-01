import { useEffect, useState } from 'react'

const REFERENCE_WIDTH = 1440
const REFERENCE_HEIGHT = 900
const MINIMUM_SCALE = 0.889
const MAXIMUM_SCALE = 1.15

function currentScale(): number {
  return Math.min(
    MAXIMUM_SCALE,
    Math.max(MINIMUM_SCALE, Math.min(window.innerWidth / REFERENCE_WIDTH, window.innerHeight / REFERENCE_HEIGHT))
  )
}

export function useHudScale(): number {
  const [scale, setScale] = useState(currentScale)
  useEffect(() => {
    const update = (): void => setScale(currentScale())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}
