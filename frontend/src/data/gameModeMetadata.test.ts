import { describe, expect, it } from 'vitest'
import {
    allGameModes,
    getGameModeMetadata,
    isGameMode,
    parseGalleryModeHash,
    sortGameModes,
} from './gameModeMetadata'

describe('game mode metadata', () => {
    it('describes every mode in lobby order', () => {
        expect(sortGameModes(['pokemongen23', 'pokemon', 'onepiece'])).toEqual(['onepiece', 'pokemon', 'pokemongen23'])
        expect(getGameModeMetadata('onepiece')).toMatchObject({
            label: 'One Piece',
            lobbyCaption: 'Set sail with legendary pirates',
            documentTitle: 'Theme Fusion Tactics — One Piece',
            favicon: '/favicon.svg',
            unitAssetFolder: 'onepiece',
            themeClass: 'theme-onepiece',
            galleryPath: '#/ultimate-gallery/onepiece',
            order: 1,
        })
        expect(getGameModeMetadata('pokemon')).toMatchObject({
            label: 'Pokemon',
            lobbyCaption: 'Build a team of iconic trainers',
            documentTitle: 'Theme Fusion Tactics — Pokemon',
            favicon: '/pokeball.png',
            unitAssetFolder: 'pokemon',
            themeClass: 'theme-pokemon',
            galleryPath: '#/ultimate-gallery/pokemon',
            order: 2,
        })
        expect(getGameModeMetadata('pokemongen23')).toMatchObject({
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
        })
    })

    it('lists every supported mode in lobby order', () => {
        expect(allGameModes()).toEqual(['onepiece', 'pokemon', 'pokemongen23'])
        expect(allGameModes().every(isGameMode)).toBe(true)
        expect(isGameMode('retired-mode')).toBe(false)
    })

    it('accepts only exact gallery routes for supported modes', () => {
        expect(parseGalleryModeHash('#/ultimate-gallery/onepiece')).toBe('onepiece')
        expect(parseGalleryModeHash('#/ultimate-gallery/pokemon')).toBe('pokemon')
        expect(parseGalleryModeHash('#/ultimate-gallery/pokemongen23')).toBe('pokemongen23')
        expect(parseGalleryModeHash('#/ultimate-gallery/retired-mode')).toBeNull()
        expect(parseGalleryModeHash('#/ultimate-gallery/unknown')).toBeNull()
        expect(parseGalleryModeHash('#/ultimate-gallery/pokemon/extra')).toBeNull()
        expect(parseGalleryModeHash('#/ultimate-gallery')).toBeNull()
    })
})
