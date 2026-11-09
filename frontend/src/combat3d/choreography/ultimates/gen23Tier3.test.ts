import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CameraRig, EffectSystem, TimedEffect } from '../../effects'
import type { CombatUnit3d } from '../../types'
import { UnitView } from '../../unitView'
import type { FxContext } from '../primitives'
import { GEN23_TIER3_ATTACKS } from '../attacks/gen23Tier3'
import { GEN23_TIER3_ULTIMATES } from './gen23Tier3'

const KEYS = [
  'eevee:Swift',
  'vaporeon:Aqua Ring',
  'jolteon:Thunderbolt',
  'flareon:Flare Blitz',
  'espeon:Psychic',
  'umbreon:Moonlight',
  'leafeon:Leaf Blade',
  'glaceon:Blizzard',
  'ralts:Confusion',
  'kirlia:Calm Mind',
  'gardevoir:Heal Pulse',
  'gallade:Psycho Cut',
  'larvitar:Rock Slide',
  'pupitar:Sandstorm',
  'tyranitar:Stone Edge',
  'bagon:Headbutt',
  'shelgon:Protect',
  'salamence:Outrage',
  'beldum:Take Down',
  'metang:Metal Claw',
  'metagross:Meteor Mash',
  'trapinch:Sand Tomb',
  'vibrava:Dragon Breath',
  'flygon:Earth Power',
  'gligar:Poison Jab',
  'gliscor:X-Scissor',
  'misdreavus:Shadow Ball',
  'mismagius:Mystical Fire',
  'duskull:Night Shade',
  'dusclops:Confuse Ray',
  'dusknoir:Shadow Punch',
  'carvanha:Bite',
  'sharpedo:Crunch',
  'swablu:Sing',
  'altaria:Dragon Dance',
  'feebas:Flail',
  'milotic:Recover',
  'slakoth:Yawn',
  'vigoroth:Fury Swipes',
  'slaking:Giga Impact',
]

const ALLY_TARGETED = new Set([
  'vaporeon:Aqua Ring',
  'umbreon:Moonlight',
  'kirlia:Calm Mind',
  'gardevoir:Heal Pulse',
  'shelgon:Protect',
  'altaria:Dragon Dance',
  'milotic:Recover',
])

function makeUnit(id: string, definitionId: string, ownerId: string, gridX: number, gridY: number) {
  return {
    id,
    definitionId,
    name: id,
    ownerId,
    isMine: ownerId === 'a',
    starLevel: 2,
    range: 1,
    gridX,
    gridY,
    hp: 100,
    maxHp: 100,
    shield: 0,
    mana: 0,
    maxMana: 100,
    stunned: false,
    portraitUrl: '',
    abilityType: 'DAMAGE',
    abilityName: null,
    abilityPattern: null,
    items: [],
    attack: { type: 'punch', color: '#ef4444', secondaryColor: '#fde047' },
    ability: { color: '#22c55e', secondaryColor: '#bbf7d0' },
  } satisfies CombatUnit3d
}

function harness(definitionId: string) {
  const effects: TimedEffect[] = []
  const view = (id: string, owner: string, x: number, y: number) =>
    new UnitView(
      makeUnit(id, id === 'source' ? definitionId : id, owner, x, y),
      new THREE.Texture(),
      0,
    )
  const source = view('source', 'a', 4, 4)
  const target = view('target', 'b', 4, 1)
  const bystander = view('bystander', 'b', 5, 1)
  const ally = view('ally', 'a', 5, 4)
  const views = [source, target, bystander, ally]
  const ctx: FxContext = {
    now: 0,
    effects: { add: (effect: TimedEffect) => effects.push(effect) } as unknown as EffectSystem,
    camera: {
      quaternion: new THREE.Quaternion(),
      punch: () => {},
      shake: () => {},
    } as unknown as CameraRig,
    particleScale: 1,
    reducedMotion: false,
    floatText: () => {},
    flash: () => {},
    enemiesOf: (unit) => views.filter((other) => other.unit.ownerId !== unit.unit.ownerId),
    alliesOf: (unit) =>
      views.filter((other) => other !== unit && other.unit.ownerId === unit.unit.ownerId),
  }
  const run = () => {
    for (const effect of effects) {
      for (const p of [0, 0.1, 0.5, 0.9, 1]) {
        views.forEach((unit) => unit.resetPose())
        effect.update(p, effect.start + effect.duration * p)
        views.forEach((unit) => {
          expect(Number.isFinite(unit.pose.lift), 'pose stays finite').toBe(true)
          expect(Number.isFinite(unit.pose.offset.x), 'pose stays finite').toBe(true)
          expect(Number.isFinite(unit.pose.scale), 'pose stays finite').toBe(true)
        })
      }
      effect.finish?.()
      effect.object?.traverse((object) => {
        if (object instanceof THREE.Mesh)
          expect(object.position.toArray().every(Number.isFinite)).toBe(true)
      })
    }
  }
  return { ctx, effects, source, target, ally, run }
}

describe('Gen 2/3 cost-3 signature ultimates', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('covers exactly the cost-3 keys', () => {
    expect(Object.keys(GEN23_TIER3_ULTIMATES).sort()).toEqual([...KEYS].sort())
  })

  it.each(KEYS)('%s lands quickly within the effect budget', (key) => {
    const { ctx, effects, source, target, ally, run } = harness(key.split(':')[0])
    const impact = GEN23_TIER3_ULTIMATES[key](ctx, {
      source,
      target: ALLY_TARGETED.has(key) ? ally : target,
      primary: '#22c55e',
      secondary: '#bbf7d0',
      shake: 2,
    })
    expect(impact).toBeGreaterThan(0)
    expect(impact).toBeLessThanOrEqual(1200)
    expect(effects.length).toBeGreaterThan(0)
    expect(effects.length).toBeLessThanOrEqual(40)
    run()
  })

  it.each(Object.keys(GEN23_TIER3_ATTACKS))(
    'auto-attack %s is cheap and standard priority',
    (key) => {
      const { ctx, effects, source, target, run } = harness(key)
      const impact = GEN23_TIER3_ATTACKS[key](ctx, {
        source,
        target,
        color: '#ef4444',
        secondary: '#fde047',
      })
      expect(impact).toBeGreaterThanOrEqual(0)
      expect(impact).toBeLessThanOrEqual(320)
      expect(effects.length).toBeLessThanOrEqual(4)
      expect(effects.every((effect) => effect.priority === 'standard')).toBe(true)
      run()
    },
  )
})
