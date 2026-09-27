import type { AttackType } from '../../data/animationConfig'
import type { CombatUnit3d } from '../types'
import type { UnitView } from '../unitView'
import { ELEMENT_ULTIMATES } from './elements'
import {
  at,
  aura,
  beam,
  burst,
  ground,
  lightning,
  meteor,
  projectile,
  shake,
  shockwave,
  slashArc,
  stretchLimb,
  type FxContext,
} from './primitives'
import { SIGNATURE_ULTIMATES } from './signatures'
import type { CastInput, Choreography } from './types'

const matches = (style: string | undefined, ...keys: string[]) =>
  !!style && keys.some((key) => style.includes(key))

const genericUltimate: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  const style = source.unit.ability.effectStyle
  aura(ctx, source, { color: primary, duration: 650 })
  if (matches(style, 'QUAKE', 'ROAR', 'SPIKES', 'SHOCK', 'CRUSH', 'FIST', 'RUSH', 'COMBO')) {
    shockwave(ctx, ground(target), { color: primary, delay: 260, radius: 2.4 })
    burst(ctx, at(target), { color: secondary, count: 24, delay: 260, speed: 2.2 })
  } else if (matches(style, 'RAIN', 'STORM', 'SHOWER', 'VOLLEY', 'SWARM', 'FESTIVAL', 'BARRAGE')) {
    const center = target.root.position
    for (let index = 0; index < 5; index++) {
      const offset = { x: (Math.random() - 0.5) * 1.6, z: (Math.random() - 0.5) * 1.6 }
      const point = () => center.clone().set(center.x + offset.x, 0.1, center.z + offset.z)
      meteor(ctx, point, { color: index % 2 ? secondary : primary, delay: 180 + index * 70, duration: 320, size: 0.14 })
      burst(ctx, point, { color: primary, count: 8, delay: 500 + index * 70, speed: 1.4 })
    }
  } else if (matches(style, 'SLASH', 'BLADE', 'ONIGIRI', 'STRING', 'SPADA')) {
    ;[-1.4, 0, 1.4].forEach((angle, index) =>
      slashArc(ctx, at(target), { color: index === 1 ? secondary : primary, delay: 220 + index * 60, angle, radius: 0.7 }),
    )
    burst(ctx, at(target), { color: primary, count: 20, delay: 360, speed: 2 })
  } else if (target !== source) {
    beam(ctx, source, target, { color: primary, core: secondary, delay: 200 })
    burst(ctx, at(target), { color: secondary, count: 26, delay: 260, speed: 2.2 })
  } else {
    shockwave(ctx, ground(source), { color: primary, delay: 200, radius: 1.8 })
  }
  shake(ctx, strength, 260)
  return 260
}

const healChoreography: Choreography = (ctx, { source, target }) => {
  aura(ctx, source, { color: '#86efac', duration: 700 })
  aura(ctx, target, { color: '#7dff9a', delay: 150, duration: 900, count: 22 })
  return 150
}

const shieldChoreography: Choreography = (ctx, { source, target }) => {
  aura(ctx, source, { color: '#bfdbfe', duration: 600 })
  shockwave(ctx, ground(target), { color: '#9fd8ff', delay: 120, radius: 1.1, duration: 500 })
  return 150
}

export function resolveUltimate(unit: CombatUnit3d): Choreography {
  return (
    SIGNATURE_ULTIMATES[unit.definitionId] ??
    (unit.ability.effectStyle ? ELEMENT_ULTIMATES[unit.ability.effectStyle] : undefined) ??
    genericUltimate
  )
}

export function hasSignatureUltimate(unit: Pick<CombatUnit3d, 'definitionId' | 'ability'>): boolean {
  return (
    unit.definitionId in SIGNATURE_ULTIMATES ||
    (!!unit.ability.effectStyle && unit.ability.effectStyle in ELEMENT_ULTIMATES)
  )
}

