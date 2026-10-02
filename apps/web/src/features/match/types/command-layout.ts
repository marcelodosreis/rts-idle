export const COMMAND_IDS = [
  'stop',
  'hold',
  'patrol',
  'attack',
  'attack-move',
  'contextual',
  'gather',
  'repair',
  'build',
  'deposit',
  'train',
  'research',
  'upgrade',
  'rally',
  'cancel-current',
  'cancel-construction',
  'back'
] as const

export type CommandId = (typeof COMMAND_IDS)[number]
export type CommandSlotValue = CommandId | string | null
export type CommandLayout = readonly [
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue,
  CommandSlotValue
]

interface CommandLayoutCatalog {
  readonly empty: CommandLayout
  readonly unit: CommandLayout
  readonly worker: CommandLayout
  readonly building: CommandLayout
  readonly construction: CommandLayout
}

export const COMMAND_LAYOUTS: CommandLayoutCatalog = {
  empty: [null, null, null, null, null, null, null, null, null],
  unit: ['stop', 'hold', 'patrol', 'attack', 'attack-move', 'contextual', null, null, null],
  worker: ['stop', 'hold', 'patrol', 'attack', 'attack-move', 'gather', 'repair', 'build', 'deposit'],
  building: ['train', 'research', 'upgrade', 'rally', 'cancel-current', null, null, null, null],
  construction: ['cancel-construction', null, null, null, null, null, null, null, null]
} as const satisfies CommandLayoutCatalog

export function createSubmenuLayout(items: readonly string[]): CommandLayout {
  return [
    items[0] ?? null,
    items[1] ?? null,
    items[2] ?? null,
    items[3] ?? null,
    items[4] ?? null,
    items[5] ?? null,
    items[6] ?? null,
    items[7] ?? null,
    'back'
  ]
}
