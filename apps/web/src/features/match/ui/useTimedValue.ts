import { useCallback, useEffect, useRef, useState } from 'react'

/** Keeps short-lived presentation feedback in one place and cleans it on unmount. */
export function useTimedValue<T>(duration: number): {
  readonly value: T | null
  readonly show: (value: T) => void
  readonly clear: () => void
} {
  const [value, setValue] = useState<T | null>(null)
  const timer = useRef<number | null>(null)

  const clear = useCallback((): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setValue(null)
  }, [])

  const show = useCallback(
    (next: T): void => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
      }
      setValue(next)
      timer.current = window.setTimeout(() => {
        timer.current = null
        setValue(null)
      }, duration)
    },
    [duration]
  )

  useEffect(() => clear, [clear])

  return { value, show, clear }
}
