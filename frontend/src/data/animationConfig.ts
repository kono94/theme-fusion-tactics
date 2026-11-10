// Animation configuration for attack and ability effects
// Pattern = shape (SINGLE, LINE, SURROUND), styling comes from this config

export type AttackType =
    | 'punch'
    | 'slash'
    | 'projectile'
    | 'kick'
    | 'blunt'
    | 'rubberPunch'
    | 'tripleSlash'
    | 'sniperShot'
    | 'magmaFist'
    | 'waterShock'
    | 'lightning'
    | 'fireKick'
    | 'leafCut'
    | 'flameBurst'
    | 'aquaJet'
    | 'thunderJolt'
    | 'psyPulse'
    | 'poisonSting'
    | 'windGust'
    | 'stoneToss'
    | 'iceShard'
    | 'shadowOrb'
    | 'bugBite'
    | 'forcePalm'
    | 'dragonSpark'
    | 'metalSpark'

export interface AttackAnimationConfig {
    type: AttackType
    color: string
    secondaryColor?: string
    particles?: number
    animationKey?: string
    element?: string
    accentColor?: string
    diagnostic?: boolean
}

export type AbilityEffectStyle =
    | 'DEFAULT'
    | 'BEAM_HEAVY'
    | 'MAGMA_RAIN'
    | 'QUAKE'
    | 'SOUL_SPIRAL'
    | 'DRAGON_ROAR'
    | 'LUFFY_GATLING'
    | 'ZORO_ONIGIRI'
    | 'USOPP_EXPLOSIVE_STAR'
    | 'NAMI_LIGHTNING_TEMPO'
    | 'SANJI_DIABLE_JAMBE'
    | 'AKAINU_MAGMA_RAIN'
    | 'WHITEBEARD_QUAKE'
    | 'FRANKY_RADICAL_BEAM'
    | 'ROBIN_ARM_FIELD'
    | 'BROOK_SOUL_FREEZE'
    | 'JINBEI_WATER_SURGE'
    | 'KIZARU_LIGHT_BEAM'
    | 'MIHAWK_BLACK_BLADE'
    | 'KAIDO_DRAGON_ROAR'
    | 'BIG_MOM_SOUL_STORM'
    | 'ACE_FIRE_FIST'
    | 'MARCO_PHOENIX_FLAME'
    | 'CHOPPER_HEAL'
    | 'KOBY_DETERMINATION'
    | 'PEROSPERO_CANDY_SHOWER'
    | 'IVANKOV_HORMONE_HEAL'
    | 'JOZU_DIAMOND_GUARD'
    | 'HANCOCK_LOVE_ARROW'
    | 'CROCODILE_SANDSTORM'
    | 'DOFLAMINGO_STRING_CAGE'
    | 'SMOKER_WHITE_OUT'
    | 'HINA_BINDING_CAGE'
    | 'KUMA_URSUS_SHOCK'
    | 'BUGGY_CHOP_FESTIVAL'
    | 'MORIA_SHADOW_STEAL'
    | 'QUEEN_PLAGUE_ROUND'
    | 'KAIDO_THUNDER_BAGUA'
    | 'GARP_FIST_METEOR'
    | 'SENGOKU_BUDDHA_SHOCK'
    | 'QUEEN_LASER_VOLLEY'
    | 'KING_FLAME_SLASH'
    | 'KATAKURI_MOCHI_CRUSH'
    | 'ELEMENT_BURST'
    | 'WEAPON_BARRAGE'
    | 'AURA_COMMAND'
    | 'BEAST_RUSH'
    | 'SHADOW_DRAIN'
    | 'POISON_CLOUD'
    | 'CANDY_TRAP'
    | 'LOVE_BURST'
    | 'WIND_STORM'
    | 'POKEMON_GRASS_BLOOM'
    | 'POKEMON_FIRE_STREAM'
    | 'POKEMON_WATER_CANNON'
    | 'POKEMON_ELECTRIC_STORM'
    | 'POKEMON_PSYCHIC_WAVE'
    | 'POKEMON_POISON_BURST'
    | 'POKEMON_EARTH_SPIKES'
    | 'POKEMON_ICE_CRYSTAL'
    | 'POKEMON_DRAGON_BEAM'
    | 'POKEMON_GHOST_NIGHTMARE'
    | 'POKEMON_NORMAL_RALLY'
    | 'POKEMON_BUG_SWARM'
    | 'POKEMON_FIGHTING_COMBO'
    | 'POKEMON_FLYING_GUST'
    | 'POKEMON_STEEL_FIELD'
    | 'POKEMON_DARK_CRESCENT'

export interface AbilityAnimationConfig {
    color: string
    effectStyle?: AbilityEffectStyle
    secondaryColor?: string
    signature?: string
    screenShake?: number
    particleScale?: number
    durationScale?: number
    projectileCount?: number
    ringCount?: number
    trailWidth?: number
    animationKey?: string
    element?: string
    accentColor?: string
    diagnostic?: boolean
}

