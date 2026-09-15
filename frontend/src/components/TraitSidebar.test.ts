import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setTraitData, TRAIT_DATA, type TraitRosterUnit } from '../data/traitData'
import type { GameMode, GameUnit } from '../types'
import TraitSidebar from './TraitSidebar.vue'

const resizeObservers: ResizeObserverMock[] = []
const cleanup: Array<() => void> = []

class ResizeObserverMock {
  private observedElement: Element | null = null

  constructor(private readonly callback: ResizeObserverCallback) {
    resizeObservers.push(this)
  }

  observe(element: Element) {
    this.observedElement = element
  }

  unobserve() {}

  disconnect() {
    this.observedElement = null
  }

  trigger(height: number) {
    if (!this.observedElement) return

    this.callback(
      [
        {
          target: this.observedElement,
          contentRect: rect({ height }),
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }
}

function rect(overrides: Partial<DOMRect> = {}): DOMRect {
  const left = overrides.left ?? 0
  const top = overrides.top ?? 0
  const width = overrides.width ?? 0
  const height = overrides.height ?? 0

  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: overrides.right ?? left + width,
    bottom: overrides.bottom ?? top + height,
    toJSON: () => ({}),
  }
}

function mockRect(element: Element, value: Partial<DOMRect>) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect(value))
}

function mountSidebar(props: { units: GameUnit[]; gameMode: GameMode }) {
  const wrapper = mount(TraitSidebar, { props })
  cleanup.push(() => wrapper.unmount())
  return wrapper
}

function rosterUnit(index: number, overrides: Partial<TraitRosterUnit> = {}): TraitRosterUnit {
  const cost = Math.min(5, Math.floor(index / 3) + 1)
  return {
    lineId: `line-${index}`,
    cost,
    starLevel: 1,
    definitionId: `unit-${index}`,
    name: `Unit ${index}`,
    role: 'DAMAGE',
    maxHealth: 100,
    maxMana: 100,
    attackDamage: 10,
    abilityPower: 0,
    defense: 10,
    attackSpeed: 1,
    range: 1,
    traits: ['Fighter'],
    ability: null,
    formattedAbilityDescription: '',
    ...overrides,
  }
}

function boardUnit(overrides: Partial<GameUnit> = {}): GameUnit {
  return {
    id: 'board-unit',
    definitionId: 'unit-0',
    lineId: 'line-0',
    name: 'Unit 0',
    cost: 1,
    role: 'DAMAGE',
    maxHealth: 100,
    currentHealth: 100,
    shield: 0,
    mana: 0,
    maxMana: 100,
    attackDamage: 10,
    abilityPower: 0,
    defense: 10,
    attackSpeed: 1,
    range: 1,
    traits: ['Fighter'],
    items: [],
    x: 0,
    y: 0,
    starLevel: 1,
    ownerId: 'player',
    ability: null,
    activeAbility: null,
    stunSecondsRemaining: 0,
    atkBuff: 1,
    spdBuff: 1,
    ...overrides,
  }
}

