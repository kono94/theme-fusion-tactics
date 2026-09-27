import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  bloom,
  drill,
  embers,
  flameTorrent,
  giantFlower,
  grassField,
  heatShimmer,
  leafBloom,
  lifeDrain,
  pollenBurst,
  powderFall,
  scorchTrail,
  splashCrown,
  tileRipple,
  waterJet,
} from '../kit/pokemonTier1'
import {
  above,
  ahead,
  alliesAround,
  beyond,
  bodyAt,
  bubbles,
  coil,
  enemiesAround,
  enemiesInLine,
  fadeInOut,
  fangs,
  fistMesh,
  flames,
  flatDirection,
  flinch,
  fx,
  groundCracks,
  pulse,
  shell,
  shiver,
  standard,
  stream,
  tube,
  zzz,
  nearestEnemy,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  crescentMesh,
  crouch,
  dash,
  flare,
  glow,
  ground,
  halo,
  leafMesh,
  leap,
  levitate,
  lightning,
  orbit,
  pillar,
  projectile,
  prop,
  pushBack,
  ringMesh,
  shake,
  shockwave,
  sigil,
  slashArc,
  spikes,
  spin,
  starGeometry,
  trail,
  vortex,
  type FxContext,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const GRASS = '#22c55e'
const VINE = '#15803d'
const FIRE = '#f97316'
const FLAME_CORE = '#fde047'
const WATER = '#3b82f6'
const FOAM = '#e0f2fe'
const POISON = '#a855f7'
const TOXIC = '#d946ef'
const WIND = '#e2e8f0'
const UP = new THREE.Vector3(0, 1, 0)

type Point = () => THREE.Vector3

const lerpPoint = (a: Point, b: Point, t: number): Point => {
  const point = new THREE.Vector3()
  return () => point.lerpVectors(a(), b(), t)
}

// Only melee units close the gap; ranged casters (and reduced motion) stay on their tile and crouch instead.
function rush(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: { delay: number; duration: number; through?: boolean; hold?: number },
): void {
  if (ctx.reducedMotion || source.unit.range > 1)
    crouch(ctx, source, { delay: options.delay, duration: 240 })
  else dash(ctx, source, target, options)
}

const victimsWith = (target: UnitView, others: UnitView[], limit: number): UnitView[] =>
  [target, ...others.filter((other) => other !== target)].slice(0, limit)

const dizzyStar = () => new THREE.Mesh(starGeometry(5, 0.08, 0.035), glow('#fde047'))

// Whip-like vine: arcs from the caster, overshoots onto the target, then recoils; a wave rolls down its length.
function vineLash(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: { side: number; delay: number; duration: number; thickness: number; color: string },
): void {
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const side = new THREE.Vector3()
  const root = bodyAt(source, 0.75)
  tube(ctx, {
    material: standard(options.color, { roughness: 0.7 }),
    delay: options.delay,
    duration: options.duration,
    radius: options.thickness,
    controlPoints: 9,
    tubularSegments: 36,
    taper: true,
    path: (p, points) => {
      from.copy(root())
      to.copy(target.root.position).setY(target.height * 0.55)
      side.subVectors(to, from).cross(UP).normalize()
      from.addScaledVector(side, options.side * 0.22)
      const reach =
        p < 0.4 ? Math.min(1, (p / 0.4) ** 0.7 * 1.08) : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3
      const crack = p < 0.45 ? 1 : 1 - Math.min(1, (p - 0.45) * 3)
      points.forEach((point, index) => {
        const t = (index / (points.length - 1)) * reach
        point.lerpVectors(from, to, t)
        point.y += Math.sin(Math.PI * t) * 0.9 * crack
        point.addScaledVector(
          side,
          options.side * Math.sin(Math.PI * t) * 0.45 + Math.sin(t * 10 - p * 24) * 0.06 * crack,
        )
      })
    },
  })
}

const bulbasaurVineWhip: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 200 })
  burst(ctx, bodyAt(source, 0.85), {
    color: GRASS,
    count: 8,
    spread: 'up',
    speed: 0.8,
    duration: 400,
  })
  vineLash(ctx, source, target, {
    side: 1,
    delay: 120,
    duration: 620,
    thickness: 0.045,
    color: VINE,
  })
  vineLash(ctx, source, target, {
    side: -1,
    delay: 210,
    duration: 620,
    thickness: 0.045,
    color: '#16a34a',
  })
  const impact = 330
  slashArc(ctx, at(target), {
    color: '#86efac',
    delay: impact,
    angle: -0.8,
    radius: 0.5,
    sweep: 1.4,
  })
  slashArc(ctx, at(target), {
    color: GRASS,
    delay: impact + 90,
    angle: 1.8,
    radius: 0.55,
    sweep: 1.4,
  })
  burst(ctx, at(target), { color: '#bbf7d0', count: 12, delay: impact, speed: 1.6 })
  coil(ctx, target, { color: VINE, delay: impact + 60, duration: 750, turns: 3, thickness: 0.035 })
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1.2 }), impact + 90, 40)
  shake(ctx, strength, impact)
  return impact
}

const ivysaurRazorLeaf: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  burst(ctx, bodyAt(source, 0.9), {
    color: GRASS,
    count: 10,
    spread: 'up',
    speed: 1,
    duration: 420,
  })
  for (let index = 0; index < 4; index++) {
    prop(ctx, source, target, {
      build: () => leafMesh(index % 2 ? '#a3e635' : GRASS, 0.15),
      delay: 120 + index * 50,
      duration: 260,
      arc: 0.2 + index * 0.1,
      tumble: 14,
      from: bodyAt(source, 0.9),
    })
  }
  orbit(ctx, target, {
    color: GRASS,
    count: 10,
    radius: 0.9,
    turns: 2,
    collapse: 0.15,
    build: (index) => leafMesh(index % 3 ? GRASS : '#a3e635', 0.13),
    delay: 300,
    duration: 650,
  })
  const strike = 300 + 650 * 0.75
  ;[-1.4, 0.2, 1.6].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index === 1 ? '#bef264' : GRASS,
      delay: strike + index * 50,
      angle,
      radius: 0.6,
      sweep: 1.2,
    }),
  )
  const victims = victimsWith(target, enemiesAround(ctx, source, target, 1.6), 4)
  victims.forEach((victim, index) => {
    halo(ctx, victim, {
      color: '#94a3b8',
      direction: 'fall',
      delay: strike + 80 + index * 40,
      duration: 500,
    })
    burst(ctx, at(victim), {
      color: '#64748b',
      count: 10,
      delay: strike + 160 + index * 40,
      speed: 1.1,
      gravity: 2.6,
    })
  })
  shockwave(ctx, ground(target), { color: '#4d7c0f', delay: strike, radius: 1.6, duration: 500 })
  flinch(ctx, victims.slice(1), strike + 40, 40)
  shake(ctx, strength, strike)
  return strike
}

