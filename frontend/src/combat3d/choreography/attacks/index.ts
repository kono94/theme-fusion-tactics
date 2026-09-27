import type { AttackSet } from '../types'
import { BEASTS_BIG_MOM_ATTACKS } from './beastsBigMom'
import { MARINES_WARLORDS_ATTACKS } from './marinesWarlords'
import { POKEMON_TIER_1_ATTACKS } from './pokemonTier1'
import { POKEMON_TIER_2_ATTACKS } from './pokemonTier2'
import { POKEMON_TIER_3_ATTACKS } from './pokemonTier3'
import { POKEMON_TIER_4_5_ATTACKS } from './pokemonTier45'
import { REVOLUTION_WHITEBEARD_ATTACKS } from './revolutionWhitebeard'
import { STRAW_HATS_ATTACKS } from './strawHats'

export const SIGNATURE_ATTACKS: AttackSet = {
  ...STRAW_HATS_ATTACKS,
  ...MARINES_WARLORDS_ATTACKS,
  ...BEASTS_BIG_MOM_ATTACKS,
  ...REVOLUTION_WHITEBEARD_ATTACKS,
  ...POKEMON_TIER_1_ATTACKS,
  ...POKEMON_TIER_2_ATTACKS,
  ...POKEMON_TIER_3_ATTACKS,
  ...POKEMON_TIER_4_5_ATTACKS,
}
