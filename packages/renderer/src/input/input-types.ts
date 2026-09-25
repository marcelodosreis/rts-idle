export const INPUT_PROFILES = ['mouse', 'trackpad'] as const

export type InputProfile = (typeof INPUT_PROFILES)[number]

export const CANCEL_REASONS = ['escape', 'pointer-cancel', 'focus-lost', 'interaction-lock', 'dispose'] as const

export type CancelReason = (typeof CANCEL_REASONS)[number]

export interface WorldPoint {
  readonly x: number
  readonly y: number
}

export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

export type WorldTarget =
  | { readonly kind: 'unit'; readonly id: number }
  | { readonly kind: 'building'; readonly id: number }
  | { readonly kind: 'mineral'; readonly id: number }
  | { readonly kind: 'ground'; readonly position: WorldPoint }

export type WorldInteraction =
  | { readonly type: 'selection-start'; readonly screen: ScreenPoint }
  | { readonly type: 'selection-update'; readonly screen: ScreenPoint }
  | {
      readonly type: 'selection-end'
      readonly screenFrom: ScreenPoint
      readonly screenTo: ScreenPoint
      readonly worldFrom: WorldPoint
      readonly worldTo: WorldPoint
    }
  | { readonly type: 'primary-activate'; readonly target: WorldTarget }
  | { readonly type: 'secondary-activate'; readonly target: WorldTarget }
  | { readonly type: 'pointer-move'; readonly position: WorldPoint; readonly target: WorldTarget }
  | { readonly type: 'cancel'; readonly reason: CancelReason }

export interface CameraInputOptions {
  readonly profile: InputProfile
  readonly minZoom: number
  readonly maxZoom: number
}