const venusaurGrassyTerrain: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 360 })
  levitate(ctx, source, { delay: 300, duration: 900, height: 0.12, wobble: 0.06 })
  giantFlower(ctx, source, { size: 0.55, pulses: [0.21, 0.45], duration: 1800 })
  const flower = bodyAt(source, 1.15)
  const allies = alliesAround(ctx, source, 3.2, 5)
  pollenBurst(ctx, flower, allies, { count: 80, travel: 0.35, delay: 380, duration: 1400 })
  grassField(ctx, ground(source), {
    radius: 3.1,
    count: 170,
    flowers: 16,
    delay: 220,
    duration: 1700,
  })
  shockwave(ctx, ground(source), { color: '#4ade80', delay: 240, radius: 3, duration: 800 })
  allies.forEach((ally, index) => {
    const delay = 420 + index * 80
    tileRipple(ctx, ally, { delay, duration: 1050 })
    coil(ctx, ally, {
      color: index % 2 ? '#15803d' : '#166534',
      delay: delay + 80,
      duration: 900,
      turns: 2,
      radius: 0.4,
      thickness: 0.028,
    })
    aura(ctx, ally, { color: '#86efac', delay: delay + 220, duration: 900, count: 14 })
  })
  return 700
}

const charmanderEmber: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  burst(ctx, bodyAt(source, 0.3), {
    color: FIRE,
    count: 8,
    spread: 'up',
    speed: 0.7,
    duration: 380,
  })
  ;[-0.25, 0.1, 0.3].forEach((offset, index) => {
    const delay = 160 + index * 70
    projectile(ctx, source, target, {
      color: FIRE,
      core: FLAME_CORE,
      delay,
      duration: 280,
      size: 0.08 + index * 0.015,
      arc: 0.35 + offset,
      from: ahead(source, target, 0.3, 0.6),
    })
    burst(ctx, at(target), {
      color: index === 2 ? FLAME_CORE : FIRE,
      count: 8,
      delay: delay + 280,
      speed: 1.2,
      spread: 'up',
      gravity: 0.4,
    })
  })
  pillar(ctx, ground(target), { color: FIRE, delay: 580, duration: 450, height: 0.8, radius: 0.25 })
  shake(ctx, strength, 440)
  return 440
}

const charmeleonFireFang: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  aura(ctx, source, { color: FIRE, duration: 500, count: 14 })
  rush(ctx, source, target, { delay: 180, duration: 520, hold: 0.25 })
  trail(ctx, source, { color: FIRE, delay: 180, duration: 320 })
  fangs(ctx, target, {
    color: '#fff7ed',
    glowColor: FIRE,
    size: 0.4,
    teeth: 3,
    delay: 220,
    duration: 460,
  })
  const impact = 220 + 460 * 0.55
  burst(ctx, at(target), {
    color: FIRE,
    count: 20,
    delay: impact,
    speed: 2,
    spread: 'up',
    gravity: 0.5,
  })
  flare(ctx, at(target), { color: FIRE, core: FLAME_CORE, delay: impact, size: 0.5 })
  pillar(ctx, ground(target), {
    color: '#ea580c',
    delay: impact,
    duration: 550,
    height: 1.4,
    radius: 0.35,
  })
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength, impact)
  return impact
}

const charizardFlamethrower: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 1500, height: 0.4, wobble: 0.05 })
  crouch(ctx, source, { delay: 60, duration: 260 })
  const muzzle = ahead(source, target, 0.32, 0.75)
  const far = beyond(source, target, 2, 0.45)
  flames(ctx, bodyAt(source, 0.15), {
    color: FIRE,
    core: FLAME_CORE,
    count: 5,
    radius: 0.12,
    height: 0.5,
    duration: 1400,
  })
  chargeOrb(ctx, muzzle, { color: FIRE, core: '#fbbf24', size: 0.17, count: 12, duration: 300 })
  const start = 280
  const blast = 950
  flameTorrent(ctx, muzzle, far, { radius: 0.75, puffs: 20, delay: start, duration: blast })
  heatShimmer(ctx, muzzle, far, { delay: start + 60, duration: blast + 300 })
  embers(ctx, muzzle, far, { count: 40, spread: 0.55, delay: start + 150, duration: 1500 })
  scorchTrail(ctx, ground(target), far, {
    width: 0.45,
    count: 6,
    delay: start + 150,
    duration: 1700,
  })
  const impact = start + 170
  const victims = [
    target,
    ...enemiesInLine(ctx, source, target, { overshoot: 2, width: 0.8, limit: 2 }),
  ]
  victims.forEach((victim, index) => {
    const delay = impact + index * 80
    flames(ctx, ground(victim), {
      color: '#ea580c',
      core: '#fbbf24',
      count: 7,
      radius: 0.3,
      height: 0.75,
      delay: delay + 120,
      duration: 1100,
    })
    burst(ctx, at(victim), {
      color: '#f97316',
      count: 14,
      delay,
      speed: 1.5,
      spread: 'up',
      gravity: -0.3,
      duration: 800,
    })
  })
  flinch(ctx, victims.slice(1), impact + 80, 80)
  cameraPunch(ctx, at(target), 0.4, impact)
  shake(ctx, strength + 1, impact, 650)
  return impact
}

const squirtleWaterGun: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  const muzzle = ahead(source, target, 0.3, 0.6)
  const far = beyond(source, target, 1.2, 0.5)
  chargeOrb(ctx, muzzle, {
    color: '#38bdf8',
    core: '#bae6fd',
    size: 0.12,
    count: 10,
    duration: 200,
  })
  const fire = 190
  waterJet(ctx, muzzle, far, {
    radius: 0.07,
    grow: 0.2,
    rings: 3,
    spray: 28,
    delay: fire,
    duration: 640,
  })
  pushBack(ctx, source, at(target), { delay: fire, duration: 420, distance: 0.12 })
  shiver(ctx, source, { delay: fire, duration: 500, amount: 0.02, speed: 70 })
  const impact = fire + 90
  splashCrown(ctx, ground(target), {
    radius: 0.38,
    height: 0.55,
    tips: 11,
    delay: impact,
    duration: 850,
  })
  pushBack(ctx, target, at(source), { delay: impact, duration: 420, distance: 0.18 })
  cloud(ctx, at(target, 0.4), {
    color: '#bae6fd',
    count: 5,
    radius: 0.4,
    size: 0.22,
    rise: 0.35,
    opacity: 0.22,
    delay: impact + 150,
    duration: 900,
  })
  const others = enemiesInLine(ctx, source, target, { overshoot: 1.2, limit: 2 })
  others.forEach((victim, index) =>
    splashCrown(ctx, ground(victim), {
      radius: 0.28,
      height: 0.35,
      tips: 8,
      delay: impact + 60 + index * 50,
      duration: 700,
    }),
  )
  flinch(ctx, others, impact + 60, 50)
  shake(ctx, strength, impact)
  return impact
}

const wartortleShellGuard: Choreography = (ctx, { source, shake: strength }) => {
  crouch(ctx, source, { duration: 420 })
  spin(ctx, source, { duration: 520, turns: ctx.reducedMotion ? 0 : 2 })
  vortex(ctx, ground(source), {
    color: '#93c5fd',
    secondary: FOAM,
    height: 1.4,
    radius: 0.6,
    rings: 5,
    delay: 80,
    duration: 600,
  })
  shockwave(ctx, ground(source), { color: WATER, delay: 300, radius: 3, duration: 650 })
  alliesAround(ctx, source, 3, 5).forEach((ally, index) =>
    shell(ctx, ally, {
      color: ally === source ? '#60a5fa' : '#93c5fd',
      edge: ally === source ? '#fde68a' : FOAM,
      delay: 320 + index * 60,
      duration: 900,
      radius: ally === source ? 0.7 : 0.6,
      detail: 0,
    }),
  )
  shake(ctx, Math.max(1, strength - 1), 320)
  return 320
}

