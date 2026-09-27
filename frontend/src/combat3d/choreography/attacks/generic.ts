import * as THREE from 'three'
import type { AttackType } from '../../../data/animationConfig'
import type { UnitView } from '../../unitView'
import {
  at,
  beam,
  burst,
  cloud,
  crescentMesh,
  flare,
  glow,
  ground,
  leafMesh,
  lightning,
  orbMesh,
  projectile,
  prop,
  pushBack,
  ringMesh,
  rockMesh,
  shockwave,
  slashArc,
  starGeometry,
  stretchLimb,
  type BurstOptions,
  type FxContext,
} from '../primitives'
import { fangs, zap } from '../kit/shared'
import type { AttackChoreography, AttackInput } from '../types'

const std = 'standard' as const
const MELEE_MS = 120
const SHOT_MS = 240

type AttackBuilder = (ctx: FxContext, input: AttackInput) => number

// Auto-attack debris is short-lived so a full board does not pile up particles.
const spark = (ctx: FxContext, point: () => THREE.Vector3, options: BurstOptions) =>
  burst(ctx, point, { duration: options.spread === 'up' ? 460 : 380, ...options })

const side = (amount: number) => new THREE.Vector3((Math.random() - 0.5) * amount, 0, 0)

function fireball(color: string, core: string): THREE.Group {
  const group = orbMesh(color, core, 0.09)
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.42, 10, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.24),
    glow(color, 0.6),
  )
  group.add(tail)
  return group
}

function shadowBall(color: string, secondary: string): THREE.Group {
  const group = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 10),
    new THREE.MeshBasicMaterial({ color: '#0b0414', transparent: true }),
  )
  const rim = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), glow(color, 0.7))
  const wisp = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 24), glow(secondary, 0.8))
  group.add(rim, core, wisp)
  return group
}

function dragonOrb(color: string, secondary: string): THREE.Group {
  const group = orbMesh(color, secondary, 0.08)
  for (const angle of [0, Math.PI]) {
    const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow(secondary))
    satellite.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0)
    group.add(satellite)
  }
  return group
}

function metalStar(color: string): THREE.Mesh {
  return new THREE.Mesh(
    starGeometry(4, 0.16, 0.05),
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.9,
      roughness: 0.25,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.25,
    }),
  )
}

const punch: AttackBuilder = (ctx, { target, color, secondary }) => {
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.3,
    delay: MELEE_MS,
    duration: 180,
    priority: std,
  })
  spark(ctx, at(target), {
    color,
    count: 7,
    delay: MELEE_MS,
    speed: 1.3,
    size: 0.12,
    priority: std,
  })
  return MELEE_MS
}

const kick: AttackBuilder = (ctx, { target, color, secondary }) => {
  slashArc(ctx, at(target, 0.3), {
    color,
    delay: 60,
    duration: 200,
    angle: -0.3,
    sweep: 1.9,
    radius: 0.45,
    width: 0.1,
    priority: std,
  })
  flare(ctx, at(target, 0.35), {
    color,
    core: secondary,
    size: 0.26,
    delay: MELEE_MS,
    priority: std,
  })
  spark(ctx, at(target, 0.35), {
    color: secondary,
    count: 5,
    delay: MELEE_MS,
    speed: 1.2,
    priority: std,
  })
  return MELEE_MS
}

const slash: AttackBuilder = (ctx, { target, color, secondary }) => {
  const angle = Math.random() < 0.5 ? -1.4 : 0.9
  slashArc(ctx, at(target), { color, delay: 60, duration: 200, angle, sweep: 1.8, priority: std })
  spark(ctx, at(target), {
    color: secondary,
    count: 5,
    delay: MELEE_MS,
    speed: 1.8,
    size: 0.07,
    priority: std,
  })
  return MELEE_MS
}

const blunt: AttackBuilder = (ctx, { target, color, secondary }) => {
  const impact = 140
  flare(ctx, at(target, 0.45), {
    color,
    core: secondary,
    size: 0.4,
    rays: 6,
    delay: impact,
    priority: std,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: impact,
    radius: 0.75,
    duration: 300,
    priority: std,
  })
  spark(ctx, at(target, 0.3), {
    color,
    count: 7,
    delay: impact,
    speed: 1.4,
    spread: 'up',
    gravity: 3,
    priority: std,
  })
  return impact
}

const bolt: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  projectile(ctx, source, target, { color, core: secondary, duration: SHOT_MS, priority: std })
  flare(ctx, at(target), { color, core: secondary, size: 0.28, delay: SHOT_MS, priority: std })
  spark(ctx, at(target), { color, count: 6, delay: SHOT_MS, priority: std })
  return SHOT_MS
}

