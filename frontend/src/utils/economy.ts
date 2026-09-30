import type { GameUnit } from '../types'

export const calculateSellRefund = (unit: GameUnit | null): number => {
    if (!unit) return 0
    const cost = unit.cost || 1
    const starLevel = unit.starLevel || 1
    const copies = starLevel === 1 ? 1 : starLevel === 2 ? 3 : 6
    return cost * copies
}

export const calculateInterest = (gold: number, maxInterest: number): number =>
    Math.max(0, Math.min(Math.floor(gold / 10), maxInterest))
