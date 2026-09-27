export const NEUTRAL_ARENA_ID = 'neutral'

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// Deterministic so every player in the same room renders the same stage.
export function pickArenaId(pool: readonly string[], seed: string, override?: string | null): string {
  if (override && pool.includes(override)) return override
  if (pool.length === 0) return NEUTRAL_ARENA_ID
  return pool[hashSeed(seed) % pool.length]
}

export function readArenaOverride(search: string): string | null {
  return new URLSearchParams(search).get('arena')
}