function cannonPoint(
  source: UnitView,
  target: UnitView,
  sign: number,
  extension: () => number,
): Point {
  const point = new THREE.Vector3()
  const side = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const shoulder = bodyAt(source, 0.9)
  return () => {
    flatDirection(source, target, direction)
    side.crossVectors(direction, UP)
    return point
      .copy(shoulder())
      .addScaledVector(side, sign * 0.3)
      .addScaledVector(direction, extension())
  }
}

const blastoiseHydroCannon: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 360 })
  let extension = 0
  const group = new THREE.Group()
  const barrels = [1, -1].map((sign) => {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.09, 1, 14, 1, true).rotateX(Math.PI / 2),
      standard('#94a3b8', { metalness: 0.85, roughness: 0.3 }),
    )
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.02, 8, 18),
      standard('#475569', { roughness: 0.4 }),
    )
    rim.position.z = 0.5
    barrel.add(rim)
    group.add(barrel)
    return {
      barrel,
      base: cannonPoint(source, target, sign, () => 0),
      tip: cannonPoint(source, target, sign, () => extension),
    }
  })
  const aim = beyond(source, target, 2)
  fx(ctx, 0, 1500, group, (p) => {
    extension = 0.55 * Math.min(1, (p * 1500) / 260) * (p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1)
    const look = aim()
    barrels.forEach(({ barrel, base, tip }) => {
      const muzzle = tip()
      barrel.position.lerpVectors(base(), muzzle, 0.5)
      barrel.lookAt(look.x, muzzle.y, look.z)
      barrel.scale.set(1, 1, Math.max(0.01, extension))
    })
  })
  const charge = 300
  barrels.forEach(({ tip }) =>
    chargeOrb(ctx, tip, {
      color: '#38bdf8',
      core: '#bae6fd',
      size: 0.24,
      count: 14,
      delay: charge,
      duration: 420,
    }),
  )
  const fire = charge + 420
  const far = beyond(source, target, 2.5, 0.55)
  barrels.forEach(({ tip }) =>
    waterJet(ctx, tip, far, {
      radius: 0.12,
      flare: 1.7,
      grow: 0.14,
      rings: 4,
      spray: 34,
      delay: fire,
      duration: 780,
    }),
  )
  crouch(ctx, source, { delay: fire, duration: 300 })
  pushBack(ctx, source, at(target), { delay: fire, duration: 480, distance: 0.35 })
  const impact = fire + 90
  splashCrown(ctx, ground(target), {
    radius: 0.7,
    height: 1.1,
    tips: 16,
    delay: impact,
    duration: 1050,
  })
  splashCrown(ctx, ground(target), {
    color: '#0ea5e9',
    radius: 0.32,
    height: 2,
    tips: 8,
    delay: impact + 120,
    duration: 900,
  })
  shockwave(ctx, ground(target), { color: WATER, delay: impact, radius: 2.2, duration: 700 })
  shockwave(ctx, ground(target), {
    color: '#7dd3fc',
    delay: impact + 180,
    radius: 1.5,
    duration: 600,
  })
  pushBack(ctx, target, at(source), { delay: impact, duration: 520, distance: 0.4, lift: 0.1 })
  cloud(ctx, at(target, 0.5), {
    color: '#bae6fd',
    count: 7,
    radius: 0.6,
    size: 0.3,
    rise: 0.5,
    opacity: 0.22,
    delay: impact + 200,
    duration: 1100,
  })
  const others = enemiesInLine(ctx, source, target, { overshoot: 2.5, width: 0.9, limit: 2 })
  others.forEach((victim, index) =>
    splashCrown(ctx, ground(victim), {
      radius: 0.4,
      height: 0.6,
      tips: 10,
      delay: impact + 70 + index * 60,
      duration: 800,
    }),
  )
  flinch(ctx, others, impact + 70, 60)
  cameraPunch(ctx, at(target), 0.6, impact - 60)
  shake(ctx, strength + 2, impact, 650)
  return impact
}

const caterpieStringShot: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  const from = ahead(source, target, 0.3, 0.55)
  const to = new THREE.Vector3()
  const start = new THREE.Vector3()
  const side = new THREE.Vector3()
  ;[-1, 0, 1].forEach((lane, index) => {
    tube(ctx, {
      material: standard('#f8fafc', { opacity: 0.95, roughness: 0.8 }),
      delay: 140 + index * 50,
      duration: 700,
      radius: 0.014,
      controlPoints: 8,
      tubularSegments: 28,
      radialSegments: 4,
      path: (p, points) => {
        start.copy(from())
        to.copy(target.root.position).setY(target.height * (0.4 + index * 0.15))
        side.subVectors(to, start).cross(UP).normalize()
        const reach = Math.min(1, p / 0.3)
        points.forEach((point, pointIndex) => {
          const t = (pointIndex / (points.length - 1)) * reach
          point.lerpVectors(start, to, t)
          point.addScaledVector(
            side,
            lane * 0.18 * Math.sin(Math.PI * t) + Math.sin(t * 14 + p * 10) * 0.03,
          )
          point.y += Math.sin(Math.PI * t) * 0.15
        })
      },
      opacity: (p) => 0.95 * fadeInOut(p, 0.02, 0.2),
    })
  })
  const impact = 140 + 700 * 0.3
  coil(ctx, target, {
    color: '#f1f5f9',
    delay: impact,
    duration: 950,
    turns: 6,
    thickness: 0.018,
    radius: 0.36,
  })
  coil(ctx, target, {
    color: '#e2e8f0',
    delay: impact + 80,
    duration: 870,
    turns: 4,
    thickness: 0.014,
    radius: 0.4,
  })
  burst(ctx, at(target), { color: '#ffffff', count: 10, delay: impact, speed: 0.9 })
  levitate(ctx, target, { delay: impact, duration: 700, height: 0, wobble: 0.15 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const metapodHarden: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 300 })
  crouch(ctx, source, { delay: 320, duration: 300 })
  shell(ctx, source, {
    color: '#65a30d',
    edge: '#d9f99d',
    delay: 100,
    duration: 1000,
    radius: 0.62,
    detail: 1,
    material: 'metal',
  })
  slashArc(ctx, at(source, 0.7), {
    color: '#ffffff',
    delay: 360,
    angle: 0.6,
    radius: 0.45,
    width: 0.05,
    sweep: 1.2,
    duration: 260,
  })
  flare(ctx, at(source, 0.85), { color: '#ecfccb', delay: 520, size: 0.3 })
  shockwave(ctx, ground(source), { color: '#84cc16', delay: 150, radius: 1.1, duration: 500 })
  return 160
}

function butterflyWings(
  ctx: FxContext,
  source: UnitView,
  color: string,
  delay: number,
  duration: number,
): void {
  const group = new THREE.Group()
  const wings = [1, -1].map((sign) => {
    const pivot = new THREE.Group()
    const upper = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 20).scale(1, 0.75, 1).translate(0.34 * sign, 0.12, 0),
      standard(color, { opacity: 0.85, roughness: 0.5 }),
    )
    const lower = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 16).scale(1, 0.8, 1).translate(0.24 * sign, -0.2, 0),
      standard(color, { opacity: 0.85, roughness: 0.5 }),
    )
    const vein = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.24, 20).translate(0.34 * sign, 0.12, 0.01),
      standard('#1e293b', { opacity: 0.9 }),
    )
    pivot.add(upper, lower, vein)
    group.add(pivot)
    return { pivot, sign }
  })
  const anchor = bodyAt(source, 0.6)
  fx(ctx, delay, duration, group, (p) => {
    group.position.copy(anchor())
    group.quaternion.copy(ctx.camera.quaternion)
    wings.forEach(({ pivot, sign }) => {
      pivot.rotation.y = sign * Math.sin(p * Math.PI * 12) * 0.9
    })
    group.scale.setScalar(Math.max(0.01, fadeInOut(p, 0.1, 0.15)))
  })
}

