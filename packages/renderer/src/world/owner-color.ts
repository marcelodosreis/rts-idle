export const OWNER_COLORS = [0x2e7d32, 0xc62828, 0x1565c0, 0xf9a825] as const

export function ownerColor(owner: number, fallback = 0x64748b): number {
  return OWNER_COLORS[owner % OWNER_COLORS.length] ?? fallback
}
