export function romanTier(tier: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][tier - 1] ?? String(tier)
}

export function castleTierLabel(tier: number): string {
  return `Castle ${romanTier(tier)}`
}

export function castleTierUnavailableLabel(tier: number): string {
  return `${castleTierLabel(tier)} content is unavailable.`
}
