import type { UltimateSet } from '../types'
import { BEASTS_BIG_MOM_ULTIMATES } from './beastsBigMom'
import { GEN23_TIER1_ULTIMATES } from './gen23Tier1'
import { GEN23_TIER2_ULTIMATES } from './gen23Tier2'
import { GEN23_TIER3_ULTIMATES } from './gen23Tier3'
import { GEN23_TIER45_ULTIMATES } from './gen23Tier45'
import { MARINES_WARLORDS_ULTIMATES } from './marinesWarlords'
import { POKEMON_MYTHIC_ULTIMATES } from './pokemonMythic'
import { POKEMON_TIER_1_ULTIMATES } from './pokemonTier1'
import { POKEMON_TIER_2_ULTIMATES } from './pokemonTier2'
import { POKEMON_TIER_3_ULTIMATES } from './pokemonTier3'
import { POKEMON_TIER_4_5_ULTIMATES } from './pokemonTier45'
import { REVOLUTION_WHITEBEARD_ULTIMATES } from './revolutionWhitebeard'
import { STRAW_HATS_ULTIMATES } from './strawHats'

// Later sets win on key collisions.
export const SIGNATURE_ULTIMATE_SETS: Record<string, UltimateSet> = {
  strawHats: STRAW_HATS_ULTIMATES,
  marinesWarlords: MARINES_WARLORDS_ULTIMATES,
  beastsBigMom: BEASTS_BIG_MOM_ULTIMATES,
  revolutionWhitebeard: REVOLUTION_WHITEBEARD_ULTIMATES,
  pokemonTier1: POKEMON_TIER_1_ULTIMATES,
  pokemonTier2: POKEMON_TIER_2_ULTIMATES,
  pokemonTier3: POKEMON_TIER_3_ULTIMATES,
  pokemonTier45: POKEMON_TIER_4_5_ULTIMATES,
  gen23Tier1: GEN23_TIER1_ULTIMATES,
  gen23Tier2: GEN23_TIER2_ULTIMATES,
  gen23Tier3: GEN23_TIER3_ULTIMATES,
  gen23Tier45: GEN23_TIER45_ULTIMATES,
  // Reworked showpieces override their tier entries.
  pokemonMythic: POKEMON_MYTHIC_ULTIMATES,
}

export const SIGNATURE_ULTIMATES: UltimateSet = Object.assign(
  {},
  ...Object.values(SIGNATURE_ULTIMATE_SETS),
)