const rubberPunch: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  stretchLimb(ctx, source, target, { color: '#f1c27d', fist: color, duration: 220, priority: std })
  flare(ctx, at(target), { color, core: secondary, size: 0.32, delay: 100, priority: std })
  spark(ctx, at(target), { color: secondary, count: 8, delay: 100, priority: std })
  return 100
}

const tripleSlash: AttackBuilder = (ctx, { target, color, secondary }) => {
  ;[-1.6, -0.2, 1.2].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index === 1 ? secondary : color,
      delay: 50 + index * 40,
      duration: 200,
      angle,
      priority: std,
    }),
  )
  flare(ctx, at(target), { color, core: secondary, size: 0.3, delay: 140, priority: std })
  return MELEE_MS
}

const sniperShot: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 150
  flare(ctx, at(source, 0.6), { color, core: secondary, size: 0.22, duration: 120, priority: std })
  projectile(ctx, source, target, {
    color,
    core: secondary,
    duration: flight,
    size: 0.06,
    shape: 'bolt',
    arc: 0,
    priority: std,
  })
  flare(ctx, at(target), { color, core: '#ffffff', size: 0.3, delay: flight, priority: std })
  spark(ctx, at(target), {
    color: secondary,
    count: 6,
    delay: flight,
    speed: 2,
    size: 0.08,
    priority: std,
  })
  return flight
}

const magmaFist: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 220
  prop(ctx, source, target, {
    build: () => fireball(color, secondary),
    duration: flight,
    arc: 0.2,
    spin: 3,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 9,
    delay: flight,
    speed: 1.2,
    spread: 'up',
    gravity: -0.4,
    priority: std,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: flight,
    radius: 0.7,
    duration: 320,
    priority: std,
  })
  return flight
}

const waterShock: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 230
  prop(ctx, source, target, {
    build: () => ringMesh(secondary, 0.14, 0.04),
    duration: flight,
    arc: 0,
    grow: 1.6,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 9,
    delay: flight,
    speed: 1.3,
    spread: 'up',
    gravity: 3,
    priority: std,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: flight,
    radius: 0.6,
    duration: 300,
    priority: std,
  })
  return flight
}

const skyLightning: AttackBuilder = (ctx, { target, color, secondary }) => {
  const impact = 70
  lightning(ctx, target, { color, duration: 200, segments: 8, jitter: 0.3, priority: std })
  flare(ctx, at(target), {
    color: secondary,
    core: '#ffffff',
    size: 0.34,
    delay: impact,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 6,
    delay: impact,
    speed: 2,
    size: 0.07,
    priority: std,
  })
  return impact
}

const fireKick: AttackBuilder = (ctx, { target, color, secondary }) => {
  slashArc(ctx, at(target, 0.4), {
    color,
    delay: 50,
    duration: 220,
    angle: -0.6,
    sweep: 2.2,
    radius: 0.55,
    width: 0.2,
    priority: std,
  })
  flare(ctx, at(target, 0.4), {
    color: secondary,
    core: '#fff7ed',
    size: 0.3,
    delay: MELEE_MS,
    priority: std,
  })
  spark(ctx, at(target, 0.4), {
    color,
    count: 8,
    delay: MELEE_MS,
    speed: 1,
    spread: 'up',
    gravity: -0.6,
    priority: std,
  })
  return MELEE_MS
}

const leafCut: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 250
  ;[-0.22, 0.22, 0].forEach((offset, index) =>
    prop(ctx, source, target, {
      build: () => leafMesh(index === 2 ? secondary : color, 0.13),
      delay: index * 45,
      duration: flight,
      arc: 0.25 + index * 0.1,
      offset: new THREE.Vector3(offset, index * 0.08, 0),
      tumble: 14 + index * 3,
      priority: std,
    }),
  )
  spark(ctx, at(target), {
    color,
    count: 6,
    delay: flight + 45,
    speed: 1.4,
    size: 0.1,
    priority: std,
  })
  return flight + 45
}

const flameBurst: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  prop(ctx, source, target, {
    build: () => fireball(color, secondary),
    duration: SHOT_MS,
    arc: 0.25,
    spin: 6,
    priority: std,
  })
  flare(ctx, at(target), {
    color,
    core: '#fff7ed',
    size: 0.34,
    rays: 6,
    delay: SHOT_MS,
    priority: std,
  })
  spark(ctx, at(target), {
    color: '#fbbf24',
    count: 9,
    delay: SHOT_MS,
    speed: 1.1,
    spread: 'up',
    gravity: -0.8,
    priority: std,
  })
  return SHOT_MS
}

