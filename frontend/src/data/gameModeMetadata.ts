import type { GameMode } from '../types'

export interface GameModeMetadata {
    id: GameMode
    label: string
    shortLabel: string
    lobbyCaption: string
    documentTitle: string
    favicon: string
    unitAssetFolder: string
    themeClass: string
    galleryPath: string
    arenas: string[]
    order: number
}

export const GAME_MODE_METADATA: Record<GameMode, GameModeMetadata> = {
    onepiece: {
        id: 'onepiece',
        label: 'One Piece',
        shortLabel: 'One Piece',
        lobbyCaption: 'Set sail with legendary pirates',
        documentTitle: 'Theme Fusion Tactics — One Piece',
        favicon: '/favicon.svg',
        unitAssetFolder: 'onepiece',
        themeClass: 'theme-onepiece',
        galleryPath: '#/ultimate-gallery/onepiece',
        arenas: ['foosha', 'baratie', 'sabaody', 'marineford', 'wano'],
        order: 1,
    },
    pokemon: {
        id: 'pokemon',
        label: 'Pokemon',
        shortLabel: 'Pokemon',
        lobbyCaption: 'Build a team of iconic trainers',
        documentTitle: 'Theme Fusion Tactics — Pokemon',
        favicon: '/pokeball.png',
        unitAssetFolder: 'pokemon',
        themeClass: 'theme-pokemon',
        galleryPath: '#/ultimate-gallery/pokemon',
        arenas: ['stadium', 'rock-gym'],
        order: 2,
    },
    pokemongen23: {
        id: 'pokemongen23',
        label: 'Pokemon Gen 2/3',
        shortLabel: 'Gen 2/3',
        lobbyCaption: 'Johto & Hoenn: weather, held items and branching evolutions',
        documentTitle: 'Theme Fusion Tactics — Pokemon Gen 2/3',
        favicon: '/pokeball.png',
        unitAssetFolder: 'pokemongen23',
        themeClass: 'theme-pokemongen23',
        galleryPath: '#/ultimate-gallery/pokemongen23',
        arenas: ['stadium', 'rock-gym'],
        order: 3,
    },
}

const SUPPORTED_GAME_MODES = Object.keys(GAME_MODE_METADATA) as GameMode[]

export function isGameMode(value: unknown): value is GameMode {
    return typeof value === 'string' && SUPPORTED_GAME_MODES.includes(value as GameMode)
}

export function getGameModeMetadata(mode: GameMode): GameModeMetadata {
    return GAME_MODE_METADATA[mode]
}

export function sortGameModes(modes: readonly GameMode[]): GameMode[] {
    return [...new Set(modes)].sort((left, right) =>
        getGameModeMetadata(left).order - getGameModeMetadata(right).order,
    )
}

export function allGameModes(): GameMode[] {
    return sortGameModes(SUPPORTED_GAME_MODES)
}

export function parseGalleryModeHash(hash: string): GameMode | null {
    const match = hash.match(/^#\/ultimate-gallery\/([^/?#]+)$/)
    const mode = match?.[1]
    return isGameMode(mode) ? mode : null
}
