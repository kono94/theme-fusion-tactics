import { describe, expect, it } from 'vitest'
import { getAbilityConfig, getAttackConfig, resolvePokemonStyle } from '../data/animationConfig'
import { resolveAbilityConfig, resolveAttackConfig } from './combatAnimationConfig'

describe('live combat animation config', () => {
    it('resolves both supported modes through shared definition lookups', () => {
        const onePieceUnit = { definitionId: 'luffy_v1', traits: [] }
        const pokemonUnit = { definitionId: 'pikachu', traits: ['electric'] }

        expect(resolveAttackConfig(onePieceUnit).diagnostic).not.toBe(true)
        expect(resolveAbilityConfig(onePieceUnit).diagnostic).not.toBe(true)
        expect(resolveAttackConfig(pokemonUnit).diagnostic).not.toBe(true)
        expect(resolveAbilityConfig(pokemonUnit).diagnostic).not.toBe(true)
    })

    it('resolves the explicit id map before tables and traits', () => {
        expect(resolvePokemonStyle('porygon', ['Normal'])).toBe('steel')
        expect(resolvePokemonStyle('luffy_v1', ['Fire'])).toBeUndefined()
        expect(resolvePokemonStyle('typhlosion', ['Fire'])).toBe('fire')
        expect(resolvePokemonStyle('combusken', ['Fire', 'Fighting'])).toBe('fire')
        expect(resolvePokemonStyle('unknown_unit', ['Pirate', 'Dark'])).toBe('dark')
        expect(resolvePokemonStyle('unknown_unit', ['Pirate'])).toBeUndefined()
        expect(resolvePokemonStyle('unknown_unit', ['constructor'])).toBeUndefined()
    })

    it('styles new-mode Pokemon from their traits', () => {
        const typhlosion = { definitionId: 'typhlosion', traits: ['Fire'] }
        expect(resolveAttackConfig(typhlosion)).toMatchObject({ type: 'flameBurst', color: '#f97316' })
        expect(resolveAbilityConfig(typhlosion)).toMatchObject({
            color: '#f97316',
            secondaryColor: '#fef3c7',
            effectStyle: 'POKEMON_FIRE_STREAM',
            screenShake: 4,
        })

        const weavile = { definitionId: 'weavile', traits: ['Dark', 'Ice'] }
        expect(resolveAttackConfig(weavile).type).toBe('shadowOrb')
        expect(resolveAbilityConfig(weavile).effectStyle).toBe('POKEMON_DARK_CRESCENT')
        expect(resolveAbilityConfig({ definitionId: 'lugia', traits: ['Psychic', 'Flying'] }).particleScale).toBeCloseTo(1.22)
    })

    it('keeps Gen 1 and One Piece results unchanged', () => {
        expect(getAttackConfig('luffy_v1', ['Straw Hat'])).toBe(getAttackConfig('luffy_v1'))
        expect(getAbilityConfig('luffy_v1', ['Straw Hat'])).toMatchObject({ effectStyle: 'LUFFY_GATLING', signature: 'Gum Gum Gatling' })
        expect(getAttackConfig('pikachu', ['Electric'])).toEqual(getAttackConfig('pikachu'))
        expect(getAbilityConfig('gengar', ['Ghost'])).toEqual({
            color: '#4c1d95',
            secondaryColor: '#c4b5fd',
            effectStyle: 'POKEMON_GHOST_NIGHTMARE',
            signature: undefined,
            screenShake: 5,
            particleScale: 1.2 * 1.22,
        })
        expect(getAbilityConfig('unknown_unit')).toEqual({ color: '#fbbf24' })
    })
})
