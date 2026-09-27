import * as THREE from 'three'
import type { CombatUnit3d } from '../types'
import type { UnitView } from '../unitView'
import { ELEMENT_ULTIMATES } from './elements'
import {
  at,
  aura,
  beam,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  crouch,
  flare,
  glow,
  ground,
  halo,
  meteor,
  orbit,
  shake,
  shockwave,
  sigil,
  slashArc,
  spin,
  type FxContext,
} from './primitives'
import { SIGNATURE_ATTACKS } from './attacks'
import { typedAttack } from './attacks/generic'
import { alliesAround, coil, enemiesAround, flinch, shell, statArrows } from './kit/shared'
import { SIGNATURE_ULTIMATES } from './ultimates'
import type { AttackChoreography, CastInput, Choreography } from './types'

const matches = (style: string | undefined, ...keys: string[]) =>
  !!style && keys.some((key) => style.includes(key))

const HEAL_GREEN = '#4ade80'
const HEAL_LIGHT = '#bbf7d0'
const SHIELD_BLUE = '#9fd8ff'
const DAZE_YELLOW = '#fde047'

const genericUltimate: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const style = source.unit.ability.effectStyle
  crouch(ctx, source, { duration: 220 })
  aura(ctx, source, { color: primary, duration: 650 })
  chargeOrb(ctx, at(source, 0.75), { color: primary, core: secondary, duration: 240, size: 0.18 })
  const impact = 300
  if (matches(style, 'QUAKE', 'ROAR', 'SPIKES', 'SHOCK', 'CRUSH', 'FIST', 'RUSH', 'COMBO')) {
    flare(ctx, at(target), { color: primary, core: secondary, size: 0.7, rays: 8, delay: impact })
    shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.4 })
    shockwave(ctx, ground(target), {
      color: secondary,
      delay: impact + 90,
      radius: 1.5,
      thickness: 0.3,
    })
    burst(ctx, at(target), {
      color: secondary,
      count: 24,
      delay: impact,
      speed: 2.2,
      spread: 'up',
      gravity: 3,
    })
    cloud(ctx, ground(target), {
      color: '#a8a29e',
      count: 5,
      radius: 0.7,
      opacity: 0.35,
      delay: impact,
      duration: 700,
    })
    flinch(ctx, enemiesAround(ctx, source, target, 1.6).slice(0, 4), impact + 60, 40)
    cameraPunch(ctx, at(target), 0.3, impact - 40)
  } else if (matches(style, 'RAIN', 'STORM', 'SHOWER', 'VOLLEY', 'SWARM', 'FESTIVAL', 'BARRAGE')) {
    const center = target.root.position
    for (let index = 0; index < 5; index++) {
      const offset = { x: (Math.random() - 0.5) * 1.6, z: (Math.random() - 0.5) * 1.6 }
      const point = () => new THREE.Vector3(center.x + offset.x, 0.1, center.z + offset.z)
      const land = 200 + index * 70 + 320
      meteor(ctx, point, {
        color: index % 2 ? secondary : primary,
        delay: 200 + index * 70,
        duration: 320,
        size: 0.14,
      })
      burst(ctx, point, { color: primary, count: 8, delay: land, speed: 1.4 })
      shockwave(ctx, point, { color: secondary, delay: land, radius: 0.6, duration: 320 })
    }
    flinch(ctx, enemiesAround(ctx, source, target, 1.4).slice(0, 4), impact + 250, 70)
  } else if (matches(style, 'SLASH', 'BLADE', 'ONIGIRI', 'STRING', 'SPADA')) {
    ;[-1.4, 0, 1.4].forEach((angle, index) =>
      slashArc(ctx, at(target), {
        color: index === 1 ? secondary : primary,
        delay: impact - 60 + index * 60,
        angle,
        radius: 0.7,
      }),
    )
    flare(ctx, at(target), {
      color: primary,
      core: '#ffffff',
      size: 0.6,
      rays: 4,
      delay: impact + 60,
    })
    burst(ctx, at(target), { color: primary, count: 20, delay: impact + 60, speed: 2 })
  } else if (target !== source) {
    beam(ctx, source, target, { color: primary, core: secondary, delay: 220, duration: 420 })
    flare(ctx, at(target), { color: primary, core: secondary, size: 0.65, rays: 6, delay: impact })
    burst(ctx, at(target), { color: secondary, count: 26, delay: impact, speed: 2.2 })
    shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.2 })
  } else {
    sigil(ctx, ground(source), { color: primary, secondary, radius: 0.9, duration: 800 })
    shockwave(ctx, ground(source), { color: primary, delay: impact, radius: 1.8 })
    burst(ctx, at(source), {
      color: secondary,
      count: 18,
      delay: impact,
      speed: 1.6,
      spread: 'up',
      gravity: -0.3,
    })
  }
  shake(ctx, strength, impact)
  return impact
}