describe('TraitSidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    resizeObservers.length = 0
    Object.keys(TRAIT_DATA).forEach((key) => delete TRAIT_DATA[key])
  })

  afterEach(() => {
    cleanup.splice(0).forEach((unmount) => unmount())
    document.body.querySelectorAll('.trait-unit-tooltip').forEach((element) => element.remove())
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders every roster member in a five-column dynamic grid', async () => {
    setTraitData([
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'Fighters gain attack damage.',
        effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        units: Array.from({ length: 15 }, (_, index) => rosterUnit(index)),
      },
    ])
    const wrapper = mountSidebar({ units: [boardUnit()], gameMode: 'onepiece' })

    await wrapper.get('.trait-item').trigger('mouseenter')

    expect(wrapper.find('[data-test="trait-roster"]').exists()).toBe(true)
    expect(wrapper.findAll('.trait-unit')).toHaveLength(15)
    expect(wrapper.findAll('.trait-unit').map((unit) => unit.attributes('aria-label'))).toEqual(
      Array.from(
        { length: 15 },
        (_, index) => `Unit ${index}, ${Math.min(5, Math.floor(index / 3) + 1)} gold`,
      ),
    )
  })

  it('colors only contributing forms and uses the qualifying evolution otherwise', async () => {
    setTraitData([
      {
        id: 'flying',
        name: 'Flying',
        description: 'Flying Pokemon attack faster.',
        effects: [{ minUnits: 1, description: '+3% AS', style: 'bronze' }],
        type: 'type',
        iconColor: '#38bdf8',
        units: [
          rosterUnit(0, {
            lineId: 'charmander',
            definitionId: 'charizard',
            name: 'Charizard',
            starLevel: 3,
            traits: ['Fire', 'Flying'],
          }),
          rosterUnit(1, {
            lineId: 'pidgey',
            definitionId: 'pidgey',
            name: 'Pidgey',
            traits: ['Normal', 'Flying'],
          }),
        ],
      },
    ])
    const wrapper = mountSidebar({
      gameMode: 'pokemon',
      units: [
        boardUnit({
          lineId: 'charmander',
          definitionId: 'charmeleon',
          name: 'Charmeleon',
          starLevel: 2,
          traits: ['Fire'],
        }),
        boardUnit({
          id: 'pidgey-board',
          lineId: 'pidgey',
          definitionId: 'pidgey',
          name: 'Pidgey',
          traits: ['Normal', 'Flying'],
        }),
      ],
    })

    await wrapper.get('.trait-item').trigger('mouseenter')
    const roster = wrapper.findAll('.trait-unit')

    expect(roster[0].classes()).not.toContain('active')
    expect(roster[0].get('img').attributes('src')).toBe('/assets/units/pokemon/charizard.png')
    expect(roster[1].classes()).toContain('active')

    await roster[0].trigger('mouseenter')
    expect(document.body.querySelector('.unit-tooltip .name')?.textContent).toBe('Charizard')
    expect(document.body.querySelector('.unit-tooltip .unit-cost')?.textContent).toBe('1g')
    expect(wrapper.find('.trait-tooltip').exists()).toBe(true)
  })

  it('counts distinct lines per trait when different forms share a board', () => {
    setTraitData([
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'Fighter trait',
        effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        units: [rosterUnit(0)],
      },
    ])
    const wrapper = mountSidebar({
      gameMode: 'onepiece',
      units: [boardUnit(), boardUnit({ id: 'duplicate', starLevel: 2 })],
    })

    expect(wrapper.get('.trait-count').text()).toContain('1 / 1')
  })

  it('emits the active trait while its tooltip is hovered', async () => {
    setTraitData([
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'Fighter trait',
        effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        units: [rosterUnit(0)],
      },
    ])
    const wrapper = mountSidebar({ units: [boardUnit()], gameMode: 'onepiece' })

    await wrapper.get('.trait-item').trigger('mouseenter')
    await wrapper.get('.trait-item').trigger('focus')
    await wrapper.get('.trait-sidebar').trigger('mouseleave')

    expect(wrapper.emitted('hover-trait')).toEqual([['fighter'], [null]])
  })

  it('flows compact trait cards into adaptive columns and updates after resize', async () => {
    const traits = Array.from({ length: 5 }, (_, index) => `Trait ${index}`)
    setTraitData(
      traits.map((name, index) => ({
        id: `trait_${index}`,
        name,
        description: `${name} description`,
        effects: [{ minUnits: 1, description: `${name} effect`, style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        iconGlyph: String(index),
        units: [rosterUnit(index, { traits: [name] })],
      })),
    )
    const wrapper = mountSidebar({
      units: [boardUnit({ traits })],
      gameMode: 'onepiece',
    })

    resizeObservers[0].trigger(160)
    await nextTick()

    expect(wrapper.findAll('.trait-item')).toHaveLength(5)
    expect(wrapper.get('.trait-sidebar').attributes('style')).toContain('--trait-row-count: 2')

    resizeObservers[0].trigger(276)
    await nextTick()

    expect(wrapper.get('.trait-sidebar').attributes('style')).toContain('--trait-row-count: 4')
  })

  it('shows a compact glyph, progress count, and accessible trait name', () => {
    setTraitData([
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'Fighter trait',
        effects: [{ minUnits: 2, description: '+5% ATK', style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        iconGlyph: '⚔',
        units: [rosterUnit(0)],
      },
    ])
    const wrapper = mountSidebar({ units: [boardUnit()], gameMode: 'onepiece' })
    const traitItem = wrapper.get('.trait-item')

    expect(traitItem.element.tagName).toBe('BUTTON')
    expect(traitItem.get('.trait-icon').text()).toBe('⚔')
    expect(traitItem.get('.trait-count').text()).toBe('1 / 2')
    expect(traitItem.attributes('aria-label')).toBe('Fighter, 1 / 2')
  })

  it('clamps the shared roster panel within the playable game area', async () => {
    const traits = ['First', 'Middle', 'Last']
    setTraitData(
      traits.map((name, index) => ({
        id: name.toLowerCase(),
        name,
        description: `${name} trait`,
        effects: [{ minUnits: 1, description: `${name} effect`, style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        units: [rosterUnit(index, { traits: [name] })],
      })),
    )
    const wrapper = mountSidebar({
      units: [boardUnit({ traits })],
      gameMode: 'onepiece',
    })
    const sidebar = wrapper.get('.trait-sidebar').element
    const mainArea = sidebar.parentElement!
    const traitItems = wrapper.findAll('.trait-item')

    mockRect(mainArea, { top: 60, left: 0, width: 1280, height: 500 })
    mockRect(sidebar, { top: 100, left: 20, width: 60, height: 166 })
    mockRect(traitItems[0].element, { top: 64, left: 20, width: 60, height: 50 })
    mockRect(traitItems[1].element, { top: 280, left: 20, width: 60, height: 50 })
    mockRect(traitItems[2].element, { top: 506, left: 20, width: 60, height: 50 })
    resizeObservers[0].trigger(500)

    await traitItems[0].trigger('mouseenter')
    await nextTick()
    const tooltip = wrapper.get('.trait-tooltip')
    const tooltipShell = wrapper.get('.trait-tooltip-shell')
    mockRect(tooltipShell.element, { width: 274, height: 200 })

    window.dispatchEvent(new Event('resize'))
    await nextTick()
    await nextTick()
    expect((tooltipShell.element as HTMLElement).style.top).toBe('-28px')
    expect((tooltip.element as HTMLElement).style.maxHeight).toBe('476px')
    expect((tooltip.element as HTMLElement).style.overflowY).toBe('auto')

    await traitItems[1].trigger('mouseenter')
    await nextTick()
    expect((tooltipShell.element as HTMLElement).style.top).toBe('105px')

    await traitItems[2].trigger('mouseenter')
    await nextTick()
    expect((tooltipShell.element as HTMLElement).style.top).toBe('248px')
  })

  it('keeps the trait active while the pointer moves into its roster panel', async () => {
    setTraitData([
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'Fighter trait',
        effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
        type: 'class',
        iconColor: '#ef4444',
        units: [rosterUnit(0)],
      },
    ])
    const wrapper = mountSidebar({ units: [boardUnit()], gameMode: 'onepiece' })

    await wrapper.get('.trait-item').trigger('mouseenter')
    await wrapper.get('.trait-tooltip').trigger('mouseenter')

    expect(wrapper.find('.trait-tooltip').exists()).toBe(true)
    expect(wrapper.emitted('hover-trait')).toEqual([['fighter']])

    await wrapper.get('.trait-sidebar').trigger('mouseleave')
    expect(wrapper.emitted('hover-trait')).toEqual([['fighter'], [null]])
  })
})
