import { describe, expect, it } from 'vitest'
import { createItemProcThrottle, resolveItemProc } from './itemProcs'

const itemsByUnit: Record<string, string[]> = { holder: ['Leftovers', 'Shell Bell'] }
const itemNamesFor = (unitId: string) => itemsByUnit[unitId]

describe('resolveItemProc', () => {
  it('labels ITEM events over the affected unit', () => {
    expect(
      resolveItemProc(
        { type: 'ITEM', sourceId: 'holder', targetId: 'enemy', skillName: "King's Rock" },
        itemNamesFor,
      ),
    ).toEqual({ unitId: 'enemy', itemName: "King's Rock", text: "King's Rock!", repeating: false })
  })

  it('labels heals named after one of the source unit items as repeating procs', () => {
    expect(
      resolveItemProc(
        { type: 'HEAL', sourceId: 'holder', targetId: 'holder', skillName: 'Leftovers' },
        itemNamesFor,
      ),
    ).toEqual({ unitId: 'holder', itemName: 'Leftovers', text: 'Leftovers!', repeating: true })
  })

  it('ignores ability heals, unnamed events and other event types', () => {
    expect(
      resolveItemProc(
        { type: 'HEAL', sourceId: 'holder', targetId: 'ally', skillName: 'Soft-Boiled' },
        itemNamesFor,
      ),
    ).toBeNull()
    expect(
      resolveItemProc(
        { type: 'HEAL', sourceId: 'holder', targetId: 'holder', skillName: null },
        itemNamesFor,
      ),
    ).toBeNull()
    expect(
      resolveItemProc(
        { type: 'SKILL', sourceId: 'holder', targetId: 'enemy', skillName: 'Leftovers' },
        itemNamesFor,
      ),
    ).toBeNull()
  })
})

describe('createItemProcThrottle', () => {
  it('always shows one-off procs and throttles repeating procs per unit and item', () => {
    const shouldShow = createItemProcThrottle(3000)
    const regen = { unitId: 'holder', itemName: 'Leftovers', text: 'Leftovers!', repeating: true }
    const save = { unitId: 'holder', itemName: 'Focus Band', text: 'Focus Band!', repeating: false }

    expect(shouldShow(regen, 1000)).toBe(true)
    expect(shouldShow(regen, 2000)).toBe(false)
    expect(shouldShow({ ...regen, unitId: 'other' }, 2000)).toBe(true)
    expect(shouldShow(save, 2000)).toBe(true)
    expect(shouldShow(save, 2001)).toBe(true)
    expect(shouldShow(regen, 4000)).toBe(true)
  })
})