function plusMesh(color: string): THREE.Group {
  const group = new THREE.Group()
  const material = glow(color)
  group.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), material),
    new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), material),
  )
  return group
}

function mend(ctx: FxContext, view: UnitView, delay: number, compact: boolean): void {
  halo(ctx, view, { color: HEAL_GREEN, delay, duration: 650 })
  orbit(ctx, view, {
    color: HEAL_LIGHT,
    count: compact ? 2 : 3,
    radius: 0.35,
    heightFactor: 0.9,
    turns: 0.6,
    collapse: 1.5,
    build: () => plusMesh(HEAL_LIGHT),
    delay: delay + 80,
    duration: 700,
  })
  if (!compact) {
    burst(ctx, at(view, 0.3), {
      color: HEAL_GREEN,
      count: 12,
      delay,
      speed: 0.7,
      spread: 'up',
      gravity: -0.8,
    })
  }
}

const healChoreography: Choreography = (ctx, { source, target }) => {
  if (source !== target) aura(ctx, source, { color: HEAL_LIGHT, duration: 500, count: 10 })
  aura(ctx, target, { color: HEAL_GREEN, delay: 100, duration: 800, count: 18 })
  mend(ctx, target, 150, true)
  return 150
}

const healUltimate: Choreography = (ctx, { source, target, primary }) => {
  crouch(ctx, source, { duration: 240 })
  sigil(ctx, ground(source), {
    color: HEAL_GREEN,
    secondary: primary,
    radius: 0.85,
    points: 4,
    duration: 1000,
  })
  const top = new THREE.Vector3()
  chargeOrb(ctx, () => source.focusPoint(top, 1.35), {
    color: HEAL_GREEN,
    core: '#f0fdf4',
    duration: 300,
    size: 0.2,
  })
  const bloom = 320
  flare(ctx, () => source.focusPoint(top, 1.35), {
    color: HEAL_GREEN,
    core: '#ffffff',
    size: 0.55,
    rays: 4,
    delay: bloom,
  })
  const patients = [
    target,
    ...alliesAround(ctx, target, 2)
      .filter((ally) => ally !== target)
      .slice(0, 3),
  ]
  patients.forEach((patient, index) => {
    const delay = bloom + 60 + index * 70
    aura(ctx, patient, { color: HEAL_GREEN, delay, duration: 800, count: 14 })
    mend(ctx, patient, delay, index > 0)
  })
  return bloom + 60
}

function barrier(ctx: FxContext, view: UnitView, delay: number, radius: number): void {
  shell(ctx, view, { color: SHIELD_BLUE, edge: '#e0f2fe', radius, delay, duration: 800 })
}

const shieldChoreography: Choreography = (ctx, { source, target }) => {
  if (source !== target) aura(ctx, source, { color: '#bfdbfe', duration: 500, count: 10 })
  barrier(ctx, target, 100, 0.66)
  shockwave(ctx, ground(target), { color: SHIELD_BLUE, delay: 120, radius: 1.1, duration: 500 })
  flare(ctx, at(target, 0.95), {
    color: SHIELD_BLUE,
    core: '#ffffff',
    size: 0.3,
    delay: 260,
    duration: 200,
  })
  return 150
}

const shieldUltimate: Choreography = (ctx, { source, target, primary }) => {
  crouch(ctx, source, { duration: 220 })
  sigil(ctx, ground(source), {
    color: SHIELD_BLUE,
    secondary: primary,
    radius: 0.85,
    points: 6,
    duration: 900,
  })
  const guarded = [
    target,
    ...alliesAround(ctx, target, 1.8)
      .filter((ally) => ally !== target)
      .slice(0, 2),
  ]
  guarded.forEach((ally, index) => {
    const delay = 220 + index * 80
    barrier(ctx, ally, delay, index === 0 ? 0.72 : 0.6)
    shockwave(ctx, ground(ally), { color: SHIELD_BLUE, delay, radius: 1, duration: 450 })
  })
  flare(ctx, at(target, 0.95), {
    color: SHIELD_BLUE,
    core: '#ffffff',
    size: 0.45,
    rays: 6,
    delay: 420,
  })
  return 250
}

