import { describe, expect, it } from 'vitest'
import { calculateInterest, calculateSellRefund } from './economy'
import type { GameUnit } from '../types'

describe('sell refund preview', () => {
    it.each([
        [1, 2],
        [2, 6],
        [3, 12],
    ])('matches the backend refund for a %s-star unit', (starLevel, refund) => {
        expect(calculateSellRefund({ cost: 2, starLevel } as GameUnit)).toBe(refund)
    })
})

describe('interest preview', () => {
    it.each([
        [0, 0],
        [9, 0],
        [10, 1],
        [37, 3],
        [50, 5],
        [120, 5],
    ])('pays interest on %s gold capped by the server limit', (gold, interest) => {
        expect(calculateInterest(gold, 5)).toBe(interest)
    })

    it('never returns a negative amount', () => {
        expect(calculateInterest(-20, 5)).toBe(0)
    })
})