const butterfreeSleepPowder: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 1300, height: 0.6, wobble: 0.08 })
  butterflyWings(ctx, source, '#e0e7ff', 0, 1300)
  const center = target.root.position.clone()
  const above = center.clone().setY(1.9)
  stream(ctx, bodyAt(source, 1), () => above, {
    color: '#a5f3fc',
    count: 30,
    spread: 0.4,
    delay: 200,
    duration: 600,
    travel: 0.4,
    wobble: 0.15,
  })
  powderFall(ctx, () => center, {
    color: '#5eead4',
    count: 50,
    radius: 1.3,
    height: 1.9,
    delay: 380,
    duration: 1100,
    swirl: 5,
  })
  powderFall(ctx, () => center, {
    color: '#c4b5fd',
    count: 24,
    radius: 1.1,
    height: 1.7,
    size: 0.08,
    delay: 450,
    duration: 1000,
    swirl: -4,
  })
  const impact = 700
  const sleepers = victimsWith(target, enemiesAround(ctx, source, center, 1.6), 4)
  sleepers.forEach((victim, index) => {
    zzz(ctx, victim, { color: '#a5f3fc', delay: impact + index * 80, duration: 1000 })
    levitate(ctx, victim, { delay: impact + index * 80, duration: 800, height: 0, wobble: 0.12 })
  })
  flinch(ctx, sleepers.slice(1), impact + 80, 80)
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const weedlePoisonSting: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  burst(ctx, bodyAt(source, 1), {
    color: POISON,
    count: 6,
    spread: 'up',
    speed: 0.6,
    duration: 320,
  })
  ;[0, 90].forEach((offset, index) => {
    projectile(ctx, source, target, {
      color: POISON,
      core: '#f5d0fe',
      delay: 180 + offset,
      duration: 200,
      size: 0.06,
      arc: 0.05,
      shape: 'shard',
      from: bodyAt(source, 1),
    })
    burst(ctx, at(target), {
      color: index ? TOXIC : POISON,
      count: 10,
      delay: 380 + offset,
      speed: 1.1,
      gravity: 0.2,
    })
  })
  cloud(ctx, at(target, 0.3), {
    color: '#7e22ce',
    count: 5,
    radius: 0.35,
    size: 0.18,
    rise: 0.4,
    delay: 470,
    duration: 700,
  })
  shake(ctx, strength, 380)
  return 380
}

const kakunaIronDefense: Choreography = (ctx, { source }) => {
  crouch(ctx, source, { duration: 200 })
  shell(ctx, source, {
    color: '#cbd5e1',
    edge: '#fde68a',
    delay: 120,
    duration: 1000,
    radius: 0.65,
    detail: 0,
    material: 'metal',
  })
  shockwave(ctx, ground(source), { color: '#e2e8f0', delay: 140, radius: 1.2, duration: 420 })
  ;[-0.4, 1.8].forEach((angle, index) =>
    slashArc(ctx, at(source, 0.6), {
      color: '#fef9c3',
      delay: 320 + index * 140,
      angle,
      radius: 0.55,
      width: 0.04,
      sweep: 1,
      duration: 220,
    }),
  )
  flare(ctx, at(source, 0.9), { color: '#fde68a', rays: 6, delay: 340, size: 0.4 })
  return 140
}

const beedrillFellStinger: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 380, height: 0.5, wobble: 0.1 })
  rush(ctx, source, target, { delay: 300, duration: 520, hold: 0.15 })
  trail(ctx, source, { color: '#facc15', delay: 300, duration: 300 })
  const side = new THREE.Vector3()
  const origin = bodyAt(source, 0.55)
  const aim = at(target)
  ;[1, -1].forEach((sign, index) =>
    drill(ctx, {
      color: '#e2e8f0',
      stripe: TOXIC,
      length: 0.7,
      radius: 0.1,
      delay: 300 + index * 80,
      duration: 200,
      spin: 0,
      from: () => {
        side.crossVectors(flatDirection(source, target), UP)
        return origin()
          .clone()
          .addScaledVector(side, sign * 0.3)
      },
      to: () =>
        aim()
          .clone()
          .addScaledVector(side, sign * 0.08),
    }),
  )
  const impact = 500
  burst(ctx, at(target), { color: POISON, count: 18, delay: impact, speed: 1.8 })
  slashArc(ctx, at(target), { color: TOXIC, delay: impact, angle: 0.8, radius: 0.55, sweep: 0.6 })
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  halo(ctx, source, { color: '#ef4444', direction: 'rise', delay: impact + 150, duration: 600 })
  aura(ctx, source, { color: '#f87171', delay: impact + 150, duration: 700, count: 14 })
  shake(ctx, strength, impact)
  return impact
}

const pidgeyGust: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 800, height: 0.35, wobble: 0.1 })
  stream(ctx, ahead(source, target, 0.3, 0.5), beyond(source, target, 1, 0.4), {
    color: '#f1f5f9',
    count: 30,
    spread: 0.5,
    delay: 180,
    duration: 500,
    travel: 0.4,
    wobble: 0.15,
  })
  const impact = 380
  vortex(ctx, ground(target), {
    color: WIND,
    secondary: '#cbd5e1',
    height: 1.3,
    radius: 0.5,
    rings: 5,
    delay: 300,
    duration: 650,
  })
  levitate(ctx, target, { delay: impact, duration: 500, height: 0.25, wobble: 0.2 })
  burst(ctx, at(target), {
    color: '#d6d3d1',
    count: 12,
    delay: impact,
    spread: 'ring',
    speed: 1.4,
    gravity: 0,
  })
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1 }), impact + 60, 40)
  shake(ctx, strength, impact)
  return impact
}

// Crescent blade laid flat so it slices horizontally, convex edge leading.
const airBlade = (radius: number, tilt: number) => () => {
  const holder = new THREE.Group()
  const blade = crescentMesh('#a5f3fc', radius)
  const edge = crescentMesh('#ffffff', radius * 0.94)
  edge.scale.setScalar(1.04)
  blade.add(edge)
  blade.rotation.set(Math.PI / 2, 0, tilt)
  holder.add(blade)
  return holder
}

const pidgeottoAirCutter: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 700, height: 0.4, wobble: 0.08 })
  crouch(ctx, source, { delay: 120, duration: 160 })
  const far = beyond(source, target, 1.8, 0.5)
  ;[-0.5, 0.4, 0].forEach((tilt, index) =>
    prop(ctx, source, target, {
      build: airBlade(0.35 + index * 0.05, tilt),
      from: ahead(source, target, 0.3, 0.6),
      to: far,
      delay: 220 + index * 70,
      duration: 360,
      arc: 0,
      grow: 0.5,
      fadeOut: 0.2,
    }),
  )
  const impact = 220 + 360 * 0.6
  ;[-1.2, 0.3, 1.5].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: '#cffafe',
      delay: impact + index * 70,
      angle,
      radius: 0.5,
      width: 0.08,
      sweep: 0.8,
      duration: 200,
    }),
  )
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1.8 }), impact + 80, 60)
  shake(ctx, strength, impact)
  return impact
}