type BuffKind = 'BUFF_ATK' | 'BUFF_SPD' | 'BUFF_DEF'

const BUFF_COLORS: Record<BuffKind, { rune: string; light: string }> = {
  BUFF_ATK: { rune: '#f97316', light: '#fde047' },
  BUFF_SPD: { rune: '#22d3ee', light: '#ecfeff' },
  BUFF_DEF: { rune: '#60a5fa', light: '#e0f2fe' },
}

// Team-wide read: the buffed unit gets the full effect, nearby allies a quick rising halo.
function buffFamily(kind: BuffKind): Choreography {
  const { rune, light } = BUFF_COLORS[kind]
  return (ctx, { source, target, primary }) => {
    const focus = target.unit.ownerId === source.unit.ownerId ? target : source
    crouch(ctx, source, { duration: 200 })
    sigil(ctx, ground(focus), {
      color: rune,
      secondary: primary,
      radius: 0.75,
      points: kind === 'BUFF_DEF' ? 6 : 3,
      duration: 900,
    })
    const impact = 260
    if (kind === 'BUFF_ATK') {
      aura(ctx, focus, { color: rune, delay: 100, duration: 800, count: 26, radius: 0.45 })
      burst(ctx, at(focus, 0.3), {
        color: light,
        count: 14,
        delay: impact,
        speed: 1,
        spread: 'up',
        gravity: -1,
      })
      flare(ctx, at(focus, 1.1), { color: rune, core: light, size: 0.45, rays: 4, delay: impact })
      statArrows(ctx, focus, { color: rune, count: 3, delay: impact - 80, duration: 650 })
      cameraPunch(ctx, at(focus), 0.15, impact)
    } else if (kind === 'BUFF_SPD') {
      if (!ctx.reducedMotion) spin(ctx, focus, { delay: 80, duration: 420, turns: 1 })
      orbit(ctx, focus, {
        color: rune,
        count: 5,
        radius: 0.5,
        heightFactor: 0.35,
        turns: 3,
        delay: 80,
        duration: 700,
      })
      halo(ctx, focus, { color: rune, delay: 100, duration: 350 })
      statArrows(ctx, focus, { color: light, count: 2, delay: 220, duration: 450 })
      burst(ctx, ground(focus), {
        color: light,
        count: 14,
        delay: impact,
        speed: 1.8,
        spread: 'ring',
        gravity: 0,
      })
    } else {
      halo(ctx, focus, { color: rune, direction: 'fall', duration: 500 })
      shell(ctx, focus, {
        color: light,
        edge: rune,
        material: 'metal',
        radius: 0.64,
        delay: 120,
        duration: 750,
      })
      statArrows(ctx, focus, { color: rune, count: 2, delay: impact, duration: 600 })
      shockwave(ctx, ground(focus), { color: rune, delay: impact + 120, radius: 1, duration: 450 })
      flare(ctx, at(focus, 0.9), { color: light, core: '#ffffff', size: 0.35, delay: impact + 120 })
    }
    const teamWide = source.unit.abilityPattern === 'SURROUND'
    const allies = teamWide
      ? alliesAround(ctx, source, 2.2, 5, focus)
          .filter((ally) => ally !== focus && ally !== source)
          .slice(0, 4)
      : []
    if (allies.length > 0)
      shockwave(ctx, ground(focus), { color: rune, delay: impact, radius: 2.2, duration: 500 })
    allies.forEach((ally) => {
      const delay = impact + ally.root.position.distanceTo(focus.root.position) * 110
      halo(ctx, ally, {
        color: rune,
        delay,
        duration: 450,
        direction: kind === 'BUFF_DEF' ? 'fall' : 'rise',
      })
    })
    return impact
  }
}

const BUFF_FAMILIES: Record<BuffKind, Choreography> = {
  BUFF_ATK: buffFamily('BUFF_ATK'),
  BUFF_SPD: buffFamily('BUFF_SPD'),
  BUFF_DEF: buffFamily('BUFF_DEF'),
}

