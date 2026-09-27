import { describe, expect, it } from 'vitest'
import { getAbilityConfig, getAttackConfig } from '../data/animationConfig'
import { getArena, isArenaId } from './arenas'
import { hasSignatureUltimate, resolveUltimate } from './choreography/registry'
import { GAME_MODE_METADATA } from '../data/gameModeMetadata'

const unitFor = (definitionId: string) => ({
  definitionId,
  ability: getAbilityConfig(definitionId),
  attack: getAttackConfig(definitionId),
})

describe('3D choreography registry', () => {
  it('gives the showcase One Piece units their own ultimate', () => {
    for (const id of ['luffy_v1', 'zoro_v1', 'sanji_v1', 'ace_v1', 'whitebeard_v1', 'kizaru_v1', 'akainu_v1', 'mihawk_v1']) {
      expect(hasSignatureUltimate(unitFor(id)), id).toBe(true)
    }
  })

  it('gives showcase Pokemon elements their own ultimate and falls back for the rest', () => {
    for (const id of ['charizard', 'pikachu', 'blastoise', 'alakazam', 'dragonite', 'gengar']) {
      expect(hasSignatureUltimate(unitFor(id)), id).toBe(true)
    }
    expect(hasSignatureUltimate(unitFor('snorlax'))).toBe(false)
    expect(resolveUltimate(unitFor('snorlax') as never)).toBe(resolveUltimate(unitFor('nami_v1') as never))
  })
})

describe('3D arenas', () => {
  it('registers every arena listed in the mode metadata', () => {
    for (const metadata of Object.values(GAME_MODE_METADATA)) {
      expect(metadata.arenas.length).toBeGreaterThan(1)
      for (const id of metadata.arenas) {
        expect(isArenaId(id), id).toBe(true)
      }
    }
  })

  it('uses a neutral stage for unknown ids', () => {
    expect(getArena('unknown').id).toBe('neutral')
  })
})