const pidgeotTailwind: Choreography = (ctx, { source }) => {
  levitate(ctx, source, { duration: 1300, height: 0.9, wobble: 0.12 })
  vortex(ctx, ground(source), {
    color: '#e0f2fe',
    secondary: '#bae6fd',
    height: 2.2,
    radius: 0.8,
    rings: 6,
    duration: 900,
  })
  orbit(ctx, source, {
    color: '#fef3c7',
    count: 8,
    radius: 0.8,
    turns: 2,
    collapse: 2.2,
    build: (index) => leafMesh(index % 2 ? '#fef3c7' : '#d6a45a', 0.1),
    delay: 150,
    duration: 1000,
  })
  const allies = alliesAround(ctx, source, 4, 5)
  allies.forEach((ally, index) => {
    const delay = 300 + index * 60
    const behind = new THREE.Vector3(-1.6, 0.4, 0)
    const ahead = new THREE.Vector3(1.6, 0.8, 0)
    stream(
      ctx,
      () => ally.root.position.clone().add(behind),
      () => ally.root.position.clone().add(ahead),
      {
        color: '#bae6fd',
        count: 18,
        spread: 0.3,
        size: 0.1,
        delay,
        duration: 600,
        travel: 0.3,
        wobble: 0.1,
      },
    )
    halo(ctx, ally, { color: '#7dd3fc', direction: 'rise', delay: delay + 100, duration: 600 })
  })
  shockwave(ctx, ground(source), { color: '#e0f2fe', delay: 250, radius: 4, duration: 700 })
  return 300
}

const rattataQuickAttack: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 140 })
  rush(ctx, source, target, { delay: 120, duration: 420, through: true, hold: 0.1 })
  trail(ctx, source, { color: '#ffffff', delay: 120, duration: 300 })
  stream(ctx, bodyAt(source, 0.5), beyond(source, target, 0.6, 0.5), {
    color: '#e2e8f0',
    count: 16,
    spread: 0.2,
    size: 0.1,
    delay: 120,
    duration: 260,
    travel: 0.6,
  })
  const impact = 230
  flare(ctx, at(target), { color: '#e9d5ff', delay: impact, size: 0.45 })
  burst(ctx, at(target), {
    color: '#ffffff',
    count: 14,
    delay: impact,
    spread: 'ring',
    speed: 1.8,
    gravity: 0,
    duration: 360,
  })
  shake(ctx, strength, impact)
  return impact
}

const raticateHyperFang: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  rush(ctx, source, target, { delay: 220, duration: 480, hold: 0.2 })
  fangs(ctx, target, { color: '#fffbeb', size: 0.55, teeth: 2, delay: 200, duration: 440 })
  const impact = 200 + 440 * 0.55
  burst(ctx, at(target), { color: '#fef3c7', count: 18, delay: impact, speed: 2 })
  shockwave(ctx, ground(target), { color: '#fbbf24', delay: impact, radius: 1.1, duration: 420 })
  cameraPunch(ctx, at(target), 0.4, impact - 50)
  shake(ctx, strength, impact)
  return impact
}

const raticateSuperFang: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 320 })
  aura(ctx, source, { color: '#a855f7', duration: 500, count: 18 })
  leap(ctx, source, { delay: 260, duration: 460, height: ctx.reducedMotion ? 0.1 : 0.6 })
  rush(ctx, source, target, { delay: 260, duration: 560, hold: 0.25 })
  fangs(ctx, target, {
    color: '#ffffff',
    glowColor: '#c026d3',
    size: 0.7,
    teeth: 4,
    delay: 280,
    duration: 520,
  })
  const impact = 280 + 520 * 0.55
  ;[-0.8, 0.8].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index ? '#e879f9' : '#a855f7',
      delay: impact + 40,
      angle: angle - Math.PI / 2,
      radius: 0.75,
      width: 0.18,
      sweep: 0.5,
      duration: 320,
    }),
  )
  burst(ctx, at(target), { color: '#f0abfc', count: 26, delay: impact, speed: 2.4 })
  shockwave(ctx, ground(target), { color: '#c026d3', delay: impact, radius: 1.8, duration: 550 })
  cameraPunch(ctx, at(target), 0.6, impact - 60)
  shake(ctx, strength + 1, impact, 400)
  return impact
}

const spearowPeck: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 600, height: 0.3, wobble: 0.1 })
  rush(ctx, source, target, { delay: 120, duration: 520, hold: 0.3 })
  ;[0, 90, 180].forEach((offset, index) => {
    const spot = at(target, 0.5 + index * 0.08)
    drill(ctx, {
      color: '#fb923c',
      stripe: '#fff7ed',
      length: 0.3,
      radius: 0.07,
      delay: 220 + offset,
      duration: 110,
      spin: 4,
      from: bodyAt(source, 0.6),
      to: spot,
    })
    burst(ctx, spot, { color: '#fde68a', count: 6, delay: 330 + offset, speed: 1.1 })
  })
  shake(ctx, strength, 330)
  return 330
}

const fearowDrillPeck: Choreography = (ctx, { source, target, shake: strength }) => {
  levitate(ctx, source, { duration: 900, height: 0.5, wobble: 0.05 })
  spin(ctx, source, { delay: 250, duration: 500, turns: ctx.reducedMotion ? 0 : 3 })
  rush(ctx, source, target, { delay: 250, duration: 650, through: true, hold: 0.2 })
  trail(ctx, source, { color: '#fdba74', delay: 250, duration: 400 })
  const beak = ahead(source, target, 0.3, 0.55)
  const far = beyond(source, target, 1.2, 0.55)
  drill(ctx, {
    color: '#f59e0b',
    stripe: '#78350f',
    length: 0.75,
    radius: 0.18,
    delay: 250,
    duration: 330,
    spin: 60,
    from: beak,
    to: far,
  })
  for (let index = 0; index < 3; index++) {
    prop(ctx, source, target, {
      build: () => ringMesh('#fde68a', 0.22, 0.025),
      from: lerpPoint(beak, far, 0.1 + index * 0.1),
      to: lerpPoint(beak, far, 0.35 + index * 0.25),
      delay: 260 + index * 55,
      duration: 240,
      arc: 0,
      grow: 1,
      fadeOut: 0.5,
    })
  }
  const impact = 250 + 330 * 0.7
  burst(ctx, at(target), {
    color: '#fbbf24',
    count: 18,
    delay: impact,
    spread: 'ring',
    speed: 1.8,
    gravity: 0,
  })
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1.2 }), impact + 60, 40)
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength, impact)
  return impact
}

