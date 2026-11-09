import { describe, expect, it } from 'vitest'
import onePieceUnits from '../../../backend/src/main/resources/data/units_onepiece.json'
import pokemonUnits from '../../../backend/src/main/resources/data/units_pokemon.json'
import pokemonGen23Units from '../../../backend/src/main/resources/data/units_pokemongen23.json'
import { getAbilityConfig, getAttackConfig } from '../data/animationConfig'
import { getArena, isArenaId } from './arenas'
import {
  hasSignatureAttack,
  hasSignatureUltimate,
  resolveAttack,
  resolveUltimate,
} from './choreography/registry'
import { GAME_MODE_METADATA } from '../data/gameModeMetadata'
import type { CombatUnit3d } from './types'

interface RawAbility {
  name: string
}

interface RawUnit {
  id: string
  cost: number
  traits?: string[]
  ability: RawAbility
  forms?: { definitionId: string; traits?: string[]; ability?: RawAbility | null }[]
}

interface PokemonMove {
  definitionId: string
  abilityName: string
  traits: string[]
}

const unitFor = (definitionId: string, abilityName: string | null = null, traits: string[] = []) =>
  ({
    definitionId,
    abilityName,
    ability: getAbilityConfig(definitionId, traits),
    attack: getAttackConfig(definitionId, traits),
  }) as CombatUnit3d

const ONE_PIECE_SETS: Record<string, string[]> = {
  strawHats: ['luffy_v1', 'nami_v1', 'usopp_v1', 'zoro_v1', 'sanji_v1', 'chopper_v1', 'robin_v1', 'franky_v1', 'brook_v1', 'jinbei_v1'],
  marinesWarlords: [
    'koby_v1', 'helmeppo_v1', 'tashigi_v1', 'hina_v1', 'smoker_v1', 'garp_v1', 'sengoku_v1', 'kizaru_v1', 'akainu_v1',
    'buggy_v1', 'moria_v1', 'crocodile_v1', 'kuma_v1', 'doflamingo_v1', 'mihawk_v1', 'hancock_v1',
  ],
  beastsBigMom: [
    'gifter_v1', 'headliner_v1', 'ulti_v1', 'page_one_v1', 'sasaki_v1', 'whos_who_v1', 'queen_v1', 'king_v1', 'kaido_v1',
    'chess_soldiers_v1', 'prometheus_v1', 'perospero_v1', 'daifuku_v1', 'cracker_v1', 'smoothie_v1', 'katakuri_v1', 'big_mom_v1',
  ],
  revolutionWhitebeard: [
    'hack_v1', 'koala_v1', 'belo_betty_v1', 'ivankov_v1', 'sabo_v1', 'dragon_v1',
    'thatch_v1', 'jozu_v1', 'vista_v1', 'ace_v1', 'marco_v1', 'whitebeard_v1',
  ],
}

const POKEMON_SETS: Record<string, (cost: number) => boolean> = {
  pokemonTier1: (cost) => cost === 1,
  pokemonTier2: (cost) => cost === 2,
  pokemonTier3: (cost) => cost === 3,
  pokemonTier45: (cost) => cost >= 4,
}

function pokemonMoves(units: RawUnit[], filter: (cost: number) => boolean = () => true): PokemonMove[] {
  const moves = new Map<string, PokemonMove>()
  for (const unit of units) {
    if (!filter(unit.cost)) continue
    const forms = unit.forms?.length ? unit.forms : [{ definitionId: unit.id, ability: unit.ability }]
    for (const form of forms) {
      const abilityName = (form.ability ?? unit.ability).name
      const traits = ('traits' in form ? form.traits : undefined) ?? unit.traits ?? []
      moves.set(`${form.definitionId}:${abilityName}`, { definitionId: form.definitionId, abilityName, traits })
    }
  }
  return [...moves.values()]
}

describe('3D choreography registry', () => {
  it('covers every One Piece unit in exactly one set', () => {
    const listed = Object.values(ONE_PIECE_SETS).flat().sort()
    expect(listed).toEqual((onePieceUnits as RawUnit[]).map((unit) => unit.id).sort())
  })

  describe.each(Object.entries(ONE_PIECE_SETS))('One Piece set %s', (_set, ids) => {
    it.each(ids)('%s has a signature ultimate and auto-attack', (id) => {
      const ability = (onePieceUnits as RawUnit[]).find((unit) => unit.id === id)?.ability.name ?? null
      expect(hasSignatureUltimate(unitFor(id, ability))).toBe(true)
      expect(hasSignatureAttack(unitFor(id, ability))).toBe(true)
    })
  })

  describe.each(Object.entries(POKEMON_SETS))('Pokemon set %s', (_set, filter) => {
    const moves = pokemonMoves(pokemonUnits as RawUnit[], filter)
    it.each(moves.map((move) => [`${move.definitionId}:${move.abilityName}`, move] as const))(
      '%s has a signature ultimate',
      (_key, move) => {
        expect(hasSignatureUltimate(unitFor(move.definitionId, move.abilityName))).toBe(true)
      },
    )

    it('gives forms with several abilities a distinct choreography per ability', () => {
      const byForm = new Map<string, string[]>()
      moves.forEach((move) => byForm.set(move.definitionId, [...(byForm.get(move.definitionId) ?? []), move.abilityName]))
      for (const [definitionId, abilities] of byForm) {
        if (abilities.length < 2) continue
        const choreographies = new Set(abilities.map((name) => resolveUltimate(unitFor(definitionId, name))))
        expect(choreographies.size, definitionId).toBe(abilities.length)
      }
    })
  })

  describe('Pokemon Gen 2/3', () => {
    const moves = pokemonMoves(pokemonGen23Units as RawUnit[])
    const generic = resolveUltimate(unitFor('unknown_unit'))

    // Until the signature sets land, every move must at least reach its type fallback instead of the generic one.
    it.each(moves.map((move) => [`${move.definitionId}:${move.abilityName}`, move] as const))(
      '%s resolves to a non-generic ultimate',
      (_key, move) => {
        const unit = unitFor(move.definitionId, move.abilityName, move.traits)
        expect(unit.ability.effectStyle, move.definitionId).toMatch(/^POKEMON_/)
        expect(resolveUltimate(unit)).not.toBe(generic)
      },
    )
  })

  it('falls back to generic choreographies for unknown units', () => {
    expect(hasSignatureUltimate(unitFor('unknown_unit'))).toBe(false)
    expect(resolveAttack(unitFor('unknown_unit'))).toBeTypeOf('function')
    expect(resolveUltimate(unitFor('unknown_unit'))).toBeTypeOf('function')
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
