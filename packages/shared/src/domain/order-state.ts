export const ORDER_STATES = [
  'idle',
  'moving',
  'building',
  'attacking',
  'lost_target',
  'healing',
  'repairing',
  'hold',
  'patrol',
  'attack_move'
] as const

export type OrderState = (typeof ORDER_STATES)[number]
