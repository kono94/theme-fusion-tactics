import { describe, expect, it } from 'vitest'
import { formatItemBonuses } from './itemStats'

describe('formatItemBonuses', () => {
  it('lists percent and flat bonuses in a stable order', () => {
    expect(
      formatItemBonuses({ statBonuses: { DEFENSE_FLAT: 12, MAX_HEALTH_PERCENT: 15, ATTACK_SPEED_PERCENT: 15 } }),
    ).toEqual(['+15% Max HP', '+12 Defense', '+15% Attack speed'])
  })
})