// Status families wrap the element/generic hit and add a readable after-effect on the target.
function withDaze(base: Choreography): Choreography {
  return (ctx, input) => {
    const impact = base(ctx, input)
    const { target, source, primary } = input
    if (target === source) return impact
    coil(ctx, target, {
      color: primary,
      glowing: true,
      turns: 2,
      thickness: 0.025,
      delay: impact + 20,
      duration: 700,
    })
    orbit(ctx, target, {
      color: DAZE_YELLOW,
      count: 3,
      radius: 0.32,
      heightFactor: 1.2,
      turns: 2,
      size: 0.08,
      delay: impact + 80,
      duration: 1100,
    })
    ctx.effects.add({
      start: ctx.now + impact + 80,
      duration: 900,
      priority: 'ability',
      update: (p) => {
        target.pose.tilt += Math.sin(p * Math.PI * 6) * 0.18 * (1 - p)
      },
    })
    return impact
  }
}

function withCorrode(base: Choreography): Choreography {
  return (ctx, input) => {
    const impact = base(ctx, input)
    const { target, source, secondary } = input
    if (target === source) return impact
    statArrows(ctx, target, {
      color: '#a3e635',
      direction: 'fall',
      count: 3,
      delay: impact + 60,
      duration: 650,
    })
    burst(ctx, at(target, 0.8), {
      color: '#65a30d',
      count: 12,
      delay: impact + 120,
      speed: 0.5,
      gravity: 3,
      size: 0.1,
    })
    cloud(ctx, at(target, 0.5), {
      color: '#3f6212',
      count: 4,
      radius: 0.3,
      size: 0.22,
      opacity: 0.4,
      delay: impact + 80,
      duration: 800,
    })
    flare(ctx, at(target), {
      color: secondary,
      core: '#1a2e05',
      size: 0.4,
      rays: 3,
      delay: impact + 60,
      duration: 260,
    })
    return impact
  }
}

type SignatureKey = Pick<CombatUnit3d, 'definitionId' | 'abilityName'>

function signatureOf<T>(set: Record<string, T>, unit: SignatureKey): T | undefined {
  return (
    (unit.abilityName ? set[`${unit.definitionId}:${unit.abilityName}`] : undefined) ??
    set[unit.definitionId]
  )
}

export function resolveUltimate(unit: CombatUnit3d): Choreography {
  return (
    signatureOf(SIGNATURE_ULTIMATES, unit) ??
    (unit.ability.effectStyle ? ELEMENT_ULTIMATES[unit.ability.effectStyle] : undefined) ??
    genericUltimate
  )
}

export function hasSignatureUltimate(unit: SignatureKey): boolean {
  return signatureOf(SIGNATURE_ULTIMATES, unit) !== undefined
}

export function resolveAttack(unit: CombatUnit3d): AttackChoreography {
  return signatureOf(SIGNATURE_ATTACKS, unit) ?? typedAttack
}

export function hasSignatureAttack(unit: SignatureKey): boolean {
  return signatureOf(SIGNATURE_ATTACKS, unit) !== undefined
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
  const unit = source.unit
  const input = castInput(source, target)
  const signature = signatureOf(SIGNATURE_ULTIMATES, unit)
  if (signature) return signature(ctx, input)
  if (unit.abilityType === 'HEAL' || unit.ability.effectStyle === 'CHOPPER_HEAL') {
    return healUltimate(ctx, input)
  }
  if (unit.abilityType === 'SHIELD') {
    return shieldUltimate(ctx, input)
  }
  if (unit.abilityType && unit.abilityType in BUFF_FAMILIES) {
    return BUFF_FAMILIES[unit.abilityType as BuffKind](ctx, input)
  }
  const base = resolveUltimate(unit)
  if (unit.abilityType === 'STUN') return withDaze(base)(ctx, input)
  if (unit.abilityType === 'DEBUFF_DEF') return withCorrode(base)(ctx, input)
  return base(ctx, input)
}

export function playHeal(ctx: FxContext, source: UnitView, target: UnitView): number {
  return healChoreography(ctx, castInput(source, target))
}

export function playShield(ctx: FxContext, source: UnitView, target: UnitView): number {
  return shieldChoreography(ctx, castInput(source, target))
}

// Auto-attacks: returns the delay at which the hit lands.
export function playAttack(ctx: FxContext, source: UnitView, target: UnitView): number {
  const attack = source.unit.attack
  source.onAttack(ctx.now, target)
  return resolveAttack(source.unit)(ctx, {
    source,
    target,
    color: attack.color,
    secondary: attack.secondaryColor ?? '#ffffff',
  })
}
