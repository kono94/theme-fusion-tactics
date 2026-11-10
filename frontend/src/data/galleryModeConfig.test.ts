import { describe, expect, it } from 'vitest'
import { allGameModes } from './gameModeMetadata'
import { buildGalleryUnitRanges, GALLERY_MODE_CONFIG, getGalleryModeConfig } from './galleryModeConfig'
import { buildPokemonGalleryRoster, type RawPokemonUnit } from './pokemonUltimateGalleryRoster'

describe('gallery mode config', () => {
    it('configures every game mode with units that exist in its data', () => {
        for (const mode of allGameModes()) {
            const config = getGalleryModeConfig(mode)
            const unitIds = new Set(
                config.units.flatMap((unit) => [unit.id, ...(unit.forms ?? []).map((form) => form.definitionId)]),
            )

            expect(config.roster.some((unit) => unit.id === config.defaultUnitId)).toBe(true)
            expect(unitIds.has(config.trainingTargetId)).toBe(true)
            expect(unitIds.has(config.allyPreviewId)).toBe(true)
            config.bystanderIds.forEach((id) => expect(unitIds.has(id)).toBe(true))
        }
    })

    it('maps base units and their forms to the base attack range', () => {
        const ranges = buildGalleryUnitRanges([
            {
                ...GALLERY_MODE_CONFIG.pokemon,
                units: [{ id: 'charmander', range: [2, 2, 2], forms: [{ definitionId: 'charizard' }] }],
            },
        ])

        expect(ranges.get('charmander')).toBe(2)
        expect(ranges.get('charizard')).toBe(2)
    })

    it('maps variant ids to the template attack range', () => {
        const ranges = buildGalleryUnitRanges([
            {
                ...GALLERY_MODE_CONFIG.pokemongen23,
                units: [{ id: 'glyph', range: [3, 3, 3], variants: [{ id: 'glyph_a' }, { id: 'glyph_b' }] }],
            },
        ])

        expect(ranges.get('glyph_a')).toBe(3)
        expect(ranges.get('glyph_b')).toBe(3)
    })
})

describe('buildPokemonGalleryRoster', () => {
    it('adds forms with a distinct ability and skips forms that repeat the base ability', () => {
        const blast = { name: 'Blast', description: '', type: 'DAMAGE', pattern: 'LINE', range: [1, 1, 1], values: [1, 2, 3] }
        const units = [
            {
                id: 'starter',
                name: 'Starter',
                cost: 1,
                ability: blast,
                forms: [
                    { starLevel: 1, definitionId: 'starter', name: 'Starter' },
                    { starLevel: 2, definitionId: 'evolved', name: 'Evolved', ability: { ...blast, name: 'Mega Blast' } },
                ],
            },
        ] as RawPokemonUnit[]

        expect(buildPokemonGalleryRoster(units)).toEqual([
            { id: 'starter', name: 'Starter', cost: 1, abilityType: 'DAMAGE', pattern: 'LINE', abilityName: 'Blast' },
            { id: 'evolved', name: 'Evolved', cost: 1, abilityType: 'DAMAGE', pattern: 'LINE', abilityName: 'Mega Blast' },
        ])
    })

    it('lists one variant per ability type and pattern instead of the template or every variant', () => {
        const power = { name: 'Power', description: '', type: 'DAMAGE', pattern: 'SINGLE', range: [3, 3, 3], values: [1, 2, 3] }
        const units = [
            {
                id: 'glyph',
                name: 'Glyph',
                cost: 2,
                traits: ['Psychic'],
                ability: power,
                variants: [
                    { id: 'glyph_a', name: 'Glyph A', traits: ['Psychic', 'Fire'], ability: power },
                    { id: 'glyph_b', name: 'Glyph B', traits: ['Psychic', 'Water'], ability: power },
                    { id: 'glyph_c', name: 'Glyph C', traits: ['Psychic', 'Grass'], ability: { ...power, type: 'HEAL' } },
                ],
            },
        ] as RawPokemonUnit[]

        expect(buildPokemonGalleryRoster(units).map((unit) => unit.id)).toEqual(['glyph_a', 'glyph_c'])
    })
})
