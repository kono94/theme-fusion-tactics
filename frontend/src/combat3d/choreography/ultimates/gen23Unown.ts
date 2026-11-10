import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  at,
  aura,
  burst,
  crouch,
  type FxContext,
  ground,
  levitate,
  pushBack,
  shockwave,
} from '../primitives'
import {
  above,
  alliesAround,
  beyond,
  bodyPoint,
  enemiesAround,
  enemiesInLine,
  flatDirection,
  flinch,
  shell,
  statArrows,
} from '../kit/shared'
import { dazeStars } from '../kit/gen23Tier2'
import {
  exclamationGlyph,
  glyphRing,
  glyphScatter,
  inkLine,
  orbCharge,
  orbFlight,
} from '../kit/gen23Unown'
import type { Choreography, UltimateSet } from '../types'

const SUPPORT_TYPES = new Set(['HEAL', 'SHIELD', 'BUFF_SPD', 'BUFF_ATK', 'BUFF_DEF'])

const living = (views: UnitView[]): UnitView[] => views.filter((view) => !view.isDying)

// A live point just in front of and above the caster where the glyphs condense into the orb.
const chargePoint = (source: UnitView, target: UnitView, height = 1.05): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  const direction = new THREE.Vector3()
  return () =>
    bodyPoint(source, height, out).addScaledVector(
      target === source ? direction.set(0, 0, 0) : flatDirection(source, target, direction),
      0.22,
    )
}

const allies = (ctx: FxContext, source: UnitView, target: UnitView): UnitView[] => {
  const near = living(alliesAround(ctx, source, 2.4, 4))
  return target.unit.ownerId === source.unit.ownerId && !near.includes(target)
    ? [...near.slice(0, 3), target]
    : near
}

// Heals, shields and buffs: the orb rises over the caster and pulses outward, sending a shard to each ally.
const supportPulse: Choreography = (ctx, { source, target, primary, secondary }) => {
  const kind = source.unit.abilityType
  const top = above(source, source.height + 0.55)
  crouch(ctx, source, { duration: 260 })
  levitate(ctx, source, { duration: 760, height: 0.12, wobble: 0.05 })
  glyphRing(ctx, source, top, { rim: primary, count: 8, duration: 560, convergeStart: 0.6 })
  orbCharge(ctx, top, { primary, secondary, size: 0.14, delay: 480, duration: 320 })
  const pulse = 620
  shockwave(ctx, ground(source), { color: primary, radius: 2.2, delay: pulse, duration: 520 })
  glyphScatter(ctx, top, { rim: primary, count: 6, speed: 0.9, delay: pulse, duration: 520 })
  const team = allies(ctx, source, target)
  team.forEach((ally, index) => {
    const arrive = pulse + 140 + index * 50
    if (ally !== source) {
      orbFlight(ctx, top, at(ally, 0.7), {
        primary,
        secondary,
        rim: primary,
        size: 0.06,
        arc: 0.25,
        trail: 1,
        delay: pulse,
        duration: arrive - pulse,
      })
    }
    if (kind === 'SHIELD') {
      shell(ctx, ally, {
        color: primary,
        edge: secondary,
        material: 'crystal',
        radius: 0.62,
        delay: arrive,
        duration: 760,
      })
    } else if (kind === 'HEAL') {
      aura(ctx, ally, { color: primary, delay: arrive, duration: 700, count: 10 })
    } else {
      statArrows(ctx, ally, { color: primary, count: 2, delay: arrive, duration: 620 })
    }
  })
  return pulse + 140
}

