import { describe, expect, it } from 'vitest'
import { NEUTRAL_ARENA_ID, pickArenaId, readArenaOverride } from './arenaSelection'

describe('pickArenaId', () => {
  const pool = ['foosha', 'baratie', 'sabaody', 'marineford', 'wano']

  it('picks the same arena for the same room', () => {
    expect(pickArenaId(pool, 'ROOM42')).toBe(pickArenaId(pool, 'ROOM42'))
    expect(pool).toContain(pickArenaId(pool, 'ROOM42'))
  })

  it('spreads rooms across the whole pool', () => {
    const picked = new Set(Array.from({ length: 200 }, (_, index) => pickArenaId(pool, `room-${index}`)))
    expect(picked).toEqual(new Set(pool))
  })

  it('honours a valid override and ignores foreign ones', () => {
    expect(pickArenaId(pool, 'ROOM42', 'wano')).toBe('wano')
    expect(pool).toContain(pickArenaId(pool, 'ROOM42', 'stadium'))
  })

  it('falls back to the neutral arena for an empty pool', () => {
    expect(pickArenaId([], 'ROOM42')).toBe(NEUTRAL_ARENA_ID)
  })

  it('reads the dev override from the query string', () => {
    expect(readArenaOverride('?arena=marineford&x=1')).toBe('marineford')
    expect(readArenaOverride('')).toBeNull()
  })
})
