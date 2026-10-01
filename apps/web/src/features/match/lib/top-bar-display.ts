const TICKS_PER_SECOND = 20

export function formatMatchTime(tick: number): string {
  const totalSeconds = Math.max(0, Math.floor(tick / TICKS_PER_SECOND))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