// Per-unit attack animations (auto-attacks)
export const ATTACK_ANIMATIONS: Record<string, AttackAnimationConfig> = {
    // === STRAW HAT ===
    'luffy_v1': { type: 'rubberPunch', color: '#ef4444', secondaryColor: '#fbbf24', particles: 18 },
    'zoro_v1': { type: 'tripleSlash', color: '#22c55e', secondaryColor: '#dcfce7', particles: 16 },
    'nami_v1': { type: 'lightning', color: '#38bdf8', secondaryColor: '#fef08a', particles: 18 },
    'usopp_v1': { type: 'sniperShot', color: '#f59e0b', secondaryColor: '#fef3c7', particles: 14 },
    'chopper_v1': { type: 'punch', color: '#f472b6' }, // Pink
    'sanji_v1': { type: 'fireKick', color: '#f97316', secondaryColor: '#fde047', particles: 18 },
    'robin_v1': { type: 'punch', color: '#a855f7' }, // Purple
    'franky_v1': { type: 'punch', color: '#0ea5e9' }, // Sky blue
    'brook_v1': { type: 'slash', color: '#22d3ee' }, // Ice cyan
    'jinbei_v1': { type: 'waterShock', color: '#1d4ed8', secondaryColor: '#67e8f9', particles: 18 },

    // === MARINE ===
    'koby_v1': { type: 'punch', color: '#f472b6' },
    'helmeppo_v1': { type: 'slash', color: '#8b5cf6' },
    'tashigi_v1': { type: 'slash', color: '#6366f1' },
    'hina_v1': { type: 'punch', color: '#ec4899' },
    'smoker_v1': { type: 'blunt', color: '#cbd5e1' }, // Smoke gray
    'garp_v1': { type: 'punch', color: '#94a3b8' },
    'sengoku_v1': { type: 'punch', color: '#eab308' }, // Gold
    'kizaru_v1': { type: 'projectile', color: '#facc15' }, // Light yellow
    'akainu_v1': { type: 'magmaFist', color: '#991b1b', secondaryColor: '#fb923c', particles: 20 },

    // === WARLORD ===
    'buggy_v1': { type: 'projectile', color: '#ef4444' },
    'moria_v1': { type: 'punch', color: '#7c3aed' },
    'crocodile_v1': { type: 'blunt', color: '#d97706' }, // Sand
    'kuma_v1': { type: 'punch', color: '#3b82f6' },
    'doflamingo_v1': { type: 'slash', color: '#f472b6' },
    'mihawk_v1': { type: 'slash', color: '#4ade80' }, // Lime slash
    'hancock_v1': { type: 'projectile', color: '#ec4899' },

    // === BEAST PIRATES ===
    'gifter_v1': { type: 'blunt', color: '#78350f' },
    'headliner_v1': { type: 'blunt', color: '#450a0a' },
    'ulti_v1': { type: 'punch', color: '#be185d' },
    'page_one_v1': { type: 'kick', color: '#4c1d95' },
    'sasaki_v1': { type: 'blunt', color: '#166534' },
    'whos_who_v1': { type: 'slash', color: '#b91c1c' },
    'queen_v1': { type: 'projectile', color: '#a855f7' },
    'king_v1': { type: 'slash', color: '#dc2626' },
    'kaido_v1': { type: 'blunt', color: '#1e3a8a' },

    // === BIG MOM PIRATES ===
    'chess_soldiers_v1': { type: 'slash', color: '#ef4444' },
    'prometheus_v1': { type: 'projectile', color: '#ea580c' },
    'perospero_v1': { type: 'projectile', color: '#f472b6' },
    'daifuku_v1': { type: 'punch', color: '#2563eb' },
    'cracker_v1': { type: 'slash', color: '#92400e' },
    'smoothie_v1': { type: 'slash', color: '#db2777' },
    'katakuri_v1': { type: 'blunt', color: '#701a75' },
    'big_mom_v1': { type: 'slash', color: '#f472b6' },

    // === REVOLUTIONARY ===
    'hack_v1': { type: 'punch', color: '#2563eb' },
    'koala_v1': { type: 'punch', color: '#fb7185' },
    'belo_betty_v1': { type: 'projectile', color: '#be123c' },
    'ivankov_v1': { type: 'punch', color: '#a855f7' },
    'sabo_v1': { type: 'punch', color: '#f97316' },
    'dragon_v1': { type: 'punch', color: '#059669' },

    // === WHITEBEARD PIRATES ===
    'thatch_v1': { type: 'slash', color: '#0d9488' },
    'jozu_v1': { type: 'punch', color: '#0ea5e9' },
    'vista_v1': { type: 'slash', color: '#7c3aed' },
    'ace_v1': { type: 'projectile', color: '#ea580c' },
    'marco_v1': { type: 'projectile', color: '#22d3ee' },
    'whitebeard_v1': { type: 'blunt', color: '#f8fafc', secondaryColor: '#93c5fd', particles: 20 },

    // === POKEMON ===
    'bulbasaur': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 12 },
    'ivysaur': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 12 },
    'venusaur': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 12 },
    'charmander': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'charmeleon': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'charizard': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'squirtle': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'wartortle': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'blastoise': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'caterpie': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 12 },
    'metapod': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 12 },
    'butterfree': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 12 },
    'weedle': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 12 },
    'kakuna': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 12 },
    'beedrill': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 12 },
    'pidgey': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'pidgeotto': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'pidgeot': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'rattata': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'raticate': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'spearow': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'fearow': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'nidoran_f': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'nidorina': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'nidoqueen': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'nidoran_m': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'nidorino': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'nidoking': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'oddish': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 12 },
    'gloom': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 12 },
    'vileplume': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 12 },
    'poliwag': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'poliwhirl': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'poliwrath': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'pikachu': { type: 'lightning', color: '#facc15', secondaryColor: '#fef08a', particles: 12 },
    'raichu': { type: 'lightning', color: '#facc15', secondaryColor: '#fef08a', particles: 12 },
    'sandshrew': { type: 'blunt', color: '#a16207', secondaryColor: '#fde68a', particles: 12 },
    'sandslash': { type: 'blunt', color: '#a16207', secondaryColor: '#fde68a', particles: 12 },
    'vulpix': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'ninetales': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'jigglypuff': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'wigglytuff': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 12 },
    'zubat': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'golbat': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'crobat': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 12 },
    'psyduck': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'golduck': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'mankey': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 12 },
    'primeape': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 12 },
    'annihilape': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 12 },
    'growlithe': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'arcanine': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'tentacool': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'tentacruel': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'geodude': { type: 'blunt', color: '#78716c', secondaryColor: '#e7e5e4', particles: 12 },
    'graveler': { type: 'blunt', color: '#78716c', secondaryColor: '#e7e5e4', particles: 12 },
    'golem': { type: 'blunt', color: '#78716c', secondaryColor: '#e7e5e4', particles: 12 },
    'ponyta': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'rapidash': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 12 },
    'slowpoke': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'slowbro': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 12 },
    'magnemite': { type: 'lightning', color: '#facc15', secondaryColor: '#fef08a', particles: 12 },
    'magneton': { type: 'lightning', color: '#facc15', secondaryColor: '#fef08a', particles: 12 },
    'magnezone': { type: 'lightning', color: '#facc15', secondaryColor: '#fef08a', particles: 12 },
    'abra': { type: 'projectile', color: '#a855f7', secondaryColor: '#f0abfc', particles: 16 },
    'kadabra': { type: 'projectile', color: '#a855f7', secondaryColor: '#f0abfc', particles: 16 },
    'alakazam': { type: 'projectile', color: '#a855f7', secondaryColor: '#f0abfc', particles: 16 },
    'machop': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 16 },
    'machoke': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 16 },
    'machamp': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 16 },
    'bellsprout': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 16 },
    'weepinbell': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 16 },
    'victreebel': { type: 'slash', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 16 },
    'doduo': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'dodrio': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'seel': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'dewgong': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'grimer': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 16 },
    'muk': { type: 'slash', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 16 },
    'shellder': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'cloyster': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'gastly': { type: 'projectile', color: '#4c1d95', secondaryColor: '#c4b5fd', particles: 16 },
    'haunter': { type: 'projectile', color: '#4c1d95', secondaryColor: '#c4b5fd', particles: 16 },
    'gengar': { type: 'projectile', color: '#4c1d95', secondaryColor: '#c4b5fd', particles: 16 },
    'krabby': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'kingler': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'horsea': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'seadra': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'kingdra': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'dratini': { type: 'projectile', color: '#6366f1', secondaryColor: '#c7d2fe', particles: 16 },
    'dragonair': { type: 'projectile', color: '#6366f1', secondaryColor: '#c7d2fe', particles: 16 },
    'dragonite': { type: 'projectile', color: '#6366f1', secondaryColor: '#c7d2fe', particles: 16 },
    'farfetchd': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'hitmonlee': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 16 },
    'hitmonchan': { type: 'punch', color: '#dc2626', secondaryColor: '#fecaca', particles: 16 },
    'kangaskhan': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'mr_mime': { type: 'projectile', color: '#a855f7', secondaryColor: '#f0abfc', particles: 16 },
    'pinsir': { type: 'slash', color: '#84cc16', secondaryColor: '#d9f99d', particles: 16 },
    'lapras': { type: 'waterShock', color: '#2563eb', secondaryColor: '#67e8f9', particles: 16 },
    'tauros': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'ditto': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'porygon': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'lickitung': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 },
    'jynx': { type: 'projectile', color: '#67e8f9', secondaryColor: '#f0f9ff', particles: 16 },
    'snorlax': { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 20 },
    'aerodactyl': { type: 'blunt', color: '#78716c', secondaryColor: '#e7e5e4', particles: 20 },
    'articuno': { type: 'projectile', color: '#67e8f9', secondaryColor: '#f0f9ff', particles: 20 },
    'zapdos': { type: 'lightning', color: '#facc15', secondaryColor: '#fef08a', particles: 20 },
    'moltres': { type: 'fireKick', color: '#f97316', secondaryColor: '#fef3c7', particles: 20 },
    'mewtwo': { type: 'projectile', color: '#a855f7', secondaryColor: '#f0abfc', particles: 20 },
    'mew': { type: 'projectile', color: '#a855f7', secondaryColor: '#f0abfc', particles: 20 },

    // Fallback for unknown units
    '_default': { type: 'punch', color: '#94a3b8' }
}

