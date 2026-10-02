import type { SnapshotBuilding } from '@rts/protocol'
import type { ResearchType } from '@rts/shared'
import type { HudContextFeedback, HudFeedbackTarget } from '../components/hud-context-feedback'
import { castleTierLabel } from './tier-label'

export const HUD_NOTIFICATION_KINDS = [
  'RESEARCH_COMPLETED',
  'CONSTRUCTION_COMPLETED',
  'COMMAND_BLOCKED',
  'COMMAND_BLOCKED_GOLD',
  'COMMAND_BLOCKED_SUPPLY',
  'COMMAND_BLOCKED_QUEUE',
  'REPAIR_STOPPED_NO_GOLD',
  'CONNECTION_LOST',
  'CONNECTION_CLOSED',
  'MATCH_CONFIG_ERROR',
  'MATCH_REQUEST_ERROR',
  'MATCH_ERROR'
] as const

export type HudNotification =
  | { readonly kind: 'RESEARCH_COMPLETED'; readonly research: ResearchType }
  | { readonly kind: 'CONSTRUCTION_COMPLETED'; readonly building: SnapshotBuilding }
  | { readonly kind: 'COMMAND_BLOCKED'; readonly message: string }
  | { readonly kind: 'COMMAND_BLOCKED_GOLD' }
  | { readonly kind: 'COMMAND_BLOCKED_SUPPLY' }
  | { readonly kind: 'COMMAND_BLOCKED_QUEUE' }
  | { readonly kind: 'REPAIR_STOPPED_NO_GOLD' }
  | { readonly kind: 'CONNECTION_LOST'; readonly message?: string }
  | { readonly kind: 'CONNECTION_CLOSED' }
  | { readonly kind: 'MATCH_CONFIG_ERROR'; readonly message: string }
  | { readonly kind: 'MATCH_REQUEST_ERROR'; readonly message: string }
  | { readonly kind: 'MATCH_ERROR'; readonly message: string }

interface HudToastNotification {
  readonly type: 'error' | 'success'
  readonly title: string
  readonly description: string
  readonly dedupeKey: string
}

export interface HudNotificationPresentation {
  readonly context: HudContextFeedback | null
  readonly toast: HudToastNotification | null
}

function constructionLabel(construction: SnapshotBuilding): string {
  if (construction.buildingType === 'CASTLE') {
    return castleTierLabel(construction.tier ?? 1)
  }
  if (construction.buildingType === 'BARRACKS') {
    return 'Barracks'
  }
  if (construction.buildingType === 'ARCHERY') {
    return 'Archery'
  }
  if (construction.buildingType === 'MONASTERY') {
    return 'Monastery'
  }
  if (construction.buildingType === 'HOUSE') {
    return 'House'
  }
  return 'Tower'
}

function researchLabel(research: ResearchType): string {
  if (research === 'ATTACK') {
    return 'Attack Research'
  }
  if (research === 'DEFENSE') {
    return 'Defense Research'
  }
  if (research === 'ECONOMY') {
    return 'Economy Research'
  }
  return 'Movement Research'
}

function feedbackTargetForMessage(message: string): HudFeedbackTarget {
  const normalized = message.toLowerCase()
  if (normalized.includes('gold')) {
    return 'gold'
  }
  if (normalized.includes('supply')) {
    return 'supply'
  }
  if (normalized.includes('queue')) {
    return 'queue'
  }
  return 'command'
}

function readableError(message: string): string {
  return message.replace(/^[A-Z_]+:\s*/, '')
}

function contextual(message: string, target: HudFeedbackTarget): HudNotificationPresentation {
  return { context: { message, target }, toast: null }
}

function globalError(message: string): HudNotificationPresentation {
  return {
    context: { message: readableError(message), target: feedbackTargetForMessage(message) },
    toast: { type: 'error', title: 'Match error', description: message, dedupeKey: `match-error:${message}` }
  }
}

export function blockedCommandNotification(message: string, target: HudFeedbackTarget): HudNotification {
  if (target === 'gold') {
    return { kind: 'COMMAND_BLOCKED_GOLD' }
  }
  if (target === 'supply') {
    return { kind: 'COMMAND_BLOCKED_SUPPLY' }
  }
  if (target === 'queue') {
    return { kind: 'COMMAND_BLOCKED_QUEUE' }
  }
  return { kind: 'COMMAND_BLOCKED', message }
}

export function matchErrorNotification(message: string): HudNotification {
  if (message.includes('Connection')) {
    return { kind: 'CONNECTION_LOST', message }
  }
  if (message.startsWith('MATCH_CONFIG:')) {
    return { kind: 'MATCH_CONFIG_ERROR', message }
  }
  if (message.startsWith('MATCH_REQUEST:')) {
    return { kind: 'MATCH_REQUEST_ERROR', message }
  }
  return { kind: 'MATCH_ERROR', message }
}

export function notificationPresentation(notification: HudNotification): HudNotificationPresentation {
  if (notification.kind === 'RESEARCH_COMPLETED') {
    return {
      context: null,
      toast: {
        type: 'success',
        title: 'Research complete',
        description: researchLabel(notification.research),
        dedupeKey: `research-complete:${notification.research}`
      }
    }
  }
  if (notification.kind === 'CONSTRUCTION_COMPLETED') {
    return {
      context: null,
      toast: {
        type: 'success',
        title: 'Construction complete',
        description: constructionLabel(notification.building),
        dedupeKey: `construction-complete:${notification.building.id}`
      }
    }
  }
  if (notification.kind === 'COMMAND_BLOCKED_GOLD') {
    return contextual('Insufficient gold', 'gold')
  }
  if (notification.kind === 'COMMAND_BLOCKED_SUPPLY') {
    return contextual('Insufficient supply', 'supply')
  }
  if (notification.kind === 'COMMAND_BLOCKED_QUEUE') {
    return contextual('Queue is full', 'queue')
  }
  if (notification.kind === 'REPAIR_STOPPED_NO_GOLD') {
    return contextual('Repair stopped: insufficient gold', 'gold')
  }
  if (notification.kind === 'CONNECTION_LOST') {
    return globalError(notification.message ?? 'Connection to the match was lost.')
  }
  if (notification.kind === 'CONNECTION_CLOSED') {
    return globalError('Connection to the match was closed.')
  }
  if (notification.kind === 'MATCH_CONFIG_ERROR' || notification.kind === 'MATCH_REQUEST_ERROR') {
    return globalError(notification.message)
  }
  return contextual(notification.message, feedbackTargetForMessage(notification.message))
}
