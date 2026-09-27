import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../types'
import { findNearestEnemy, latestCombatEventTimestamp, takeNewCombatEvents } from './combatView'

const event = (timestamp: number, sourceId = 'a'): CombatEvent => ({
  timestamp,
  type: 'DAMAGE',
  sourceId,
  targetId: 'b',
  value: 10,
})

describe('takeNewCombatEvents', () => {
  it('returns only events newer than the last processed timestamp', () => {
    const window = [event(100), event(200, 'a'), event(200, 'c'), event(300)]
    const first = takeNewCombatEvents(window, 100)

    expect(first.events.map((entry) => entry.timestamp)).toEqual([200, 200, 300])
    expect(first.lastTimestamp).toBe(300)
    expect(takeNewCombatEvents(window, first.lastTimestamp)).toEqual({
      events: [],
      lastTimestamp: 300,
    })
  })

  it('handles missing windows', () => {
    expect(takeNewCombatEvents(undefined, 40)).toEqual({ events: [], lastTimestamp: 40 })
    expect(latestCombatEventTimestamp(null)).toBe(0)
    expect(latestCombatEventTimestamp([event(5), event(9), event(7)])).toBe(9)
  })
})

describe('findNearestEnemy', () => {
  const unit = (ownerId: string, visualX: number, visualY: number, currentHealth = 100) => ({
    ownerId,
    visualX,
    visualY,
    currentHealth,
  })

  it('picks the closest living enemy by Chebyshev distance', () => {
    const source = unit('me', 4, 4)
    const far = unit('them', 0, 0)
    const dead = unit('them', 4, 3, 0)
    const close = unit('them', 5, 2)
    const ally = unit('me', 4, 5)

    expect(findNearestEnemy(source, [ally, far, dead, close])).toBe(close)
    expect(findNearestEnemy(source, [ally])).toBeNull()
  })
})