const aquaJet: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const impact = 110
  beam(ctx, source, target, { color, core: secondary, duration: 240, width: 0.05, priority: std })
  spark(ctx, at(target), {
    color: secondary,
    count: 10,
    delay: impact,
    speed: 1.5,
    spread: 'up',
    gravity: 3.2,
    size: 0.1,
    priority: std,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: impact,
    radius: 0.55,
    duration: 280,
    priority: std,
  })
  return impact
}

const thunderJolt: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const impact = 60
  zap(ctx, at(source, 0.7), at(target), {
    color,
    core: secondary,
    duration: 200,
    segments: 9,
    jitter: 0.4,
    priority: std,
  })
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.36,
    rays: 6,
    delay: impact,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 8,
    delay: impact,
    speed: 2.4,
    size: 0.06,
    priority: std,
  })
  return impact
}

const psyPulse: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 260
  prop(ctx, source, target, {
    build: () => ringMesh(color, 0.12, 0.03),
    duration: flight,
    arc: 0,
    grow: 2.2,
    priority: std,
  })
  prop(ctx, source, target, {
    build: () => ringMesh(secondary, 0.08, 0.025),
    delay: 60,
    duration: flight - 60,
    arc: 0,
    grow: 1.6,
    priority: std,
  })
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.34,
    rays: 8,
    delay: flight,
    priority: std,
  })
  return flight
}

const poisonSting: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 200
  projectile(ctx, source, target, {
    color,
    core: secondary,
    duration: flight,
    size: 0.06,
    shape: 'shard',
    arc: 0.15,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 7,
    delay: flight,
    speed: 0.6,
    spread: 'up',
    gravity: -0.8,
    size: 0.11,
    priority: std,
  })
  cloud(ctx, at(target, 0.4), {
    color,
    count: 3,
    radius: 0.2,
    size: 0.16,
    opacity: 0.45,
    delay: flight,
    duration: 480,
    priority: std,
  })
  return flight
}

const windGust: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 220
  prop(ctx, source, target, {
    build: () => crescentMesh(secondary, 0.3),
    duration: flight,
    arc: 0.05,
    spin: -Math.PI * 3,
    priority: std,
  })
  prop(ctx, source, target, {
    build: () => crescentMesh(color, 0.2),
    delay: 50,
    duration: flight - 20,
    arc: 0.15,
    offset: side(0.3),
    spin: Math.PI * 3,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 7,
    delay: flight,
    speed: 1.6,
    spread: 'ring',
    priority: std,
  })
  return flight
}

const stoneToss: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 300
  prop(ctx, source, target, {
    build: () => rockMesh(color, 0.14),
    duration: flight,
    arc: 0.9,
    spin: 9,
    tumble: 6,
    priority: std,
  })
  spark(ctx, at(target, 0.35), {
    color: secondary,
    count: 8,
    delay: flight,
    speed: 1.3,
    spread: 'up',
    gravity: 3.4,
    duration: 380,
    size: 0.1,
    priority: std,
  })
  shockwave(ctx, ground(target), {
    color,
    delay: flight,
    radius: 0.6,
    duration: 320,
    priority: std,
  })
  return flight
}

const iceShard: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 220
  projectile(ctx, source, target, {
    color,
    core: secondary,
    duration: flight,
    size: 0.08,
    shape: 'shard',
    arc: 0.1,
    priority: std,
  })
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.32,
    rays: 6,
    delay: flight,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 7,
    delay: flight,
    speed: 1.6,
    gravity: 2.2,
    size: 0.07,
    priority: std,
  })
  return flight
}

const shadowOrb: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 300
  prop(ctx, source, target, {
    build: () => shadowBall(color, secondary),
    duration: flight,
    arc: 0.5,
    spin: 10,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 9,
    delay: flight,
    speed: 1.2,
    gravity: -0.5,
    priority: std,
  })
  flare(ctx, at(target), { color, core: secondary, size: 0.3, delay: flight, priority: std })
  return flight
}

const bite = (ctx: FxContext, target: UnitView, color: string, secondary: string, delay: number) =>
  fangs(ctx, target, {
    color: secondary,
    glowColor: color,
    size: 0.3,
    delay,
    duration: 220,
    priority: std,
  })

const bugBite: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  if (source.unit.range > 1) {
    const flight = 200
    projectile(ctx, source, target, {
      color,
      core: secondary,
      duration: flight,
      size: 0.05,
      shape: 'shard',
      arc: 0.05,
      priority: std,
    })
    bite(ctx, target, color, secondary, flight - 60)
    spark(ctx, at(target), {
      color,
      count: 5,
      delay: flight,
      speed: 1.2,
      size: 0.08,
      priority: std,
    })
    return flight
  }
  bite(ctx, target, color, secondary, 20)
  spark(ctx, at(target), {
    color,
    count: 6,
    delay: MELEE_MS,
    speed: 1.2,
    size: 0.08,
    priority: std,
  })
  return MELEE_MS
}