const fearowDrillRun: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 300 })
  aura(ctx, source, { color: '#a16207', duration: 500, count: 16 })
  spin(ctx, source, { delay: 300, duration: 700, turns: ctx.reducedMotion ? 0 : 5 })
  rush(ctx, source, target, { delay: 300, duration: 800, through: true, hold: 0.25 })
  const far = beyond(source, target, 2.2, 0.45)
  drill(ctx, {
    color: '#b45309',
    stripe: '#fde68a',
    length: 1.3,
    radius: 0.34,
    delay: 300,
    duration: 460,
    spin: 90,
    from: ahead(source, target, 0.3, 0.45),
    to: far,
  })
  const low = new THREE.Vector3()
  const lowFar = new THREE.Vector3()
  stream(
    ctx,
    () => low.copy(source.root.position).setY(0.15),
    () => lowFar.copy(far()).setY(0.2),
    {
      color: '#a8a29e',
      count: 40,
      spread: 0.6,
      size: 0.18,
      delay: 320,
      duration: 700,
      travel: 0.35,
      rise: 0.4,
    },
  )
  const impact = 300 + 460 * 0.55
  const others = enemiesInLine(ctx, source, target, { overshoot: 2.2, width: 0.8, limit: 2 })
  ;[target, ...others].forEach((victim, index) => {
    spikes(ctx, ground(victim), {
      color: '#78716c',
      count: 5,
      radius: 0.55,
      height: 0.45,
      width: 0.12,
      solid: true,
      delay: impact + index * 60,
      duration: 650,
    })
    burst(ctx, at(victim, 0.3), {
      color: '#d6d3d1',
      count: 14,
      delay: impact + index * 60,
      speed: 1.6,
      gravity: 2.6,
    })
  })
  shockwave(ctx, ground(target), { color: '#fbbf24', delay: impact, radius: 1.8, duration: 550 })
  flinch(ctx, others, impact + 60, 60)
  cameraPunch(ctx, at(target), 0.5, impact - 50)
  shake(ctx, strength + 1, impact, 450)
  return impact
}

const nidoranFVenomDrench: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  projectile(ctx, source, target, {
    color: POISON,
    core: '#e9d5ff',
    delay: 200,
    duration: 380,
    size: 0.17,
    arc: 1.2,
    from: ahead(source, target, 0.3, 0.6),
  })
  const impact = 580
  burst(ctx, at(target, 0.9), {
    color: TOXIC,
    count: 22,
    delay: impact,
    speed: 1.6,
    gravity: 3,
    duration: 700,
  })
  cloud(ctx, ground(target), {
    color: '#6b21a8',
    count: 6,
    radius: 0.5,
    size: 0.25,
    rise: 0.05,
    opacity: 0.6,
    delay: impact + 60,
    duration: 900,
  })
  burst(ctx, at(target, 0.2), {
    color: '#c084fc',
    count: 10,
    delay: impact + 300,
    spread: 'up',
    speed: 0.5,
    gravity: -0.2,
    duration: 700,
  })
  shake(ctx, strength, impact)
  return impact
}

const caltrop = () =>
  new THREE.Mesh(new THREE.OctahedronGeometry(0.06).scale(1, 1.8, 1), glow(TOXIC))

const nidorinaToxicSpikes: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 240 })
  const center = target.root.position.clone()
  const spots = [
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(0.7, 0.1, 0.4),
    new THREE.Vector3(-0.6, 0.1, 0.5),
    new THREE.Vector3(0.1, 0.1, -0.7),
  ].map((offset) => offset.add(center))
  spots.forEach((landing, index) => {
    prop(ctx, source, target, {
      build: caltrop,
      from: bodyAt(source, 0.8),
      to: landing,
      delay: 180 + index * 50,
      duration: 320,
      arc: 1,
      spin: 10,
    })
    spikes(ctx, landing, {
      color: TOXIC,
      count: 4,
      radius: 0.3,
      height: 0.35,
      width: 0.06,
      delay: 500 + index * 50,
      duration: 800,
    })
  })
  const impact = 520
  const victims = victimsWith(target, enemiesAround(ctx, source, center, 1.4), 4)
  victims.forEach((victim, index) =>
    burst(ctx, at(victim, 0.3), {
      color: '#c084fc',
      count: 10,
      delay: impact + index * 50,
      spread: 'up',
      speed: 1,
      gravity: 0.2,
    }),
  )
  shockwave(ctx, ground(target), { color: POISON, delay: impact, radius: 1.5, duration: 500 })
  flinch(ctx, victims.slice(1), impact + 50, 50)
  shake(ctx, strength, impact)
  return impact
}

const nidoqueenEarthPower: Choreography = (ctx, { source, target, shake: strength }) => {
  leap(ctx, source, { duration: 520, height: ctx.reducedMotion ? 0.1 : 0.9, slam: true })
  const stomp = 470
  shockwave(ctx, ground(source), { color: '#a16207', delay: stomp, radius: 1.5, duration: 450 })
  const center = target.root.position.clone()
  groundCracks(ctx, center, {
    color: '#fb923c',
    count: 7,
    length: 1.6,
    delay: stomp,
    duration: 900,
  })
  sigil(ctx, center, {
    color: '#ea580c',
    secondary: '#fdba74',
    radius: 1.4,
    points: 5,
    delay: stomp + 100,
    duration: 700,
  })
  const impact = stomp + 280
  const eruptions = victimsWith(target, enemiesAround(ctx, source, center, 1.8), 4)
  eruptions.forEach((victim, index) => {
    const delay = impact + index * 70
    pillar(ctx, ground(victim), {
      color: '#f97316',
      delay,
      duration: 600,
      height: 2.4,
      radius: 0.4,
    })
    burst(ctx, at(victim, 0.3), {
      color: '#78350f',
      count: 14,
      delay,
      spread: 'up',
      speed: 2.2,
      gravity: 3,
    })
  })
  flinch(ctx, eruptions.slice(1), impact + 70, 70)
  cameraPunch(ctx, center, 0.45, impact - 60)
  shake(ctx, strength + 1, stomp, 700)
  return impact
}

const nidoranMHornAttack: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  rush(ctx, source, target, { delay: 180, duration: 440, hold: 0.2 })
  drill(ctx, {
    color: '#e9d5ff',
    stripe: POISON,
    length: 0.45,
    radius: 0.09,
    delay: 180,
    duration: 200,
    spin: 0,
    from: bodyAt(source, 0.9),
    to: at(target, 0.6),
  })
  const impact = 380
  burst(ctx, at(target), { color: '#d8b4fe', count: 14, delay: impact, speed: 1.6 })
  flare(ctx, at(target, 0.6), { color: POISON, delay: impact, size: 0.4 })
  shake(ctx, strength, impact)
  return impact
}

const nidorinoPoisonJab: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  aura(ctx, source, { color: TOXIC, duration: 420, count: 12 })
  rush(ctx, source, target, { delay: 200, duration: 620, hold: 0.35 })
  ;[0, 80, 160].forEach((offset, index) => {
    projectile(ctx, source, target, {
      color: TOXIC,
      core: '#fae8ff',
      delay: 260 + offset,
      duration: 110,
      size: 0.07,
      arc: 0,
      shape: 'bolt',
      from: bodyAt(source, 0.6 + index * 0.1),
    })
    burst(ctx, at(target, 0.4 + index * 0.15), {
      color: POISON,
      count: 8,
      delay: 370 + offset,
      speed: 1.3,
    })
  })
  const impact = 370
  cloud(ctx, at(target, 0.2), {
    color: '#7e22ce',
    count: 5,
    radius: 0.35,
    size: 0.2,
    rise: 0.5,
    delay: 560,
    duration: 700,
  })
  shake(ctx, strength, impact)
  return impact
}

