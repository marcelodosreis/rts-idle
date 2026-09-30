export const HUD_FEEDBACK_TARGETS = ['command', 'minerals', 'supply', 'queue'] as const

export type HudFeedbackTarget = (typeof HUD_FEEDBACK_TARGETS)[number]

export interface HudContextFeedback {
  readonly message: string
  readonly target: HudFeedbackTarget
}

interface HudContextFeedbackProps {
  readonly feedback: HudContextFeedback | null
  readonly instruction: string | null
}

/** A fixed overlay keeps actionable HUD feedback close to the command source. */
export function HudContextFeedback({ feedback, instruction }: HudContextFeedbackProps) {
  const message = instruction ?? feedback?.message
  if (message === null) {
    return null
  }
  return (
    <div
      aria-live="polite"
      data-testid="hud-context-feedback"
      data-feedback-target={feedback?.target ?? 'command'}
      className="pointer-events-none absolute -top-8 right-3 left-3 z-20 truncate rounded-md border border-border/70 bg-background/95 px-2 py-1 text-center text-[10px] font-medium shadow-sm motion-safe:animate-[hud-context-feedback-in_180ms_ease-out]"
    >
      {message}
    </div>
  )
}
