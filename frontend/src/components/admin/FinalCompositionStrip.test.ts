import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
})
