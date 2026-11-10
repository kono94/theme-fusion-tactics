import { describe, expect, it } from 'vitest'
import { DEFAULT_ROUND_TIME, normalizeRoundTime } from './roundTime'

describe('normalizeRoundTime', () => {
  it('falls back to the defaults when settings are missing', () => {
    expect(normalizeRoundTime(undefined)).toEqual({ planningSeconds: 15, combatSeconds: 32 })
    expect(normalizeRoundTime(null)).toEqual(DEFAULT_ROUND_TIME)
    expect(normalizeRoundTime({ planningSeconds: 20 })).toEqual({ planningSeconds: 20, combatSeconds: 32 })
  })

  it('keeps values inside the allowed range and rounds to whole seconds', () => {
    expect(normalizeRoundTime({ planningSeconds: 1, combatSeconds: 200 })).toEqual({
      planningSeconds: 5,
      combatSeconds: 60,
    })
    expect(normalizeRoundTime({ planningSeconds: 99, combatSeconds: 3 })).toEqual({
      planningSeconds: 60,
      combatSeconds: 15,
    })
    expect(normalizeRoundTime({ planningSeconds: 20.4, combatSeconds: 40.6 })).toEqual({
      planningSeconds: 20,
      combatSeconds: 41,
    })
  })
})
