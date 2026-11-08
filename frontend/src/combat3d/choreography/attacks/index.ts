import type { AttackSet } from '../types'
import { BEASTS_BIG_MOM_ATTACKS } from './beastsBigMom'
import { MARINES_WARLORDS_ATTACKS } from './marinesWarlords'
import { POKEMON_TIER_1_ATTACKS } from './pokemonTier1'
import { POKEMON_TIER_2_ATTACKS } from './pokemonTier2'
import { POKEMON_TIER_3_ATTACKS } from './pokemonTier3'
import { POKEMON_TIER_4_5_ATTACKS } from './pokemonTier45'
import { REVOLUTION_WHITEBEARD_ATTACKS } from './revolutionWhitebeard'
import { STRAW_HATS_ATTACKS } from './strawHats'

export const SIGNATURE_ATTACK_SETS: Record<string, AttackSet> = {
  strawHats: STRAW_HATS_ATTACKS,
  marinesWarlords: MARINES_WARLORDS_ATTACKS,
  beastsBigMom: BEASTS_BIG_MOM_ATTACKS,
  revolutionWhitebeard: REVOLUTION_WHITEBEARD_ATTACKS,
  pokemonTier1: POKEMON_TIER_1_ATTACKS,
  pokemonTier2: POKEMON_TIER_2_ATTACKS,
  pokemonTier3: POKEMON_TIER_3_ATTACKS,
  pokemonTier45: POKEMON_TIER_4_5_ATTACKS,
}

export const SIGNATURE_ATTACKS: AttackSet = Object.assign({}, ...Object.values(SIGNATURE_ATTACK_SETS))
