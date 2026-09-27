import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { GameItem } from '../types'
import ItemInventory from './ItemInventory.vue'

const item = (instanceId: string): GameItem => ({
    instanceId,
    id: 'onepiece_axe',
    name: 'Haki Axe',
    description: '+40% ATK',
    icon: '/assets/items/onepiece/axe.png',
    statBonuses: { ATTACK_DAMAGE_PERCENT: 40 },
})

const props = (overrides: Partial<InstanceType<typeof ItemInventory>['$props']> = {}) => ({
    items: [], canManage: true, selectedItemId: null, selectedIsEquipped: false, ...overrides,
})

describe('ItemInventory', () => {
    it('shows each copy in its own slot and fills up to six slots', async () => {
        const wrapper = mount(ItemInventory, { props: props({ items: [item('first'), item('second')] }) })

        expect(wrapper.findAll('.inventory-item')).toHaveLength(2)
        expect(wrapper.findAll('.empty-slot')).toHaveLength(4)
        await wrapper.findAll('.inventory-item')[1]!.trigger('click')
        expect(wrapper.emitted('select')?.[0]?.[0]).toBe('second')
    })

    it('grows by a full row once more than six items are held', () => {
        const items = Array.from({ length: 7 }, (_, index) => item(`copy-${index}`))
        const wrapper = mount(ItemInventory, { props: props({ items }) })

        expect(wrapper.findAll('.item-slot')).toHaveLength(12)
    })

    it('emits hover details for the tooltip', async () => {
        const wrapper = mount(ItemInventory, { props: props({ items: [item('first')] }) })

        await wrapper.get('.inventory-item').trigger('mouseenter')
        expect(wrapper.emitted('show-item')?.[0]?.[1]).toMatchObject({ instanceId: 'first' })
        await wrapper.get('.inventory-item').trigger('mouseleave')
        expect(wrapper.emitted('hide-item')).toHaveLength(1)
    })

    it('unequips an item dropped on the panel or placed into an empty slot', async () => {
        const wrapper = mount(ItemInventory, {
            props: props({ selectedItemId: 'equipped', selectedIsEquipped: true }),
        })

        await wrapper.get('.empty-slot').trigger('click')
        const dataTransfer = { getData: vi.fn(() => 'equipped') }
        await wrapper.get('.inventory-card').trigger('drop', { dataTransfer })
        expect(wrapper.emitted('return-item')).toEqual([['equipped'], ['equipped']])
    })

    it('ignores drops of items already in the inventory and locked transfers', async () => {
        const dataTransfer = { getData: vi.fn(() => 'first') }
        const wrapper = mount(ItemInventory, { props: props({ items: [item('first')] }) })
        await wrapper.get('.inventory-card').trigger('drop', { dataTransfer })

        const locked = mount(ItemInventory, { props: props({ canManage: false }) })
        await locked.get('.inventory-card').trigger('drop', { dataTransfer: { getData: vi.fn(() => 'equipped') } })

        expect(wrapper.emitted('return-item')).toBeUndefined()
        expect(locked.emitted('return-item')).toBeUndefined()
        expect(wrapper.get('.inventory-item').attributes('draggable')).toBe('true')
        expect(mount(ItemInventory, { props: props({ items: [item('x')], canManage: false }) })
            .get('.inventory-item').attributes('draggable')).toBe('false')
    })
})