// Damage, stun and debuff: the orb launches at the target and shatters into glyph shards.
const offensiveShot: Choreography = (ctx, { source, target, primary, secondary }) => {
  const kind = source.unit.abilityType
  const charge = chargePoint(source, target)
  crouch(ctx, source, { duration: 240 })
  glyphRing(ctx, source, charge, { rim: primary, count: 8, duration: 540 })
  orbCharge(ctx, charge, { primary, secondary, size: 0.12, delay: 460, duration: 160 })
  const launch = 600
  const impact = 880
  orbFlight(ctx, charge, at(target), {
    primary,
    secondary,
    rim: primary,
    size: 0.12,
    delay: launch,
    duration: impact - launch,
  })
  burst(ctx, at(target), { color: primary, count: 14, delay: impact, speed: 1.6 })
  shockwave(ctx, ground(target), { color: primary, radius: 1, delay: impact, duration: 380 })
  glyphScatter(ctx, at(target), { rim: primary, count: 6, delay: impact, duration: 520 })
  pushBack(ctx, target, ground(source), { delay: impact, duration: 280, distance: 0.25 })
  const victims = [target]
  if (kind === 'STUN') {
    dazeStars(ctx, target, { color: secondary, delay: impact + 80, duration: 800 })
  } else if (kind === 'DEBUFF_DEF') {
    const splashed = living(enemiesAround(ctx, source, target, 1.6)).slice(0, 2)
    ;[target, ...splashed].forEach((victim, index) => {
      const delay = impact + index * 70
      if (victim !== target)
        glyphScatter(ctx, at(victim), { rim: primary, count: 3, delay, duration: 420 })
      statArrows(ctx, victim, { color: primary, direction: 'fall', count: 2, delay, duration: 600 })
    })
    victims.push(...splashed)
  }
  flinch(ctx, victims, impact, 70)
  return impact
}

// Unown !: a larger ring of exclamation glyphs and a line-shaped burst through every enemy in the row.
const exclamationBurst: Choreography = (ctx, { source, target, primary, secondary }) => {
  const charge = chargePoint(source, target, 1.15)
  crouch(ctx, source, { duration: 300 })
  glyphRing(ctx, source, charge, {
    rim: primary,
    count: 12,
    radius: 0.78,
    turns: 1.5,
    duration: 640,
    build: (index) => exclamationGlyph(index % 2 ? primary : secondary, 0.85),
  })
  orbCharge(ctx, charge, { primary, secondary, size: 0.2, delay: 540, duration: 220 })
  const fire = 720
  const end = beyond(source, target, 1.5)
  inkLine(ctx, ground(source), ground(target), {
    primary,
    length: source.root.position.distanceTo(target.root.position) + 1.5,
    width: 0.5,
    delay: fire - 40,
    duration: 700,
  })
  orbFlight(ctx, charge, end, {
    primary,
    secondary,
    rim: primary,
    size: 0.16,
    arc: 0,
    trail: 3,
    delay: fire,
    duration: 260,
  })
  const victims = [target, ...living(enemiesInLine(ctx, source, target, { limit: 4 })).slice(0, 3)]
  victims.forEach((victim, index) => {
    const delay = fire + 120 + index * 60
    burst(ctx, at(victim), { color: primary, count: 12, delay, speed: 1.5 })
    glyphScatter(ctx, at(victim), {
      rim: secondary,
      count: index === 0 ? 6 : 4,
      speed: 1.3,
      delay,
      duration: 520,
    })
    shockwave(ctx, ground(victim), { color: primary, radius: 0.9, delay, duration: 360 })
    pushBack(ctx, victim, ground(source), { delay, duration: 300, distance: 0.4, lift: 0.12 })
  })
  flinch(ctx, victims, fire + 120, 60)
  return fire + 120
}

// One shared Hidden Power for every Unown letter; the element color and ability type steer the shape.
const unownHiddenPower: Choreography = (ctx, cast) => {
  const unit = cast.source.unit
  if (unit.abilityPattern === 'LINE') return exclamationBurst(ctx, cast)
  if (unit.abilityType && SUPPORT_TYPES.has(unit.abilityType)) return supportPulse(ctx, cast)
  return offensiveShot(ctx, cast)
}

export const UNOWN_IDS: readonly string[] = [
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => `unown_${letter}`),
  'unown_question',
  'unown_exclamation',
]

export const GEN23_UNOWN_ULTIMATES: UltimateSet = Object.fromEntries(
  UNOWN_IDS.map((id) => [`${id}:Hidden Power`, unownHiddenPower]),
)
