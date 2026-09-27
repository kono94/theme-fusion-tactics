import type { UltimateSet } from '../types'
import { BEASTS_BIG_MOM_ULTIMATES } from './beastsBigMom'
import { MARINES_WARLORDS_ULTIMATES } from './marinesWarlords'
import { POKEMON_MYTHIC_ULTIMATES } from './pokemonMythic'
import { POKEMON_TIER_1_ULTIMATES } from './pokemonTier1'
import { POKEMON_TIER_2_ULTIMATES } from './pokemonTier2'
import { POKEMON_TIER_3_ULTIMATES } from './pokemonTier3'
import { POKEMON_TIER_4_5_ULTIMATES } from './pokemonTier45'
import { REVOLUTION_WHITEBEARD_ULTIMATES } from './revolutionWhitebeard'
import { STRAW_HATS_ULTIMATES } from './strawHats'

export const SIGNATURE_ULTIMATES: UltimateSet = {
  ...STRAW_HATS_ULTIMATES,
  ...MARINES_WARLORDS_ULTIMATES,
  ...BEASTS_BIG_MOM_ULTIMATES,
  ...REVOLUTION_WHITEBEARD_ULTIMATES,
  ...POKEMON_TIER_1_ULTIMATES,
  ...POKEMON_TIER_2_ULTIMATES,
  ...POKEMON_TIER_3_ULTIMATES,
  ...POKEMON_TIER_4_5_ULTIMATES,
  // Reworked showpieces override their tier entries.
  ...POKEMON_MYTHIC_ULTIMATES,
}