// Per-unit ability styling
export const ABILITY_ANIMATIONS: Record<string, AbilityAnimationConfig> = {
    // === STRAW HAT ===
    'luffy_v1': { color: '#ef4444', secondaryColor: '#fbbf24', effectStyle: 'LUFFY_GATLING', signature: 'Gum Gum Gatling', screenShake: 6, particleScale: 1.2 },
    'zoro_v1': { color: '#22c55e', secondaryColor: '#dcfce7', effectStyle: 'ZORO_ONIGIRI', signature: 'Oni Giri', screenShake: 5, particleScale: 1.15 },
    'nami_v1': { color: '#38bdf8', secondaryColor: '#fef08a', effectStyle: 'NAMI_LIGHTNING_TEMPO', signature: 'Lightning Tempo', screenShake: 3, particleScale: 1.05 },
    'usopp_v1': { color: '#f59e0b', secondaryColor: '#fef3c7', effectStyle: 'USOPP_EXPLOSIVE_STAR', signature: 'I Got This!', screenShake: 4, particleScale: 1.1 },
    'chopper_v1': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Doctor Heal', screenShake: 0, particleScale: 1.15 },
    'sanji_v1': { color: '#fbbf24', secondaryColor: '#f97316', effectStyle: 'SANJI_DIABLE_JAMBE', signature: 'Diable Jambe', screenShake: 4, particleScale: 1.1 },
    'robin_v1': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'ROBIN_ARM_FIELD', signature: 'Cien Fleur', screenShake: 2 },
    'franky_v1': { color: '#0ea5e9', secondaryColor: '#bae6fd', effectStyle: 'FRANKY_RADICAL_BEAM', signature: 'Radical Beam', screenShake: 4, particleScale: 1.1 },
    'brook_v1': { color: '#22d3ee', secondaryColor: '#e0f2fe', effectStyle: 'BROOK_SOUL_FREEZE', signature: 'Soul Solid', screenShake: 2 },
    'jinbei_v1': { color: '#1d4ed8', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Ocean Current Throw', screenShake: 4, particleScale: 1.1 },

    // === MARINE ===
    'koby_v1': { color: '#22c55e', secondaryColor: '#dcfce7', effectStyle: 'KOBY_DETERMINATION', signature: 'Determination', screenShake: 0, particleScale: 0.85 },
    'helmeppo_v1': { color: '#8b5cf6', secondaryColor: '#ddd6fe', effectStyle: 'WEAPON_BARRAGE', signature: 'Twin Kukri Rush', screenShake: 2 },
    'tashigi_v1': { color: '#6366f1', secondaryColor: '#c7d2fe', effectStyle: 'WEAPON_BARRAGE', signature: 'Marine Blade Draw', screenShake: 2 },
    'hina_v1': { color: '#ec4899', secondaryColor: '#fbcfe8', effectStyle: 'HINA_BINDING_CAGE', signature: 'Cage Cage', screenShake: 2 },
    'smoker_v1': { color: '#cbd5e1', secondaryColor: '#64748b', effectStyle: 'SMOKER_WHITE_OUT', signature: 'White Out', screenShake: 3 },
    'garp_v1': { color: '#f8fafc', secondaryColor: '#60a5fa', effectStyle: 'GARP_FIST_METEOR', signature: 'Galaxy Fist', screenShake: 8, particleScale: 1.35 },
    'sengoku_v1': { color: '#eab308', secondaryColor: '#fef3c7', effectStyle: 'SENGOKU_BUDDHA_SHOCK', signature: 'Buddha Shockwave', screenShake: 5, particleScale: 1.1 },
    'kizaru_v1': { color: '#facc15', secondaryColor: '#fef9c3', effectStyle: 'KIZARU_LIGHT_BEAM', signature: 'Yasakani Light', screenShake: 4, particleScale: 1.15 },
    'akainu_v1': { color: '#991b1b', secondaryColor: '#fb923c', effectStyle: 'AKAINU_MAGMA_RAIN', signature: 'Great Eruption', screenShake: 6, particleScale: 1.2 },

    // === WARLORD ===
    'buggy_v1': { color: '#ef4444', secondaryColor: '#60a5fa', effectStyle: 'BUGGY_CHOP_FESTIVAL', signature: 'Chop Chop Festival', screenShake: 3 },
    'moria_v1': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'MORIA_SHADOW_STEAL', signature: 'Shadow Steal', screenShake: 4 },
    'crocodile_v1': { color: '#d97706', secondaryColor: '#fde68a', effectStyle: 'CROCODILE_SANDSTORM', signature: 'Desert Spada', screenShake: 4 },
    'kuma_v1': { color: '#3b82f6', secondaryColor: '#bfdbfe', effectStyle: 'KUMA_URSUS_SHOCK', signature: 'Ursus Shock', screenShake: 5, particleScale: 1.1 },
    'doflamingo_v1': { color: '#f472b6', secondaryColor: '#fbcfe8', effectStyle: 'DOFLAMINGO_STRING_CAGE', signature: 'String Cage', screenShake: 4 },
    'mihawk_v1': { color: '#22c55e', secondaryColor: '#f8fafc', effectStyle: 'MIHAWK_BLACK_BLADE', signature: 'Black Blade Wave', screenShake: 5, particleScale: 1.15 },
    'hancock_v1': { color: '#ec4899', secondaryColor: '#f9a8d4', effectStyle: 'HANCOCK_LOVE_ARROW', signature: 'Love Arrow', screenShake: 3 },

    // === BEAST PIRATES ===
    'gifter_v1': { color: '#78350f', secondaryColor: '#f59e0b', effectStyle: 'BEAST_RUSH', signature: 'Beast Charge', screenShake: 3 },
    'headliner_v1': { color: '#450a0a', secondaryColor: '#f87171', effectStyle: 'BEAST_RUSH', signature: 'Headliner Stomp', screenShake: 3 },
    'ulti_v1': { color: '#be185d', secondaryColor: '#f9a8d4', effectStyle: 'BEAST_RUSH', signature: 'Meteor Headbutt', screenShake: 4 },
    'page_one_v1': { color: '#4c1d95', secondaryColor: '#c4b5fd', effectStyle: 'BEAST_RUSH', signature: 'Spinosaurus Rush', screenShake: 4 },
    'sasaki_v1': { color: '#166534', secondaryColor: '#86efac', effectStyle: 'BEAST_RUSH', signature: 'Armored Drill', screenShake: 4 },
    'whos_who_v1': { color: '#b91c1c', secondaryColor: '#fca5a5', effectStyle: 'WEAPON_BARRAGE', signature: 'Fang Pistol', screenShake: 3 },
    'queen_v1': { color: '#a855f7', secondaryColor: '#84cc16', effectStyle: 'QUEEN_PLAGUE_ROUND', signature: 'Plague Bullet', screenShake: 5 },
    'king_v1': { color: '#dc2626', secondaryColor: '#fb923c', effectStyle: 'KING_FLAME_SLASH', signature: 'Imperial Flame', screenShake: 5 },
    'kaido_v1': { color: '#1e3a8a', secondaryColor: '#a78bfa', effectStyle: 'KAIDO_THUNDER_BAGUA', signature: 'Thunder Bagua', screenShake: 9, particleScale: 1.45 },

    // === WHITEBEARD ===
    'thatch_v1': { color: '#0d9488', secondaryColor: '#5eead4', effectStyle: 'WEAPON_BARRAGE', signature: 'Chef Blade Flurry', screenShake: 2 },
    'jozu_v1': { color: '#0ea5e9', secondaryColor: '#e0f2fe', effectStyle: 'JOZU_DIAMOND_GUARD', signature: 'Diamond Defense', screenShake: 0, particleScale: 1.05 },
    'vista_v1': { color: '#7c3aed', secondaryColor: '#f0abfc', effectStyle: 'WEAPON_BARRAGE', signature: 'Rose Rondo', screenShake: 3 },
    'ace_v1': { color: '#ea580c', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Fire Fist', screenShake: 7, particleScale: 1.35 },
    'marco_v1': { color: '#22d3ee', secondaryColor: '#60a5fa', effectStyle: 'MARCO_PHOENIX_FLAME', signature: 'Phoenix Flames', screenShake: 0, particleScale: 1.2 },
    'whitebeard_v1': { color: '#f8fafc', secondaryColor: '#93c5fd', effectStyle: 'WHITEBEARD_QUAKE', signature: 'Marineford Quake', screenShake: 10, particleScale: 1.5 },

    // === BIG MOM ===
    'chess_soldiers_v1': { color: '#ef4444', secondaryColor: '#fca5a5', effectStyle: 'WEAPON_BARRAGE', signature: 'Chess Formation', screenShake: 2 },
    'prometheus_v1': { color: '#ea580c', secondaryColor: '#fde047', effectStyle: 'ACE_FIRE_FIST', signature: 'Solar Flare', screenShake: 4 },
    'perospero_v1': { color: '#22c55e', secondaryColor: '#f9a8d4', effectStyle: 'PEROSPERO_CANDY_SHOWER', signature: 'Candy Shower', screenShake: 0, particleScale: 1 },
    'daifuku_v1': { color: '#2563eb', secondaryColor: '#bfdbfe', effectStyle: 'WEAPON_BARRAGE', signature: 'Genie Slash', screenShake: 4 },
    'cracker_v1': { color: '#92400e', secondaryColor: '#fbbf24', effectStyle: 'WEAPON_BARRAGE', signature: 'Biscuit Legion', screenShake: 3 },
    'smoothie_v1': { color: '#db2777', secondaryColor: '#f9a8d4', effectStyle: 'SHADOW_DRAIN', signature: 'Juice Drain', screenShake: 3 },
    'katakuri_v1': { color: '#701a75', secondaryColor: '#f0abfc', effectStyle: 'KATAKURI_MOCHI_CRUSH', signature: 'Mochi Crush', screenShake: 5 },
    'big_mom_v1': { color: '#f472b6', secondaryColor: '#fef08a', effectStyle: 'BIG_MOM_SOUL_STORM', signature: 'Soul Storm', screenShake: 7, particleScale: 1.25 },

    // === REVOLUTIONARY ===
    'hack_v1': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Fishman Palm', screenShake: 3 },
    'koala_v1': { color: '#fb7185', secondaryColor: '#fecdd3', effectStyle: 'BEAST_RUSH', signature: 'Fishman Counter', screenShake: 3 },
    'belo_betty_v1': { color: '#be123c', secondaryColor: '#fda4af', effectStyle: 'AURA_COMMAND', signature: 'Rebel Flag', screenShake: 2 },
    'ivankov_v1': { color: '#22c55e', secondaryColor: '#f0abfc', effectStyle: 'IVANKOV_HORMONE_HEAL', signature: 'Healing Hormone', screenShake: 0, particleScale: 1.05 },
    'sabo_v1': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Dragon Claw Flame', screenShake: 5 },
    'dragon_v1': { color: '#059669', secondaryColor: '#a7f3d0', effectStyle: 'WIND_STORM', signature: 'Revolution Storm', screenShake: 6, particleScale: 1.15 },

    // === POKEMON ===
    'bulbasaur': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Vine Whip', screenShake: 2, particleScale: 1.0 },
    'ivysaur': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Razor Leaf', screenShake: 2, particleScale: 1.0 },
    'venusaur': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Solar Bloom', screenShake: 2, particleScale: 1.25 },
    'charmander': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Ember', screenShake: 2, particleScale: 1.0 },
    'charmeleon': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'charizard': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flamethrower', screenShake: 6, particleScale: 1.25 },
    'squirtle': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Gun', screenShake: 2, particleScale: 1.0 },
    'wartortle': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Shell Guard', screenShake: 2, particleScale: 1.0 },
    'blastoise': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Hydro Cannon', screenShake: 5, particleScale: 1.2 },
    'caterpie': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 2, particleScale: 1.0 },
    'metapod': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 2, particleScale: 1.0 },
    'butterfree': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 2, particleScale: 1.0 },
    'weedle': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 2, particleScale: 1.0 },
    'kakuna': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 2, particleScale: 1.0 },
    'beedrill': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 2, particleScale: 1.0 },
    'pidgey': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'pidgeotto': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'pidgeot': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'rattata': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'raticate': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'spearow': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'fearow': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'nidoran_f': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 2, particleScale: 1.0 },
    'nidorina': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 2, particleScale: 1.0 },
    'nidoqueen': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 2, particleScale: 1.0 },
    'nidoran_m': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 2, particleScale: 1.0 },
    'nidorino': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 2, particleScale: 1.0 },
    'nidoking': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 2, particleScale: 1.0 },
    'oddish': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Verdant Pulse', screenShake: 2, particleScale: 1.0 },
    'gloom': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Verdant Pulse', screenShake: 2, particleScale: 1.0 },
    'vileplume': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Verdant Pulse', screenShake: 2, particleScale: 1.0 },
    'poliwag': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'poliwhirl': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'poliwrath': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'pikachu': { color: '#facc15', secondaryColor: '#fef08a', effectStyle: 'NAMI_LIGHTNING_TEMPO', signature: 'Thunderbolt', screenShake: 2, particleScale: 1.0 },
    'raichu': { color: '#facc15', secondaryColor: '#fef08a', effectStyle: 'NAMI_LIGHTNING_TEMPO', signature: 'Thunder Surge', screenShake: 2, particleScale: 1.0 },
    'sandshrew': { color: '#a16207', secondaryColor: '#fde68a', effectStyle: 'QUAKE', signature: 'Earth Break', screenShake: 2, particleScale: 1.0 },
    'sandslash': { color: '#a16207', secondaryColor: '#fde68a', effectStyle: 'QUAKE', signature: 'Earth Break', screenShake: 2, particleScale: 1.0 },
    'vulpix': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'ninetales': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'jigglypuff': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'wigglytuff': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 2, particleScale: 1.0 },
    'zubat': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Leech Bite', screenShake: 2, particleScale: 1.0 },
    'golbat': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Poison Fang', screenShake: 2, particleScale: 1.0 },
    'crobat': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Cross Poison', screenShake: 4, particleScale: 1.15 },
    'psyduck': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'golduck': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'mankey': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 2, particleScale: 1.0 },
    'primeape': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 2, particleScale: 1.0 },
    'annihilape': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 2, particleScale: 1.0 },
    'growlithe': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'arcanine': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'tentacool': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'tentacruel': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'geodude': { color: '#78716c', secondaryColor: '#e7e5e4', effectStyle: 'QUAKE', signature: 'Stone Guard', screenShake: 2, particleScale: 1.0 },
    'graveler': { color: '#78716c', secondaryColor: '#e7e5e4', effectStyle: 'QUAKE', signature: 'Stone Guard', screenShake: 2, particleScale: 1.0 },
    'golem': { color: '#78716c', secondaryColor: '#e7e5e4', effectStyle: 'QUAKE', signature: 'Stone Guard', screenShake: 2, particleScale: 1.0 },
    'ponyta': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'rapidash': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Flame Burst', screenShake: 2, particleScale: 1.0 },
    'slowpoke': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'slowbro': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 2, particleScale: 1.0 },
    'magnemite': { color: '#facc15', secondaryColor: '#fef08a', effectStyle: 'NAMI_LIGHTNING_TEMPO', signature: 'Spark', screenShake: 2, particleScale: 1.0 },
    'magneton': { color: '#facc15', secondaryColor: '#fef08a', effectStyle: 'NAMI_LIGHTNING_TEMPO', signature: 'Tri Attack', screenShake: 2, particleScale: 1.0 },
    'magnezone': { color: '#facc15', secondaryColor: '#fef08a', effectStyle: 'JOZU_DIAMOND_GUARD', signature: 'Magnetic Field', screenShake: 3, particleScale: 1.15 },
    'abra': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'AURA_COMMAND', signature: 'Mind Lock', screenShake: 3, particleScale: 1.08 },
    'kadabra': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'AURA_COMMAND', signature: 'Mind Lock', screenShake: 3, particleScale: 1.08 },
    'alakazam': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'AURA_COMMAND', signature: 'Mind Lock', screenShake: 3, particleScale: 1.08 },
    'machop': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 3, particleScale: 1.08 },
    'machoke': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 3, particleScale: 1.08 },
    'machamp': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 3, particleScale: 1.08 },
    'bellsprout': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Verdant Pulse', screenShake: 3, particleScale: 1.08 },
    'weepinbell': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Verdant Pulse', screenShake: 3, particleScale: 1.08 },
    'victreebel': { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: 'CHOPPER_HEAL', signature: 'Verdant Pulse', screenShake: 3, particleScale: 1.08 },
    'doduo': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'dodrio': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'seel': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'dewgong': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'grimer': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 3, particleScale: 1.08 },
    'muk': { color: '#7c3aed', secondaryColor: '#c4b5fd', effectStyle: 'POISON_CLOUD', signature: 'Toxic Strike', screenShake: 3, particleScale: 1.08 },
    'shellder': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'cloyster': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'gastly': { color: '#4c1d95', secondaryColor: '#c4b5fd', effectStyle: 'SHADOW_DRAIN', signature: 'Shadow Burst', screenShake: 3, particleScale: 1.08 },
    'haunter': { color: '#4c1d95', secondaryColor: '#c4b5fd', effectStyle: 'SHADOW_DRAIN', signature: 'Shadow Burst', screenShake: 3, particleScale: 1.08 },
    'gengar': { color: '#4c1d95', secondaryColor: '#c4b5fd', effectStyle: 'SHADOW_DRAIN', signature: 'Shadow Burst', screenShake: 5, particleScale: 1.2 },
    'krabby': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'kingler': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'horsea': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Bubble Beam', screenShake: 3, particleScale: 1.08 },
    'seadra': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Hydro Pump', screenShake: 3, particleScale: 1.08 },
    'kingdra': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Dragon Current', screenShake: 5, particleScale: 1.18 },
    'dratini': { color: '#6366f1', secondaryColor: '#c7d2fe', effectStyle: 'KAIDO_DRAGON_ROAR', signature: 'Dragon Breath', screenShake: 3, particleScale: 1.08 },
    'dragonair': { color: '#6366f1', secondaryColor: '#c7d2fe', effectStyle: 'KAIDO_DRAGON_ROAR', signature: 'Aqua Tail', screenShake: 3, particleScale: 1.08 },
    'dragonite': { color: '#6366f1', secondaryColor: '#c7d2fe', effectStyle: 'KAIDO_DRAGON_ROAR', signature: 'Hyper Beam', screenShake: 8, particleScale: 1.35 },
    'farfetchd': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'hitmonlee': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 3, particleScale: 1.08 },
    'hitmonchan': { color: '#dc2626', secondaryColor: '#fecaca', effectStyle: 'BEAST_RUSH', signature: 'Power Blow', screenShake: 3, particleScale: 1.08 },
    'kangaskhan': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'mr_mime': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'AURA_COMMAND', signature: 'Mind Lock', screenShake: 3, particleScale: 1.08 },
    'pinsir': { color: '#84cc16', secondaryColor: '#d9f99d', effectStyle: 'WEAPON_BARRAGE', signature: 'Swarm Sting', screenShake: 3, particleScale: 1.08 },
    'lapras': { color: '#2563eb', secondaryColor: '#67e8f9', effectStyle: 'JINBEI_WATER_SURGE', signature: 'Water Surge', screenShake: 3, particleScale: 1.08 },
    'tauros': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'ditto': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'porygon': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'lickitung': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'AURA_COMMAND', signature: 'Rally Cry', screenShake: 3, particleScale: 1.08 },
    'jynx': { color: '#67e8f9', secondaryColor: '#f0f9ff', effectStyle: 'BROOK_SOUL_FREEZE', signature: 'Frost Field', screenShake: 3, particleScale: 1.08 },
    'snorlax': { color: '#a8a29e', secondaryColor: '#fafaf9', effectStyle: 'JOZU_DIAMOND_GUARD', signature: 'Resting Wall', screenShake: 3, particleScale: 1.2 },
    'aerodactyl': { color: '#78716c', secondaryColor: '#e7e5e4', effectStyle: 'WIND_STORM', signature: 'Ancient Dive', screenShake: 6, particleScale: 1.25 },
    'articuno': { color: '#67e8f9', secondaryColor: '#f0f9ff', effectStyle: 'BROOK_SOUL_FREEZE', signature: 'Blizzard', screenShake: 6, particleScale: 1.3 },
    'zapdos': { color: '#facc15', secondaryColor: '#fef08a', effectStyle: 'NAMI_LIGHTNING_TEMPO', signature: 'Thunderstorm', screenShake: 7, particleScale: 1.35 },
    'moltres': { color: '#f97316', secondaryColor: '#fef3c7', effectStyle: 'ACE_FIRE_FIST', signature: 'Inferno Wing', screenShake: 7, particleScale: 1.35 },
    'mewtwo': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'AURA_COMMAND', signature: 'Psystrike', screenShake: 8, particleScale: 1.4 },
    'mew': { color: '#a855f7', secondaryColor: '#f0abfc', effectStyle: 'MARCO_PHOENIX_FLAME', signature: 'Ancient Blessing', screenShake: 1, particleScale: 1.3 },

    // Fallback
    '_default': { color: '#fbbf24' }
}

