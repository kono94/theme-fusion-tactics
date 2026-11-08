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
})
