import { useEffect, useRef } from 'react'
import { useTimedValue } from './useTimedValue'

export function observedDelta(previous: number | null, value: number | null): number | null {
  if (previous === null || value === null || previous === value) {
    return null
  }
  return value - previous
}

export function useObservedDelta(value: number | null, duration = 1000): number | null {
  const previous = useRef<number | null>(null)
  const delta = useTimedValue<number>(duration)
  const showDelta = delta.show

  useEffect(() => {
    const nextDelta = observedDelta(previous.current, value)
    if (nextDelta !== null) {
      showDelta(nextDelta)
    }
    previous.current = value
  }, [showDelta, value])

  return delta.value
}