const POKEMON_ATTACK_BY_STYLE: Record<string, AttackAnimationConfig> = {
    grass: { type: 'leafCut', color: '#22c55e', secondaryColor: '#bbf7d0', particles: 18 },
    fire: { type: 'flameBurst', color: '#f97316', secondaryColor: '#fef3c7', particles: 20 },
    water: { type: 'aquaJet', color: '#2563eb', secondaryColor: '#67e8f9', particles: 20 },
    electric: { type: 'thunderJolt', color: '#facc15', secondaryColor: '#fef08a', particles: 22 },
    psychic: { type: 'psyPulse', color: '#a855f7', secondaryColor: '#f0abfc', particles: 20 },
    poison: { type: 'poisonSting', color: '#7c3aed', secondaryColor: '#c4b5fd', particles: 18 },
    ground: { type: 'stoneToss', color: '#a16207', secondaryColor: '#fde68a', particles: 16 },
    rock: { type: 'stoneToss', color: '#78716c', secondaryColor: '#e7e5e4', particles: 18 },
    flying: { type: 'windGust', color: '#94a3b8', secondaryColor: '#f8fafc', particles: 18 },
    ice: { type: 'iceShard', color: '#67e8f9', secondaryColor: '#f0f9ff', particles: 20 },
    ghost: { type: 'shadowOrb', color: '#4c1d95', secondaryColor: '#c4b5fd', particles: 20 },
    bug: { type: 'bugBite', color: '#84cc16', secondaryColor: '#d9f99d', particles: 18 },
    fighting: { type: 'forcePalm', color: '#dc2626', secondaryColor: '#fecaca', particles: 20 },
    dragon: { type: 'dragonSpark', color: '#6366f1', secondaryColor: '#c7d2fe', particles: 22 },
    steel: { type: 'metalSpark', color: '#94a3b8', secondaryColor: '#e2e8f0', particles: 18 },
    dark: { type: 'shadowOrb', color: '#5b21b6', secondaryColor: '#be123c', particles: 18 },
    normal: { type: 'punch', color: '#a8a29e', secondaryColor: '#fafaf9', particles: 16 }
}

