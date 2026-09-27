import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FinalCompositionStrip from '../FinalCompositionStrip.vue'

describe('FinalCompositionStrip', () => {
    it('distinguishes unavailable and captured-empty boards', () => {
        const unavailable = mount(FinalCompositionStrip, {
            props: { mode: 'pokemon', composition: null },
        })
        expect(unavailable.text()).toContain('unavailable')

        const empty = mount(FinalCompositionStrip, {
            props: { mode: 'pokemon', composition: [] },
        })
        expect(empty.text()).toContain('Captured empty board')
    })

    it.each([
        ['onepiece', '/assets/units/onepiece/test-unit.png'],
        ['pokemon', '/assets/units/pokemon/test-unit.png'],
    ])('renders portraits for %s', (mode, expectedPath) => {
        const board = mount(FinalCompositionStrip, {
            props: {
                mode,
                composition: [
                    {
                        definitionId: 'test-unit',
                        lineId: 'test-unit',
                        starLevel: 2,
                        itemIds: [],
                    },
                ],
            },
        })

        expect(board.find('img').attributes('src')).toBe(expectedPath)
        expect(board.text()).toContain('★★')
    })

    it('renders item-ID badges and falls back for a missing portrait', async () => {
        const board = mount(FinalCompositionStrip, {
            props: {
                mode: 'pokemon',
                composition: [
                    {
                        definitionId: 'pikachu',
                        lineId: 'pikachu',
                        starLevel: 2,
                        itemIds: ['item-1', 'item-2'],
                    },
                ],
            },
        })

        expect(board.findAll('.item-badge').map((badge) => badge.text())).toEqual([
            'item-1',
            'item-2',
        ])

        await board.find('img').trigger('error')
        expect(board.find('img').attributes('src')).toBe('/assets/units/placeholder.svg')
    })

    it('can render readable labels for public compositions', () => {
        const board = mount(FinalCompositionStrip, {
            props: {
                mode: 'pokemon',
                readableLabels: true,
                composition: [
                    {
                        definitionId: 'bulbasaur_v1',
                        lineId: 'bulbasaur',
                        starLevel: 1,
                        itemIds: ['item-1', 'attack_speed'],
                    },
                ],
            },
        })

        expect(board.find('.composition-name').text()).toBe('Bulbasaur')
        expect(board.findAll('.item-badge').map((badge) => badge.text())).toEqual([
            'Item 1',
            'Attack Speed',
        ])
    })

    it('resolves saved definition IDs to mode item names and icons', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{
                id: 'pokemon_charm', name: 'Vital Charm', description: '+40% max HP',
                icon: '/assets/items/pokemon/charm.png', statBonuses: { MAX_HEALTH_PERCENT: 40 },
            }],
        }))
        const board = mount(FinalCompositionStrip, {
            props: {
                mode: 'pokemon',
                composition: [{ definitionId: 'spearow', lineId: 'spearow', starLevel: 1, itemIds: ['pokemon_charm'] }],
            },
        })
        await flushPromises()

        expect(board.get('.item-badge').text()).toBe('Vital Charm')
        expect(board.get('.item-badge img').attributes('src')).toBe('/assets/items/pokemon/charm.png')
        vi.unstubAllGlobals()
    })
})