export function castInput(source: UnitView, target: UnitView): CastInput {
  const ability = source.unit.ability
  return {
    source,
    target,
    primary: ability.color,
    secondary: ability.secondaryColor ?? ability.color,
    shake: ability.screenShake ?? 2,
  }
}

export function playUltimate(ctx: FxContext, source: UnitView, target: UnitView): number {
  const type = source.unit.abilityType
  const input = castInput(source, target)
  if (type === 'HEAL' || source.unit.ability.effectStyle === 'CHOPPER_HEAL') {
    return healChoreography(ctx, input)
  }
  if (type === 'SHIELD') {
    return shieldChoreography(ctx, input)
  }
  return resolveUltimate(source.unit)(ctx, input)
}

export function playHeal(ctx: FxContext, source: UnitView, target: UnitView): number {
  return healChoreography(ctx, castInput(source, target))
}

export function playShield(ctx: FxContext, source: UnitView, target: UnitView): number {
  return shieldChoreography(ctx, castInput(source, target))
}

const SLASH_TYPES = new Set<AttackType>(['slash', 'leafCut', 'bugBite'])
const LIGHTNING_TYPES = new Set<AttackType>(['lightning', 'thunderJolt'])
const PROJECTILE_TYPES = new Set<AttackType>([
  'projectile',
  'sniperShot',
  'flameBurst',
  'aquaJet',
  'psyPulse',
  'poisonSting',
  'stoneToss',
  'iceShard',
  'shadowOrb',
  'dragonSpark',
  'windGust',
  'waterShock',
])

const MELEE_IMPACT_MS = 120
const PROJECTILE_MS = 260

// Auto-attacks: returns the delay at which the hit lands.
export function playAttack(ctx: FxContext, source: UnitView, target: UnitView): number {
  const attack = source.unit.attack
  const color = attack.color
  const secondary = attack.secondaryColor ?? '#ffffff'
  source.onAttack(ctx.now, target)

  if (attack.type === 'rubberPunch') {
    stretchLimb(ctx, source, target, { color: '#f1c27d', fist: color, duration: 220 })
    burst(ctx, at(target), { color: secondary, count: 8, delay: 100, priority: 'standard' })
    return 100
  }
  if (attack.type === 'tripleSlash') {
    ;[-1.6, -0.2, 1.2].forEach((angle, index) =>
      slashArc(ctx, at(target), { color: index === 1 ? secondary : color, delay: 60 + index * 45, angle, priority: 'standard' }),
    )
    return MELEE_IMPACT_MS
  }
  if (LIGHTNING_TYPES.has(attack.type)) {
    lightning(ctx, target, { color, from: at(source, 0.7), duration: 180, segments: 7, jitter: 0.25 })
    burst(ctx, at(target), { color: secondary, count: 6, delay: 60, priority: 'standard' })
    return 60
  }
  if (PROJECTILE_TYPES.has(attack.type) || source.unit.range > 1) {
    projectile(ctx, source, target, {
      color,
      core: secondary,
      duration: PROJECTILE_MS,
      shape: attack.type === 'iceShard' || attack.type === 'sniperShot' ? 'shard' : 'orb',
      arc: attack.type === 'stoneToss' ? 0.8 : attack.type === 'sniperShot' ? 0 : 0.4,
      priority: 'standard',
    })
    burst(ctx, at(target), { color, count: 6, delay: PROJECTILE_MS, priority: 'standard' })
    return PROJECTILE_MS
  }
  if (SLASH_TYPES.has(attack.type)) {
    slashArc(ctx, at(target), { color, delay: MELEE_IMPACT_MS, priority: 'standard' })
    return MELEE_IMPACT_MS
  }
  burst(ctx, at(target), { color, count: 8, delay: MELEE_IMPACT_MS, speed: 1.4, priority: 'standard' })
  if (attack.type === 'blunt' || attack.type === 'magmaFist') {
    shockwave(ctx, ground(target), { color, delay: MELEE_IMPACT_MS, radius: 0.7, duration: 300, priority: 'standard' })
  }
  return MELEE_IMPACT_MS
}