const POKEMON_STYLE_BY_ID: Record<string, keyof typeof POKEMON_ATTACK_BY_STYLE> = {
    bulbasaur: 'grass', ivysaur: 'grass', venusaur: 'grass', oddish: 'grass', gloom: 'grass', vileplume: 'grass', bellsprout: 'grass', weepinbell: 'grass', victreebel: 'grass',
    charmander: 'fire', charmeleon: 'fire', charizard: 'fire', vulpix: 'fire', ninetales: 'fire', growlithe: 'fire', arcanine: 'fire', ponyta: 'fire', rapidash: 'fire', moltres: 'fire',
    squirtle: 'water', wartortle: 'water', blastoise: 'water', poliwag: 'water', poliwhirl: 'water', poliwrath: 'water', psyduck: 'water', golduck: 'water', tentacool: 'water', tentacruel: 'water', seel: 'water', dewgong: 'water', shellder: 'water', cloyster: 'water', krabby: 'water', kingler: 'water', horsea: 'water', seadra: 'water', kingdra: 'water', lapras: 'water', slowpoke: 'water', slowbro: 'water',
    pikachu: 'electric', raichu: 'electric', magnemite: 'electric', magneton: 'electric', magnezone: 'electric', zapdos: 'electric',
    abra: 'psychic', kadabra: 'psychic', alakazam: 'psychic', mr_mime: 'psychic', mewtwo: 'psychic', mew: 'psychic',
    nidoran_f: 'poison', nidorina: 'poison', nidoqueen: 'poison', nidoran_m: 'poison', nidorino: 'poison', nidoking: 'poison', zubat: 'poison', golbat: 'poison', crobat: 'poison', grimer: 'poison', muk: 'poison',
    sandshrew: 'ground', sandslash: 'ground',
    geodude: 'rock', graveler: 'rock', golem: 'rock', aerodactyl: 'rock',
    pidgey: 'flying', pidgeotto: 'flying', pidgeot: 'flying', spearow: 'flying', fearow: 'flying', doduo: 'flying', dodrio: 'flying', farfetchd: 'flying',
    jynx: 'ice', articuno: 'ice',
    gastly: 'ghost', haunter: 'ghost', gengar: 'ghost',
    caterpie: 'bug', metapod: 'bug', butterfree: 'bug', weedle: 'bug', kakuna: 'bug', beedrill: 'bug', pinsir: 'bug',
    mankey: 'fighting', primeape: 'fighting', annihilape: 'fighting', machop: 'fighting', machoke: 'fighting', machamp: 'fighting', hitmonlee: 'fighting', hitmonchan: 'fighting',
    dratini: 'dragon', dragonair: 'dragon', dragonite: 'dragon',
    porygon: 'steel',
    rattata: 'normal', raticate: 'normal', jigglypuff: 'normal', wigglytuff: 'normal', kangaskhan: 'normal', tauros: 'normal', ditto: 'normal', lickitung: 'normal', snorlax: 'normal',
    // Gen 2/3 Unown letters share Psychic as their first trait, so each letter's Hidden Power element is explicit.
    unown_a: 'flying', unown_b: 'bug', unown_c: 'ice', unown_d: 'dragon', unown_e: 'electric', unown_f: 'fire', unown_g: 'grass',
    unown_h: 'ghost', unown_i: 'ice', unown_j: 'fighting', unown_k: 'fighting', unown_l: 'grass', unown_m: 'steel', unown_n: 'normal',
    unown_o: 'rock', unown_p: 'poison', unown_q: 'ground', unown_r: 'rock', unown_s: 'steel', unown_t: 'ground', unown_u: 'dark',
    unown_v: 'poison', unown_w: 'water', unown_x: 'dragon', unown_y: 'flying', unown_z: 'electric',
    unown_question: 'psychic', unown_exclamation: 'psychic'
}

