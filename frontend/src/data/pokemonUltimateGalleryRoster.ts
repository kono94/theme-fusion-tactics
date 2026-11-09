import pokemonUnits from '../../../backend/src/main/resources/data/units_pokemon.json'
import type { AbilityDefinition } from '../types'
import type { UltimateGalleryUnit } from './ultimateGalleryRoster'

export interface RawPokemonForm {
    starLevel: number
    definitionId: string
    name: string
    traits?: string[]
    ability?: AbilityDefinition | null
}

export interface RawPokemonUnit {
    id: string
    name: string
    cost: number
    traits?: string[]
    ability?: AbilityDefinition | null
    forms?: RawPokemonForm[]
}

function toGalleryUnit(
    unit: RawPokemonUnit,
    id: string,
    name: string,
    ability: AbilityDefinition | null | undefined,
    traits: string[] | undefined,
): UltimateGalleryUnit {
    return {
        id,
        name,
        cost: unit.cost,
        traits: traits ?? unit.traits,
        abilityType: ability?.type ?? 'DAMAGE',
        pattern: ability?.pattern ?? 'SINGLE',
        abilityName: ability?.name ?? 'Preview'
    }
}

export function buildPokemonGalleryRoster(units: readonly RawPokemonUnit[]): UltimateGalleryUnit[] {
    return units.flatMap((unit) => {
        const seen = new Set<string>()
        const entries: UltimateGalleryUnit[] = []

        entries.push(toGalleryUnit(unit, unit.id, unit.name, unit.ability, unit.traits))
        seen.add(`${unit.id}:${unit.ability?.name ?? 'Preview'}`)

        for (const form of unit.forms ?? []) {
            const key = `${form.definitionId}:${form.ability?.name ?? unit.ability?.name ?? 'Preview'}`
            if (seen.has(key)) continue
            entries.push(toGalleryUnit(unit, form.definitionId, form.name, form.ability ?? unit.ability, form.traits))
            seen.add(key)
        }

        return entries
    })
}

export const POKEMON_ULTIMATE_GALLERY_ROSTER: UltimateGalleryUnit[] = buildPokemonGalleryRoster(
    pokemonUnits as RawPokemonUnit[],
)