const nidokingMegahorn: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 380 })
  aura(ctx, source, { color: '#84cc16', duration: 600, count: 24 })
  shockwave(ctx, ground(source), { color: '#65a30d', delay: 200, radius: 1.2, duration: 400 })
  const charge = 380
  rush(ctx, source, target, { delay: charge, duration: 700, through: true, hold: 0.25 })
  trail(ctx, source, { color: '#a3e635', delay: charge, duration: 450 })
  const from = bodyAt(source, 0.85)
  const far = beyond(source, target, 1.8, 0.7)
  drill(ctx, {
    color: '#ecfccb',
    stripe: '#65a30d',
    length: 1.1,
    radius: 0.24,
    delay: charge,
    duration: 260,
    spin: 0,
    from,
    to: at(target, 0.7),
  })
  prop(ctx, source, target, {
    build: () =>
      new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 1.6, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.8),
        glow('#a3e635', 0.45),
      ),
    from,
    to: far,
    delay: charge,
    duration: 380,
    arc: 0,
    fadeOut: 0.35,
  })
  const impact = charge + 230
  burst(ctx, at(target), { color: '#bef264', count: 30, delay: impact, speed: 2.6 })
  shockwave(ctx, ground(target), { color: '#84cc16', delay: impact, radius: 2.2, duration: 600 })
  slashArc(ctx, at(target, 0.6), {
    color: '#d9f99d',
    delay: impact,
    angle: 0.1,
    radius: 0.8,
    width: 0.2,
    sweep: 0.4,
    duration: 300,
  })
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1.8, width: 0.8 }), impact + 60, 60)
  cameraPunch(ctx, at(target), 0.6, impact - 50)
  shake(ctx, strength + 2, impact, 500)
  return impact
}

const oddishAbsorb: Choreography = (ctx, { source, target }) => {
  crouch(ctx, source, { duration: 300 })
  levitate(ctx, source, { delay: 200, duration: 1100, height: 0.08, wobble: 0.12 })
  orbit(ctx, source, {
    color: GRASS,
    count: 5,
    radius: 0.26,
    heightFactor: 1.05,
    turns: 1.5,
    build: (index) => leafMesh(index % 2 ? '#4ade80' : '#15803d', 0.1),
    duration: 1200,
  })
  const donor = nearestEnemy(ctx, source, target)
  const from = donor ? at(donor, 0.6) : above(target, 2.4)
  if (donor) {
    halo(ctx, donor, { color: '#65a30d', direction: 'fall', delay: 120, duration: 700 })
    shiver(ctx, donor, { delay: 150, duration: 650, amount: 0.04 })
    burst(ctx, from, {
      color: '#a3e635',
      count: 10,
      delay: 140,
      speed: 0.7,
      gravity: -0.3,
      duration: 600,
    })
  }
  lifeDrain(ctx, from, at(target, 0.6), {
    count: 26,
    travel: 0.5,
    turns: 2,
    delay: 160,
    duration: 1000,
  })
  const ribbon = (phase: number, delay: number) => {
    const start = new THREE.Vector3()
    const end = new THREE.Vector3()
    const direction = new THREE.Vector3()
    const side = new THREE.Vector3()
    const lift = new THREE.Vector3()
    const goal = at(target, 0.6)
    tube(ctx, {
      material: glow(phase ? '#bef264' : '#4ade80', 0.55),
      delay,
      duration: 800,
      radius: 0.014,
      controlPoints: 14,
      tubularSegments: 42,
      radialSegments: 4,
      path: (p, points) => {
        start.copy(from())
        end.copy(goal())
        direction.subVectors(end, start).normalize()
        side.crossVectors(direction, UP).normalize()
        lift.crossVectors(side, direction).normalize()
        const head = Math.min(1, p * 2)
        const tail = Math.max(0, p * 2 - 1)
        points.forEach((point, index) => {
          const k = tail + (head - tail) * (index / (points.length - 1))
          const r = 0.22 * Math.sin(Math.PI * k) + 0.02
          const a = phase * Math.PI + k * Math.PI * 4 + p * 3
          point
            .lerpVectors(start, end, k)
            .addScaledVector(side, Math.cos(a) * r)
            .addScaledVector(lift, Math.sin(a) * r)
          point.y += Math.sin(Math.PI * k) * 0.55
        })
      },
      opacity: (p) => 0.55 * fadeInOut(p, 0.1, 0.3),
    })
  }
  ribbon(0, 200)
  ribbon(1, 300)
  const impact = 160 + 1000 * 0.5
  leafBloom(ctx, target, { size: 0.38, delay: impact - 120, duration: 1100 })
  aura(ctx, target, { color: '#86efac', delay: impact, duration: 850, count: 16 })
  burst(ctx, at(target, 0.7), {
    color: '#bef264',
    count: 10,
    delay: impact,
    spread: 'up',
    speed: 0.8,
    gravity: -0.3,
    duration: 700,
  })
  return impact
}

const gloomStunSpore: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 320 })
  burst(ctx, bodyAt(source, 1), {
    color: '#fbbf24',
    count: 16,
    spread: 'up',
    speed: 1,
    gravity: 0.2,
    delay: 200,
    duration: 700,
  })
  const center = target.root.position.clone()
  const above = center.clone().setY(1.6)
  stream(ctx, bodyAt(source, 1), () => above, {
    color: '#facc15',
    count: 30,
    spread: 0.5,
    delay: 250,
    duration: 600,
    travel: 0.4,
    wobble: 0.12,
  })
  powderFall(ctx, () => center, {
    color: '#fde047',
    count: 45,
    radius: 1.2,
    height: 1.6,
    delay: 450,
    duration: 900,
    swirl: 1.5,
  })
  cloud(ctx, center, {
    color: '#ca8a04',
    count: 6,
    radius: 0.9,
    size: 0.3,
    rise: 0.2,
    opacity: 0.35,
    delay: 600,
    duration: 800,
  })
  const impact = 700
  const stunned = victimsWith(target, enemiesAround(ctx, source, center, 1.5), 4)
  stunned.forEach((victim, index) => {
    const delay = impact + index * 60
    lightning(ctx, victim, {
      color: '#fef08a',
      delay,
      duration: 260,
      from: at(victim, 1.1),
      segments: 6,
      jitter: 0.3,
    })
    levitate(ctx, victim, { delay, duration: 500, height: 0, wobble: 0.25 })
  })
  flinch(ctx, stunned.slice(1), impact + 60, 60)
  shake(ctx, strength, impact)
  return impact
}

const vileplumeSleepPowder: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 300 })
  bloom(ctx, source, {
    petal: '#dc2626',
    spot: '#fecaca',
    center: '#1e3a8a',
    petals: 5,
    size: 0.45,
    height: 0,
    duration: 1400,
  })
  pillar(ctx, ground(source), {
    color: '#5eead4',
    delay: 250,
    duration: 600,
    height: 2.6,
    radius: 0.28,
  })
  burst(ctx, bodyAt(source, 1.2), {
    color: '#99f6e4',
    count: 24,
    delay: 320,
    spread: 'up',
    speed: 2.4,
    gravity: 0.8,
    duration: 800,
  })
  const center = target.root.position.clone()
  powderFall(ctx, () => center, {
    color: '#2dd4bf',
    count: 60,
    radius: 1.8,
    height: 2.6,
    size: 0.14,
    delay: 550,
    duration: 1100,
    swirl: 1,
  })
  cloud(ctx, center, {
    color: '#0f766e',
    count: 8,
    radius: 1.4,
    size: 0.35,
    rise: 0.1,
    opacity: 0.35,
    delay: 800,
    duration: 900,
  })
  const impact = 850
  const sleepers = victimsWith(target, enemiesAround(ctx, source, center, 2), 5)
  sleepers.forEach((victim, index) => {
    zzz(ctx, victim, { color: '#5eead4', delay: impact + index * 70, duration: 1000, count: 3 })
    fx(ctx, impact + index * 70, 800, undefined, (p) => {
      victim.pose.tilt += 0.35 * pulse(Math.min(1, p * 1.5))
      victim.pose.lift -= 0.06 * pulse(p)
    })
  })
  flinch(ctx, sleepers.slice(1), impact + 70, 70)
  shake(ctx, strength, impact)
  return impact
}

