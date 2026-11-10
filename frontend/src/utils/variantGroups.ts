import type { UnitDefinition } from '../types'

export type VariantShopHint = 'locked' | 'random'

export const VARIANT_SHOP_HINT_TEXT: Record<VariantShopHint, { badge: string; detail: string }> = {
  locked: {
    badge: 'Locked',
    detail: 'Variant locked: the shop only offers this one until you sell every copy.',
  },
  random: {
    badge: 'Random',
    detail: 'Random variant until your first buy locks it in.',
  },
}

// Presentation only: the backend owns the lock. A group counts as locked while the player owns any unit of its line.
export function variantShopHint(
  card: Pick<UnitDefinition, 'variantGroup'>,
  ownedLineIds: ReadonlySet<string>,
): VariantShopHint | null {
  const group = card.variantGroup?.trim()
  if (!group) return null
  return ownedLineIds.has(group) ? 'locked' : 'random'
}
