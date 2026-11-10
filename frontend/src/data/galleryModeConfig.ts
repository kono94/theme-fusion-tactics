import onePieceUnits from '../../../backend/src/main/resources/data/units_onepiece.json'
import pokemonUnits from '../../../backend/src/main/resources/data/units_pokemon.json'
import pokemonGen23Units from '../../../backend/src/main/resources/data/units_pokemongen23.json'
import type { GameMode } from '../types'
import {
    buildPokemonGalleryRoster,
    POKEMON_ULTIMATE_GALLERY_ROSTER,
    type RawPokemonUnit,
} from './pokemonUltimateGalleryRoster'
import { ULTIMATE_GALLERY_ROSTER, type UltimateGalleryUnit } from './ultimateGalleryRoster'

export interface GalleryRangeUnit {
    id: string
    range: number[]
    forms?: { definitionId: string }[]
    variants?: { id: string }[]
}

export interface GalleryBoardTheme {
    boardBorder: string
    boardBackground: string
    shellBorder: string
    shellShadow: string
    activeCardBorder: string
    activeCardBackground: string
}

export interface GalleryModeConfig {
    pageTitle: string
    roster: UltimateGalleryUnit[]
    units: readonly GalleryRangeUnit[]
    defaultUnitId: string
    trainingTargetId: string
    allyPreviewId: string
    bystanderIds: readonly [string, string, string]
    boardTheme: GalleryBoardTheme | null
}

export const GALLERY_MODE_CONFIG: Record<GameMode, GalleryModeConfig> = {
    onepiece: {
        pageTitle: 'Ultimate Gallery',
        roster: ULTIMATE_GALLERY_ROSTER,
        units: onePieceUnits,
        defaultUnitId: 'whitebeard_v1',
        trainingTargetId: 'kaido_v1',
        allyPreviewId: 'luffy_v1',
        bystanderIds: ['gifter_v1', 'chess_soldiers_v1', 'koby_v1'],
        boardTheme: null,
    },
    pokemon: {
        pageTitle: 'Pokemon Animation Lab',
        roster: POKEMON_ULTIMATE_GALLERY_ROSTER,
        units: pokemonUnits,
        defaultUnitId: 'pikachu',
        trainingTargetId: 'snorlax',
        allyPreviewId: 'bulbasaur',
        bystanderIds: ['geodude', 'rattata', 'squirtle'],
        boardTheme: {
            boardBorder: '#2f5f58',
            boardBackground: [
                'radial-gradient(circle at 28% 72%, rgba(34, 197, 94, 0.16), transparent 28%)',
                'radial-gradient(circle at 74% 28%, rgba(248, 113, 113, 0.12), transparent 24%)',
                'linear-gradient(180deg, rgba(34, 72, 66, 0.7) 0 50%, rgba(32, 43, 58, 0.94) 50% 100%)',
            ].join(', '),
            shellBorder: '#24554d',
            shellShadow: 'inset 0 0 42px rgba(45, 212, 191, 0.14)',
            activeCardBorder: '#facc15',
            activeCardBackground: '#14532d',
        },
    },
    pokemongen23: {
        pageTitle: 'Pokemon Gen 2/3 Animation Lab',
        roster: buildPokemonGalleryRoster(pokemonGen23Units as RawPokemonUnit[]),
        units: pokemonGen23Units,
        defaultUnitId: 'typhlosion',
        trainingTargetId: 'steelix',
        allyPreviewId: 'chikorita',
        bystanderIds: ['aron', 'zigzagoon', 'mudkip'],
        boardTheme: {
            boardBorder: '#1f5f57',
            boardBackground: [
                'radial-gradient(circle at 26% 70%, rgba(45, 212, 191, 0.16), transparent 28%)',
                'radial-gradient(circle at 76% 26%, rgba(250, 204, 21, 0.12), transparent 24%)',
                'linear-gradient(180deg, rgba(15, 70, 64, 0.72) 0 50%, rgba(18, 38, 52, 0.94) 50% 100%)',
            ].join(', '),
            shellBorder: '#1d5a52',
            shellShadow: 'inset 0 0 42px rgba(45, 212, 191, 0.14)',
            activeCardBorder: '#facc15',
            activeCardBackground: '#0f3f3a',
        },
    },
}

export function getGalleryModeConfig(mode: GameMode): GalleryModeConfig {
    return GALLERY_MODE_CONFIG[mode]
}

export function buildGalleryUnitRanges(configs: readonly GalleryModeConfig[]): Map<string, number> {
    return new Map<string, number>(
        configs.flatMap((config) =>
            config.units.flatMap((unit) => [
                [unit.id, unit.range[0]] as const,
                ...(unit.forms ?? []).map((form) => [form.definitionId, unit.range[0]] as const),
                ...(unit.variants ?? []).map((variant) => [variant.id, unit.range[0]] as const),
            ]),
        ),
    )
}