const poliwagBubbleBeam: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 240 })
  const from = ahead(source, target, 0.3, 0.5)
  const far = beyond(source, target, 1, 0.55)
  bubbles(ctx, from, far, {
    color: '#7dd3fc',
    count: 12,
    size: 0.1,
    delay: 180,
    duration: 800,
    wobble: 0.08,
  })
  stream(ctx, from, far, {
    color: '#bae6fd',
    count: 20,
    spread: 0.3,
    size: 0.08,
    delay: 180,
    duration: 700,
    travel: 0.4,
    wobble: 0.05,
  })
  const impact = 180 + 800 * 0.5
  burst(ctx, at(target), { color: FOAM, count: 16, delay: impact, speed: 1.5, gravity: 0.6 })
  burst(ctx, at(target), {
    color: '#38bdf8',
    count: 10,
    delay: impact + 180,
    spread: 'ring',
    speed: 1,
    gravity: 0,
  })
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1 }), impact + 80, 40)
  shake(ctx, strength, impact)
  return impact
}

const poliwhirlHypnosis: Choreography = (ctx, { source, target, shake: strength }) => {
  const belly = bodyAt(source, 0.5)
  const spiral = new THREE.Group()
  for (let ring = 0; ring < 4; ring++) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.06 + ring * 0.08, 0.1 + ring * 0.08, 32, 1, 0, Math.PI * 1.6),
      glow(ring % 2 ? '#1e1b4b' : '#f8fafc', 0.9),
    )
    mesh.rotation.z = ring * 1.3
    spiral.add(mesh)
  }
  const direction = new THREE.Vector3()
  fx(ctx, 0, 900, spiral, (p) => {
    spiral.position.copy(belly()).addScaledVector(flatDirection(source, target, direction), 0.2)
    spiral.quaternion.copy(ctx.camera.quaternion)
    spiral.rotateZ(-p * 18)
    spiral.scale.setScalar(Math.max(0.01, fadeInOut(p, 0.15, 0.2)))
  })
  for (let index = 0; index < 5; index++) {
    prop(ctx, source, target, {
      build: () => ringMesh(index % 2 ? '#c084fc' : '#e879f9', 0.16, 0.022),
      from: belly,
      to: at(target, 0.6),
      delay: 220 + index * 80,
      duration: 420,
      arc: 0,
      grow: 2,
      fadeOut: 0.3,
    })
  }
  const impact = 220 + 4 * 80 + 420
  vortex(ctx, at(target, 0.95), {
    color: '#d8b4fe',
    secondary: '#a855f7',
    height: 0.3,
    radius: 0.45,
    rings: 3,
    delay: impact,
    duration: 900,
  })
  levitate(ctx, target, { delay: impact, duration: 900, height: 0.1, wobble: 0.3 })
  zzz(ctx, target, { color: '#e9d5ff', delay: impact + 200, duration: 1000 })
  shake(ctx, Math.max(1, strength - 1), impact)
  return impact
}

const poliwrathDynamicPunch: Choreography = (ctx, { source, target, shake: strength }) => {
  crouch(ctx, source, { duration: 420 })
  aura(ctx, source, { color: '#fb923c', duration: 600, count: 22 })
  const punch = 420
  chargeOrb(ctx, bodyAt(source, 0.6), {
    color: '#fb923c',
    core: '#fff7ed',
    size: 0.3,
    delay: 60,
    duration: punch - 60,
  })
  prop(ctx, source, target, {
    build: () => {
      const holder = new THREE.Group()
      const fist = fistMesh(0.34, () =>
        standard('#e0f2fe', { emissive: '#f97316', emissiveIntensity: 0.6 }),
      )
      const glowShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 16, 12),
        glow('#f97316', 0.45),
      )
      holder.add(fist, glowShell)
      return holder
    },
    from: bodyAt(source, 0.7),
    delay: punch - 40,
    duration: 240,
    arc: 0.1,
    grow: 0.5,
  })
  rush(ctx, source, target, { delay: punch - 60, duration: 420, hold: 0.15 })
  const impact = punch + 200
  burst(ctx, at(target), { color: '#f97316', count: 34, delay: impact, speed: 2.8 })
  flare(ctx, at(target), { color: '#fde047', rays: 8, delay: impact, size: 0.9, duration: 320 })
  shockwave(ctx, ground(target), { color: '#fb923c', delay: impact, radius: 2, duration: 600 })
  pillar(ctx, ground(target), {
    color: '#fdba74',
    delay: impact,
    duration: 450,
    height: 1.8,
    radius: 0.5,
  })
  orbit(ctx, target, {
    color: '#fde047',
    count: 5,
    radius: 0.32,
    heightFactor: 1.1,
    turns: 3,
    build: dizzyStar,
    delay: impact + 200,
    duration: 1000,
  })
  levitate(ctx, target, { delay: impact + 150, duration: 900, height: 0, wobble: 0.3 })
  cameraPunch(ctx, at(target), 0.7, impact - 60)
  shake(ctx, strength + 2, impact, 500)
  return impact
}

export const POKEMON_TIER_1_ULTIMATES: UltimateSet = {
  bulbasaur: bulbasaurVineWhip,
  ivysaur: ivysaurRazorLeaf,
  venusaur: venusaurGrassyTerrain,
  charmander: charmanderEmber,
  charmeleon: charmeleonFireFang,
  charizard: charizardFlamethrower,
  squirtle: squirtleWaterGun,
  wartortle: wartortleShellGuard,
  blastoise: blastoiseHydroCannon,
  caterpie: caterpieStringShot,
  metapod: metapodHarden,
  butterfree: butterfreeSleepPowder,
  weedle: weedlePoisonSting,
  kakuna: kakunaIronDefense,
  beedrill: beedrillFellStinger,
  pidgey: pidgeyGust,
  pidgeotto: pidgeottoAirCutter,
  pidgeot: pidgeotTailwind,
  rattata: rattataQuickAttack,
  'raticate:Hyper Fang': raticateHyperFang,
  'raticate:Super Fang': raticateSuperFang,
  spearow: spearowPeck,
  'fearow:Drill Peck': fearowDrillPeck,
  'fearow:Drill Run': fearowDrillRun,
  nidoran_f: nidoranFVenomDrench,
  nidorina: nidorinaToxicSpikes,
  nidoqueen: nidoqueenEarthPower,
  nidoran_m: nidoranMHornAttack,
  nidorino: nidorinoPoisonJab,
  nidoking: nidokingMegahorn,
  oddish: oddishAbsorb,
  gloom: gloomStunSpore,
  vileplume: vileplumeSleepPowder,
  poliwag: poliwagBubbleBeam,
  poliwhirl: poliwhirlHypnosis,
  poliwrath: poliwrathDynamicPunch,
}