const POKEMON_ULTIMATE_STYLE_BY_ATTACK_STYLE: Record<keyof typeof POKEMON_ATTACK_BY_STYLE, AbilityEffectStyle> = {
    grass: 'POKEMON_GRASS_BLOOM',
    fire: 'POKEMON_FIRE_STREAM',
    water: 'POKEMON_WATER_CANNON',
    electric: 'POKEMON_ELECTRIC_STORM',
    psychic: 'POKEMON_PSYCHIC_WAVE',
    poison: 'POKEMON_POISON_BURST',
    ground: 'POKEMON_EARTH_SPIKES',
    rock: 'POKEMON_EARTH_SPIKES',
    flying: 'POKEMON_FLYING_GUST',
    ice: 'POKEMON_ICE_CRYSTAL',
    ghost: 'POKEMON_GHOST_NIGHTMARE',
    bug: 'POKEMON_BUG_SWARM',
    fighting: 'POKEMON_FIGHTING_COMBO',
    dragon: 'POKEMON_DRAGON_BEAM',
    steel: 'POKEMON_STEEL_FIELD',
    dark: 'POKEMON_DARK_CRESCENT',
    normal: 'POKEMON_NORMAL_RALLY'
}

const EMPHASIZED_POKEMON = new Set([
    'charizard', 'blastoise', 'venusaur', 'dragonite', 'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'snorlax', 'gengar', 'alakazam',
    'lugia', 'ho_oh', 'raikou', 'entei', 'suicune', 'kyogre', 'groudon', 'rayquaza', 'latios', 'tyranitar', 'metagross', 'salamence'
])

