import { useEffect, useRef } from 'react'
import { useTimedValue } from './useTimedValue'

export function useObservedDelta(value: number | null, duration = 1000): number | null {
  const previous = useRef<number | null>(null)
  const delta = useTimedValue<number>(duration)
  const showDelta = delta.show

  useEffect(() => {
    if (value !== null && previous.current !== null && previous.current !== value) {
      showDelta(value - previous.current)
    }
    previous.current = value
  }, [showDelta, value])

  return delta.value
}
