import { describe, expect, it } from 'vitest'
import { SIGNATURE_ATTACK_SETS, SIGNATURE_ATTACKS } from './choreography/attacks'
import { SIGNATURE_ULTIMATE_SETS, SIGNATURE_ULTIMATES } from './choreography/ultimates'

// Keys a later set may intentionally redefine, e.g. a Mythic showpiece replacing its tier entry.
const ALLOWED_ULTIMATE_OVERRIDES: Record<string, string> = {}
const ALLOWED_ATTACK_OVERRIDES: Record<string, string> = {}

function duplicateKeys(sets: Record<string, Record<string, unknown>>, allowed: Record<string, string>) {
  const owners = new Map<string, string[]>()
  for (const [setName, set] of Object.entries(sets)) {
    for (const key of Object.keys(set)) {
      owners.set(key, [...(owners.get(key) ?? []), setName])
    }
  }
  return [...owners]
    .filter(([key, setNames]) => setNames.length > 1 && !(setNames.length === 2 && allowed[key] === setNames[1]))
    .map(([key, setNames]) => `${key}: ${setNames.join(', ')}`)
}

describe('signature choreography sets', () => {
  it('defines each signature ultimate key in only one set', () => {
    expect(duplicateKeys(SIGNATURE_ULTIMATE_SETS, ALLOWED_ULTIMATE_OVERRIDES)).toEqual([])
  })

  it('defines each signature attack key in only one set', () => {
    expect(duplicateKeys(SIGNATURE_ATTACK_SETS, ALLOWED_ATTACK_OVERRIDES)).toEqual([])
  })

  it('merges every set into the signature registries', () => {
    const ultimateKeys = Object.values(SIGNATURE_ULTIMATE_SETS).flatMap((set) => Object.keys(set))
    const attackKeys = Object.values(SIGNATURE_ATTACK_SETS).flatMap((set) => Object.keys(set))

    expect(Object.keys(SIGNATURE_ULTIMATES).sort()).toEqual([...new Set(ultimateKeys)].sort())
    expect(Object.keys(SIGNATURE_ATTACKS).sort()).toEqual([...new Set(attackKeys)].sort())
  })
})