const forcePalm: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const impact = source.unit.range > 1 ? SHOT_MS : MELEE_MS
  if (source.unit.range > 1) {
    prop(ctx, source, target, {
      build: () => orbMesh(color, secondary, 0.1),
      duration: SHOT_MS,
      arc: 0.1,
      priority: std,
    })
  }
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.42,
    rays: 8,
    delay: impact,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 8,
    delay: impact,
    speed: 1.8,
    spread: 'ring',
    priority: std,
  })
  pushBack(ctx, target, () => source.root.position, {
    delay: impact,
    duration: 300,
    distance: 0.22,
    priority: std,
  })
  return impact
}

const dragonSpark: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  const flight = 260
  prop(ctx, source, target, {
    build: () => dragonOrb(color, secondary),
    duration: flight,
    arc: 0.35,
    spin: Math.PI * 6,
    priority: std,
  })
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.36,
    rays: 5,
    delay: flight,
    priority: std,
  })
  spark(ctx, at(target), {
    color: secondary,
    count: 8,
    delay: flight,
    speed: 2,
    size: 0.08,
    priority: std,
  })
  return flight
}

const metalSpark: AttackBuilder = (ctx, { source, target, color, secondary }) => {
  let impact = MELEE_MS
  if (source.unit.range > 1) {
    impact = SHOT_MS
    prop(ctx, source, target, {
      build: () => metalStar(secondary),
      duration: SHOT_MS,
      arc: 0.1,
      spin: Math.PI * 8,
      priority: std,
    })
  } else {
    slashArc(ctx, at(target), {
      color: secondary,
      delay: 60,
      duration: 160,
      angle: -1,
      sweep: 1.4,
      width: 0.06,
      priority: std,
    })
  }
  flare(ctx, at(target), {
    color,
    core: '#ffffff',
    size: 0.3,
    delay: impact,
    duration: 160,
    priority: std,
  })
  spark(ctx, at(target), {
    color: '#fcd34d',
    count: 8,
    delay: impact,
    speed: 2,
    gravity: 3,
    size: 0.06,
    priority: std,
  })
  return impact
}

const ATTACKS: Record<AttackType, AttackBuilder> = {
  punch,
  slash,
  projectile: bolt,
  kick,
  blunt,
  rubberPunch,
  tripleSlash,
  sniperShot,
  magmaFist,
  waterShock,
  lightning: skyLightning,
  fireKick,
  leafCut,
  flameBurst,
  aquaJet,
  thunderJolt,
  psyPulse,
  poisonSting,
  windGust,
  stoneToss,
  iceShard,
  shadowOrb,
  bugBite,
  forcePalm,
  dragonSpark,
  metalSpark,
}

const MELEE_ONLY = new Set<AttackType>([
  'punch',
  'slash',
  'kick',
  'blunt',
  'tripleSlash',
  'fireKick',
])

export function attackBuilderFor(type: AttackType, range: number): AttackBuilder {
  if (range > 1 && MELEE_ONLY.has(type)) return bolt
  return ATTACKS[type] ?? (range > 1 ? bolt : punch)
}

// Fallback auto-attack keyed by the unit's attack type, used when no per-unit attack exists.
export const typedAttack: AttackChoreography = (ctx, input) =>
  attackBuilderFor(input.source.unit.attack.type, input.source.unit.range)(ctx, input)

// Secondary ability ticks (DOT, lifesteal, chained hits): a small echo of the caster's ability.
export function abilityTick(ctx: FxContext, source: UnitView, target: UnitView): number {
  const ability = source.unit.ability
  const color = ability.color
  const secondary = ability.secondaryColor ?? '#ffffff'
  if (source.unit.abilityType === 'DOT') {
    spark(ctx, at(target, 0.45), {
      color,
      count: 6,
      speed: 0.5,
      spread: 'up',
      gravity: -0.7,
      size: 0.12,
      priority: std,
    })
    flare(ctx, at(target), { color, core: secondary, size: 0.22, duration: 200, priority: std })
    return 0
  }
  if (source.unit.abilityType === 'LIFESTEAL' && source !== target) {
    projectile(ctx, target, source, {
      color,
      core: secondary,
      duration: 320,
      size: 0.06,
      arc: 0.3,
      priority: std,
    })
    flare(ctx, at(target), { color, core: secondary, size: 0.26, priority: std })
    return 0
  }
  flare(ctx, at(target), { color, core: secondary, size: 0.28, rays: 6, priority: std })
  spark(ctx, at(target), { color: secondary, count: 7, speed: 1.4, priority: std })
  return 0
}
