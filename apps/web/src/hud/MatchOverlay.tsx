import { Button } from '@/components/ui/button'

const RESULT_COPY: Record<
  'victory' | 'defeat' | 'draw',
  { readonly emoji: string; readonly title: string; readonly note: string }
> = {
  victory: { emoji: '🏆', title: 'Victory', note: 'You eliminated every opponent.' },
  defeat: { emoji: '💀', title: 'Defeat', note: 'Your forces were destroyed.' },
  draw: { emoji: '🤝', title: 'Draw', note: 'No side survived the battle.' }
}

interface MatchOverlayProps {
  readonly result: 'victory' | 'defeat' | 'draw'
  readonly onNewMatch: () => void
}

/** Full-screen result overlay shown once the match finishes (phase FINISHED). */
export function MatchOverlay({ result, onNewMatch }: MatchOverlayProps) {
  const copy = RESULT_COPY[result]
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div
        className="flex w-80 flex-col items-center gap-4 rounded-2xl border border-border/60 bg-background p-8 shadow-2xl"
        role="dialog"
        aria-label="match result"
      >
        <span className="text-4xl">{copy.emoji}</span>
        <h2 className="text-2xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-sm text-muted-foreground">{copy.note}</p>
        <Button type="button" onClick={onNewMatch} className="w-full">
          New match
        </Button>
      </div>
    </div>
  )
}