// Lookup order: explicit id map (Gen 1 and Unown letters), then the per-unit tables (One Piece and hand-tuned units), then the first
// trait that names a Pokemon type, so new Pokemon modes get type styling without per-id entries.
export function resolvePokemonStyle(definitionId: string, traits: readonly string[] = []): string | undefined {
    const explicit = POKEMON_STYLE_BY_ID[definitionId]
    if (explicit) return explicit
    if (Object.hasOwn(ATTACK_ANIMATIONS, definitionId) || Object.hasOwn(ABILITY_ANIMATIONS, definitionId)) return undefined
    return traits.map((trait) => trait.toLowerCase()).find((trait) => Object.hasOwn(POKEMON_ATTACK_BY_STYLE, trait))
}

export function getAttackConfig(definitionId: string, traits: readonly string[] = []): AttackAnimationConfig {
    const pokemonStyle = resolvePokemonStyle(definitionId, traits)
    if (pokemonStyle) return POKEMON_ATTACK_BY_STYLE[pokemonStyle]
    return ATTACK_ANIMATIONS[definitionId] ?? ATTACK_ANIMATIONS['_default']
}

export function getAbilityConfig(definitionId: string, traits: readonly string[] = []): AbilityAnimationConfig {
    const pokemonStyle = resolvePokemonStyle(definitionId, traits)
    const explicit = ABILITY_ANIMATIONS[definitionId]
    if (!pokemonStyle) return explicit ?? ABILITY_ANIMATIONS['_default']

    const palette = POKEMON_ATTACK_BY_STYLE[pokemonStyle]
    const baseConfig: AbilityAnimationConfig = explicit ?? { color: palette.color, secondaryColor: palette.secondaryColor }
    const emphasis = EMPHASIZED_POKEMON.has(definitionId) ? 1.22 : 1.08

    return {
        ...baseConfig,
        signature: undefined,
        effectStyle: POKEMON_ULTIMATE_STYLE_BY_ATTACK_STYLE[pokemonStyle],
        screenShake: Math.max(baseConfig.screenShake ?? 0, pokemonStyle === 'normal' || pokemonStyle === 'psychic' ? 2 : 4),
        particleScale: (baseConfig.particleScale ?? 1) * emphasis
    }
}
