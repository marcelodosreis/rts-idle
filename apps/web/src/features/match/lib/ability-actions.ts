import { Flame, HeartPulse } from 'lucide-react'
import type { HudCommandAction } from '../components/hud-command-button'
import type { CommandBarProps } from '../types/command-types'

export function explosiveShotAction(props: CommandBarProps, blockedReason?: string): HudCommandAction {
  const cooldown = props.selection[0]?.explosiveShotCooldownRemaining ?? 0
  return {
    id: 'contextual',
    label: 'Blast',
    description: 'Blast a visible enemy and nearby foes for 25 Gold.',
    icon: Flame,
    blockedReason: blockedReason ?? (cooldown > 0 ? `Blast ready in ${Math.ceil(cooldown / 20)}s.` : undefined),
    active: props.mode === 'explosive_shot',
    feedbackKind: 'arm',
    onActivate: () => props.onArm('explosive_shot')
  }
}

export function healAction(props: CommandBarProps, blockedReason?: string): HudCommandAction {
  const cooldown = props.selection[0]?.healCooldownRemaining ?? 0
  return {
    id: 'contextual',
    label: 'Heal',
    description: 'Heal a damaged allied unit.',
    icon: HeartPulse,
    blockedReason: blockedReason ?? (cooldown > 0 ? `Heal ready in ${Math.ceil(cooldown / 20)}s.` : undefined),
    active: props.mode === 'heal',
    feedbackKind: 'arm',
    onActivate: () => props.onArm('heal')
  }
}
