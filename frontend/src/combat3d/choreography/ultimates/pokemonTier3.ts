import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import {
  beakJab,
  lit,
  makeGlob,
  makePincer,
  pincerSnap,
  puddle,
  ringCage,
  vine,
} from '../kit/pokemonTier3'
import {
  ahead,
  alliesAround,
  beyond,
  billboard,
  hexagonGeometry,
  enemiesAround,
  enemiesInLine,
  fistMesh,
  flatDirection,
  flinch,
  fx,
  noteGeometry,
  phase,
  pulse,
  rayBeam,
  setOpacity,
  shell,
  shiver,
  squash,
  statArrows,
  stream,
  bubbles,
  motionLines,
  offsetPoint,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  crescentMesh,
  crouch,
  dash,
  glow,
  ground,
  leap,
  lightning,
  meteor,
  orbit,
  orbMesh,
  pillar,
  prop,
  shake,
  shockwave,
  sigil,
  slashArc,
  spin,
  trail,
  type ColorInput,
  type FxContext,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

type PointFn = () => THREE.Vector3

const PSY_PINK = '#f472b6'
const PSY_VIOLET = '#a855f7'
const UP = new THREE.Vector3(0, 1, 0)

const distance = (a: UnitView, b: UnitView): number => a.root.position.distanceTo(b.root.position)

const allyTeam = (
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  radius: number,
  limit: number,
) => [...new Set([source, target, ...alliesAround(ctx, source, radius, limit)])].slice(0, limit)

function makeSpoon(size: number): { group: THREE.Group; neck: THREE.Group } {
  const group = new THREE.Group()
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018 * size, 0.026 * size, 0.34 * size, 8),
    lit('#e5e7eb', 0.4, 0.15),
  )
  handle.position.y = -0.17 * size
  const neck = new THREE.Group()
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016 * size, 0.018 * size, 0.06 * size, 6),
    lit('#e5e7eb', 0.4, 0.15),
  )
  stem.position.y = 0.03 * size
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.07 * size, 12, 8),
    lit('#f8fafc', 0.5, 0.1),
  )
  bowl.scale.set(1, 1.45, 0.35)
  bowl.position.y = 0.14 * size
  neck.add(stem, bowl)
  group.add(handle, neck)
  return { group, neck }
}

function blast(
  ctx: FxContext,
  point: PointFn,
  options: {
    color: ColorInput
    core?: ColorInput
    radius?: number
    delay?: number
    duration?: number
  },
): void {
  const radius = options.radius ?? 0.8
  const group = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glow(options.color, 0.7))
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12),
    glow(options.core ?? '#ffffff', 0.9),
  )
  group.add(shell, core)
  fx(ctx, options.delay ?? 0, options.duration ?? 500, group, (p) => {
    group.position.copy(point())
    group.scale.setScalar(Math.max(0.01, radius * easeInOut(Math.min(1, p * 2.2))))
    core.scale.setScalar(Math.max(0.01, 1 - p))
    setOpacity(group, 1 - p * p)
  })
}

function sludgeDome(ctx: FxContext, view: UnitView, delay: number): void {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.8),
    new THREE.MeshStandardMaterial({
      color: '#7e22ce',
      emissive: '#6b21a8',
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.45,
      roughness: 0.15,
      depthWrite: false,
    }),
  )
  fx(ctx, delay, 1000, dome, (p, now) => {
    dome.position.copy(view.root.position).setY(0.05)
    const rise = easeInOut(phase(p, 0, 0.3))
    dome.scale.set(
      1 + 0.05 * Math.sin(now * 0.02),
      Math.max(0.01, rise * (1 + 0.08 * Math.sin(now * 0.017))),
      1 + 0.05 * Math.cos(now * 0.02),
    )
    setOpacity(dome, 1 - phase(p, 0.7, 1))
  })
}

function makeIcicle(color: ColorInput, length: number): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(length * 0.14, length, 6).rotateX(Math.PI / 2),
    lit(color, 0.45, 0.1),
  )
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(length * 0.06, length * 0.8, 5).rotateX(Math.PI / 2),
    glow('#ffffff', 0.8),
  )
  group.add(body, core)
  return group
}

const abraKinesis: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 420
  aura(ctx, source, { color: PSY_PINK, duration: 700, count: 14 })
  const spoon = makeSpoon(1.7)
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), glow(PSY_PINK, 0.35))
  spoon.group.add(halo)
  fx(ctx, 60, 950, spoon.group, (p, now) => {
    target.focusPoint(spoon.group.position, 1.3)
    spoon.group.position.y += 0.06 * Math.sin(now * 0.01)
    billboard(ctx, spoon.group)
    spoon.group.rotateZ(Math.sin(now * 0.02) * 0.12)
    spoon.neck.rotation.z = -1.4 * easeInOut(phase(p, 0.3, 0.4))
    halo.scale.setScalar(1 + 0.6 * pulse(phase(p, 0.3, 0.6)))
    spoon.group.scale.setScalar(Math.max(0.01, phase(p, 0, 0.15)))
    setOpacity(spoon.group, 1 - phase(p, 0.8, 1))
  })
  ringCage(ctx, target, { color: '#f0abfc', delay: impact - 60, duration: 800, radius: 0.6 })
  shockwave(ctx, ground(target), { color: PSY_PINK, delay: impact, radius: 1.2, duration: 450 })
  burst(ctx, at(target, 0.9), {
    color: '#fdf4ff',
    count: 14,
    delay: impact,
    speed: 1.4,
    spread: 'ring',
    gravity: 0,
  })
  shiver(ctx, target, { delay: impact, duration: 700, amount: 0.2, speed: 14 })
  shake(ctx, strength * 0.5, impact)
  return impact
}

const kadabraPsybeam: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 300
  const spoon = makeSpoon(1.3)
  fx(ctx, 0, 850, spoon.group, (p) => {
    source.focusPoint(spoon.group.position, 0.95)
    billboard(ctx, spoon.group)
    spoon.group.translateX(0.3)
    spoon.group.rotateZ(-0.5 * easeInOut(phase(p, 0, 0.25)))
    setOpacity(spoon.group, 1 - phase(p, 0.8, 1))
  })
  const tip = ahead(source, target, 0.3, 0.75)
  chargeOrb(ctx, tip, { color: PSY_PINK, core: '#fdf4ff', size: 0.16, duration: 260 })
  rayBeam(ctx, tip, beyond(source, target, 2, 0.6), {
    colors: [PSY_PINK, PSY_VIOLET, '#22d3ee'],
    core: '#fdf4ff',
    width: 0.15,
    delay: 220,
    duration: 620,
    grow: 0.18,
    twist: 1.2,
    rings: '#f0abfc',
  })
  burst(ctx, at(target), { color: '#f0abfc', count: 22, delay: impact, speed: 2.1 })
  shockwave(ctx, ground(target), { color: PSY_VIOLET, delay: impact, radius: 1.1, duration: 400 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 2 }).slice(0, 3)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: PSY_PINK, count: 10, delay: impact + 60 }),
  )
  flinch(ctx, victims, impact + 60)
  shiver(ctx, target, { delay: impact, duration: 450, amount: 0.15, speed: 14 })
  shake(ctx, strength, impact)
  return impact
}

const alakazamFutureSight: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 1050
  leap(ctx, source, { duration: 750, height: 0.25 })
  aura(ctx, source, { color: PSY_VIOLET, duration: 900, count: 22 })
  const spoons = new THREE.Group()
  const left = makeSpoon(1.4)
  const right = makeSpoon(1.4)
  spoons.add(left.group, right.group)
  fx(ctx, 0, 950, spoons, (p) => {
    source.focusPoint(spoons.position, 0.7)
    spoons.position.y += source.pose.lift
    billboard(ctx, spoons)
    const cross = easeInOut(phase(p, 0.1, 0.4))
    left.group.position.set(-0.45 + cross * 0.32, 0, 0.05)
    left.group.rotation.z = 0.5 - cross * 1.1
    right.group.position.set(0.45 - cross * 0.32, 0, 0.05)
    right.group.rotation.z = -0.5 + cross * 1.1
    setOpacity(spoons, 1 - phase(p, 0.8, 1))
  })
  const orbs = new THREE.Group()
  const orbMeshes = [0, 1, 2].map(() => {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glow('#fdf4ff'))
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), glow(PSY_VIOLET, 0.5)))
    orbs.add(orb)
    return orb
  })
  const head = new THREE.Vector3()
  fx(ctx, 100, 720, orbs, (p, now) => {
    source.focusPoint(head, 1.25)
    const rise = easeInOut(phase(p, 0.62, 1))
    orbMeshes.forEach((orb, index) => {
      const angle = now * 0.008 + (index * Math.PI * 2) / 3
      const radius = 0.48 * (1 - rise * 0.8)
      orb.position.set(
        head.x + Math.cos(angle) * radius,
        head.y + rise * 5,
        head.z + Math.sin(angle) * radius,
      )
      orb.scale.setScalar(0.4 + 0.6 * phase(p, 0, 0.3) + 0.25 * Math.sin(now * 0.03 + index))
    })
  })
  // The foreseen spot is marked by a slowly turning sigil while the attack "waits in the future".
  sigil(ctx, ground(target), {
    color: PSY_VIOLET,
    secondary: PSY_PINK,
    radius: 0.8,
    points: 6,
    delay: 520,
    duration: impact - 520 + 250,
  })
  const rift = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glow('#e9d5ff', 0.4))
  fx(ctx, impact - 260, 280, rift, (p) => {
    target.focusPoint(rift.position, 0.6)
    rift.scale.setScalar(Math.max(0.05, 1.6 - 1.5 * easeInOut(p)))
    setOpacity(rift, 0.3 + 0.7 * p)
  })
  cameraPunch(ctx, at(target), 0.5, impact - 40)
  pillar(ctx, ground(target), {
    color: PSY_VIOLET,
    delay: impact,
    duration: 750,
    height: 4.5,
    radius: 0.55,
  })
  shockwave(ctx, ground(target), { color: PSY_PINK, delay: impact, radius: 2.3, duration: 650 })
  shockwave(ctx, ground(target), {
    color: '#fdf4ff',
    delay: impact + 90,
    radius: 1.3,
    duration: 500,
  })
  burst(ctx, at(target), { color: '#f0abfc', count: 34, delay: impact, speed: 2.8 })
  const victims = enemiesAround(ctx, source, target, 1.6).slice(0, 3)
  victims.forEach((victim, index) =>
    pillar(ctx, ground(victim), {
      color: PSY_PINK,
      delay: impact + 80 + index * 60,
      duration: 550,
      height: 2.6,
      radius: 0.35,
    }),
  )
  flinch(ctx, victims, impact + 80, 60)
  shake(ctx, strength + 1, impact, 380)
  return impact
}

const machopLowSweep: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 300
  crouch(ctx, source, { duration: 220 })
  if (!ctx.reducedMotion) dash(ctx, source, target, { delay: 120, duration: 480, hold: 0.2 })
  const sweep = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.58, 32, 1, 0, Math.PI * 0.9),
    glow('#fecaca', 0.9),
  )
  sweep.add(
    new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.58, 32, 1, 0, Math.PI * 0.9),
      glow('#ffffff', 0.9),
    ),
  )
  fx(ctx, impact - 90, 320, sweep, (p) => {
    sweep.position.copy(target.root.position).setY(0.14)
    sweep.rotation.set(-Math.PI / 2, 0, -1.2 + easeInOut(p) * 3.4)
    setOpacity(sweep, 1 - p * p)
  })
  fx(ctx, impact, 480, undefined, (p) => {
    target.pose.tilt += 0.7 * pulse(p)
    target.pose.lift -= 0.12 * pulse(p)
  })
  burst(ctx, ground(target), {
    color: '#d6d3d1',
    count: 14,
    delay: impact,
    speed: 1.2,
    spread: 'ring',
    gravity: 0.2,
  })
  shockwave(ctx, ground(target), { color: '#dc2626', delay: impact, radius: 0.9, duration: 350 })
  shake(ctx, strength * 0.6, impact)
  return impact
}

const machokeBulkUp: Choreography = (ctx, { source, target }) => {
  const impact = 420
  fx(ctx, 0, 900, undefined, (p) => {
    source.pose.scale *= 1 + pulse(phase(p, 0.08, 0.42)) * 0.16 + pulse(phase(p, 0.42, 0.85)) * 0.26
    source.pose.tilt += Math.sin(p * Math.PI * 4) * 0.12 * pulse(p)
  })
  aura(ctx, source, { color: '#ef4444', duration: 900, count: 24 })
  allyTeam(ctx, source, target, 1.6, 4).forEach((ally, index) =>
    statArrows(ctx, ally, {
      color: index === 0 ? '#f97316' : '#fb923c',
      delay: impact - 120 + index * 70,
    }),
  )
  shockwave(ctx, ground(source), { color: '#f87171', delay: impact, radius: 1.8 })
  burst(ctx, at(source), {
    color: '#fed7aa',
    count: 18,
    delay: impact,
    spread: 'up',
    speed: 1.8,
    gravity: 0.3,
  })
  shake(ctx, 1.5, impact)
  return impact
}

function fistStrike(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: {
    color: ColorInput
    size: number
    delay: number
    duration: number
    side: number
    height: number
    windup?: boolean
  },
): void {
  const fist = fistMesh(options.size * 2, () => lit(options.color, 0.25))
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const side = new THREE.Vector3()
  fx(ctx, options.delay, options.duration, fist, (p) => {
    source.focusPoint(from, 0.55 + options.height).add(source.pose.offset)
    target.focusPoint(to, 0.55)
    side.subVectors(to, from).setY(0).cross(UP).normalize().multiplyScalar(options.side)
    from.add(side)
    to.addScaledVector(side, 0.25)
    const reach = options.windup
      ? p < 0.35
        ? -0.3 * Math.sin((Math.PI / 2) * (p / 0.35))
        : p < 0.6
          ? -0.3 + 1.3 * easeInOut((p - 0.35) / 0.25)
          : p < 0.75
            ? 1
            : 1 - easeInOut((p - 0.75) / 0.25)
      : p < 0.45
        ? easeInOut(p / 0.45)
        : 1 - easeInOut((p - 0.45) / 0.55)
    fist.position.lerpVectors(from, to, reach * 0.9)
    fist.lookAt(to)
    setOpacity(fist, 1 - phase(p, 0.85, 1))
  })
}

const machampDynamicPunch: Choreography = (ctx, { source, target, shake: strength }) => {
  const finale = 820
  crouch(ctx, source, { duration: 200 })
  aura(ctx, source, { color: '#f97316', duration: 800, count: 18 })
  const arms: [number, number][] = [
    [0.36, 0.25],
    [-0.36, 0.25],
    [0.3, -0.18],
    [-0.3, -0.18],
  ]
  for (let index = 0; index < 8; index++) {
    const [side, height] = arms[index % 4]
    const delay = 170 + index * 55
    fistStrike(ctx, source, target, {
      color: '#8fa3b8',
      size: 0.11,
      delay,
      duration: 200,
      side,
      height,
    })
    if (index % 2 === 1)
      burst(ctx, at(target), { color: '#fdba74', count: 8, delay: delay + 90, speed: 1.3 })
  }
  fistStrike(ctx, source, target, {
    color: '#f59e0b',
    size: 0.26,
    delay: finale - 200,
    duration: 440,
    side: 0,
    height: 0.1,
    windup: true,
  })
  cameraPunch(ctx, at(target), 0.6, finale - 40)
  blast(ctx, at(target), {
    color: '#f97316',
    core: '#fef3c7',
    radius: 1.1,
    delay: finale,
    duration: 520,
  })
  shockwave(ctx, ground(target), { color: '#ef4444', delay: finale, radius: 2 })
  shockwave(ctx, ground(target), {
    color: '#fde68a',
    delay: finale + 80,
    radius: 1.2,
    duration: 450,
  })
  burst(ctx, at(target), { color: '#fbbf24', count: 30, delay: finale, speed: 2.8 })
  orbit(ctx, target, {
    color: '#fde047',
    count: 3,
    radius: 0.32,
    heightFactor: 1.2,
    turns: 2,
    delay: finale + 60,
    duration: 800,
  })
  const victims = enemiesAround(ctx, source, target, 1.5).slice(0, 3)
  flinch(ctx, victims, finale + 60)
  shake(ctx, strength + 1, finale, 360)
  return finale
}

const bellsproutVineWhip: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 240
  vine(ctx, source, target, { color: '#16a34a', duration: 480, side: 0.3, sway: 0.25 })
  vine(ctx, source, target, { color: '#15803d', delay: 110, duration: 480, side: -0.3, sway: 0.25 })
  slashArc(ctx, at(target), {
    color: '#86efac',
    delay: impact,
    angle: -0.4,
    radius: 0.45,
    sweep: 1.2,
  })
  slashArc(ctx, at(target), {
    color: '#bbf7d0',
    delay: impact + 110,
    angle: 2.4,
    radius: 0.45,
    sweep: 1.2,
  })
  burst(ctx, at(target), { color: '#4ade80', count: 14, delay: impact, speed: 1.6 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.2 }).slice(0, 2)
  flinch(ctx, victims, impact + 110)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const weepinbellAcid: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 380
  crouch(ctx, source, { duration: 200 })
  for (let index = 0; index < 3; index++) {
    const glob = makeGlob(index === 1 ? '#c084fc' : '#9333ea', 0.08 + index * 0.02, 0.35)
    const landing = offsetPoint(
      at(target, 0.45),
      new THREE.Vector3((index - 1) * 0.15, 0, (index - 1) * 0.1),
    )
    prop(ctx, source, target, {
      build: () => glob,
      from: ahead(source, target, 0.25, 0.75),
      to: landing,
      delay: 120 + index * 70,
      duration: 260,
      arc: 0.6,
      spin: 5,
      tumble: 3,
    })
  }
  burst(ctx, at(target), { color: '#e9d5ff', count: 16, delay: impact, speed: 1.6, gravity: 2.4 })
  puddle(ctx, ground(target), {
    color: '#7e22ce',
    bubbles: '#d8b4fe',
    delay: impact,
    radius: 0.6,
    duration: 1000,
  })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.5 }).slice(0, 2)
  victims.forEach((victim) =>
    puddle(ctx, ground(victim), {
      color: '#86198f',
      bubbles: '#f0abfc',
      delay: impact + 140,
      radius: 0.4,
    }),
  )
  flinch(ctx, victims, impact + 140)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const victreebelPowerWhip: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 560
  aura(ctx, source, { color: '#22c55e', duration: 700, count: 20 })
  crouch(ctx, source, { duration: 300 })
  vine(ctx, source, target, {
    color: '#15803d',
    delay: 60,
    duration: 1000,
    thickness: 0.1,
    sway: 0.12,
    overhead: 2.4,
  })
  vine(ctx, source, target, {
    color: '#166534',
    delay: 20,
    duration: 420,
    thickness: 0.05,
    sway: 0.4,
    side: -0.4,
  })
  cameraPunch(ctx, at(target), 0.45, impact - 40)
  slashArc(ctx, at(target), {
    color: '#a3e635',
    delay: impact,
    angle: Math.PI / 2 + 0.3,
    radius: 0.9,
    width: 0.2,
    sweep: 0.6,
    duration: 320,
  })
  shockwave(ctx, ground(target), { color: '#65a30d', delay: impact, radius: 1.7 })
  burst(ctx, at(target, 0.3), { color: '#4ade80', count: 24, delay: impact, speed: 2.4 })
  burst(ctx, ground(target), {
    color: '#a16207',
    count: 14,
    delay: impact,
    speed: 1.6,
    spread: 'up',
    gravity: 2,
  })
  squash(ctx, target, { delay: impact, amount: 0.22 })
  shake(ctx, strength + 1, impact, 320)
  return impact
}

const doduoDoubleHit: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 220
  if (!ctx.reducedMotion) dash(ctx, source, target, { duration: 560, hold: 0.35 })
  beakJab(ctx, source, target, {
    color: '#f59e0b',
    side: 0.18,
    delay: 120,
    duration: 200,
    height: 0.8,
  })
  beakJab(ctx, source, target, {
    color: '#fbbf24',
    side: -0.18,
    delay: 260,
    duration: 200,
    height: 0.75,
  })
  burst(ctx, at(target, 0.65), { color: '#fef3c7', count: 10, delay: impact, speed: 1.4 })
  burst(ctx, at(target, 0.5), { color: '#fde68a', count: 10, delay: impact + 140, speed: 1.6 })
  shockwave(ctx, ground(target), {
    color: '#d6d3d1',
    delay: impact + 140,
    radius: 0.8,
    duration: 320,
  })
  shake(ctx, strength * 0.5, impact + 140)
  return impact
}

const TRI_COLORS = ['#ef4444', '#38bdf8', '#facc15']

const dodrioTriAttack: Choreography = (ctx, { source, target, shake: strength }) => {
  const extra = 1.6
  const launch = 300
  const travel = 520
  const reachFraction = distance(source, target) / (distance(source, target) + extra)
  const impact = launch + Math.round(travel * reachFraction)
  const triangle = new THREE.Group()
  const orbs = TRI_COLORS.map((color) => {
    const orb = orbMesh(color, '#ffffff', 0.09)
    triangle.add(orb)
    return orb
  })
  const frame = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.3, 3, 1), glow('#fdf4ff', 0.8))
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.28, 3), glow('#f5f5f4', 0.2))
  triangle.add(frame, fill)
  const from = ahead(source, target, 0.35, 0.9)
  const to = beyond(source, target, extra, 0.6)
  const start = new THREE.Vector3()
  fx(ctx, 0, launch + travel, triangle, (p, now) => {
    const elapsed = p * (launch + travel)
    const charge = phase(elapsed, 0, launch)
    const t = phase(elapsed, launch, launch + travel)
    if (t === 0) start.copy(from())
    triangle.position.lerpVectors(start, to(), t)
    billboard(ctx, triangle)
    triangle.rotateZ(now * 0.014)
    triangle.scale.setScalar(0.3 + 0.9 * charge)
    orbs.forEach((orb, index) => {
      const angle = Math.PI / 2 + (index * Math.PI * 2) / 3
      orb.position.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0)
    })
    setOpacity(triangle, 1 - phase(t, 0.85, 1))
  })
  TRI_COLORS.forEach((color, index) =>
    burst(ctx, at(target), {
      color,
      count: 12,
      delay: impact + index * 40,
      speed: 1.8 + index * 0.3,
    }),
  )
  shockwave(ctx, ground(target), { color: '#f8fafc', delay: impact, radius: 1.2, duration: 420 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: extra })
  flinch(ctx, victims.slice(0, 3), impact + 90)
  shake(ctx, strength, impact)
  return impact
}

const dodrioAgility: Choreography = (ctx, { source, target }) => {
  const impact = 300
  if (!ctx.reducedMotion) {
    fx(ctx, 0, 700, undefined, (p) => {
      source.pose.offset.x += Math.sin(p * Math.PI * 6) * 0.35 * pulse(p)
      source.pose.offset.z += Math.cos(p * Math.PI * 6) * 0.18 * pulse(p)
    })
    trail(ctx, source, { color: '#e2e8f0', duration: 700 })
  }
  allyTeam(ctx, source, target, 2.2, 4).forEach((ally, index) =>
    motionLines(ctx, ally, {
      color: index === 0 ? '#f8fafc' : '#bae6fd',
      count: 10,
      delay: 120 + index * 80,
      duration: 650,
    }),
  )
  shockwave(ctx, ground(source), { color: '#f8fafc', delay: impact, radius: 1.8, duration: 450 })
  burst(ctx, at(source), {
    color: '#e0f2fe',
    count: 12,
    delay: impact,
    spread: 'ring',
    gravity: 0,
    speed: 2,
  })
  return impact
}

const dewgongAuroraBeam: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 340
  const horn = ahead(source, target, 0.15, 1)
  chargeOrb(ctx, horn, { color: '#a5f3fc', core: '#ffffff', size: 0.15, duration: 260 })
  rayBeam(ctx, horn, beyond(source, target, 1.8, 0.6), {
    colors: ['#f9a8d4', '#fde68a', '#86efac', '#93c5fd', '#c4b5fd'],
    core: '#f0f9ff',
    width: 0.17,
    delay: 200,
    duration: 650,
    grow: 0.22,
    twist: 1.5,
    rings: '#e0f2fe',
  })
  shell(ctx, target, {
    color: '#a5f3fc',
    edge: '#f0f9ff',
    material: 'crystal',
    delay: impact,
    duration: 1000,
  })
  burst(ctx, at(target), { color: '#e0f2fe', count: 22, delay: impact, speed: 2 })
  shockwave(ctx, ground(target), { color: '#bae6fd', delay: impact, radius: 1.3 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.8 }).slice(0, 2)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#a5f3fc', count: 10, delay: impact + 60 }),
  )
  flinch(ctx, victims, impact + 60)
  shake(ctx, strength, impact)
  return impact
}

const dewgongPerishSong: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 1000
  fx(ctx, 0, 1000, undefined, (p, now) => {
    source.pose.tilt += Math.sin(now * 0.008) * 0.2 * pulse(p)
    source.pose.lift += 0.12 * pulse(p)
  })
  const notes = new THREE.Group()
  const noteColors = ['#a78bfa', '#e2e8f0', '#f0abfc']
  const noteMeshes = Array.from({ length: 6 }, (_, index) => {
    const note = new THREE.Mesh(noteGeometry(0.06 * 3), glow(noteColors[index % 3], 0.95))
    note.userData.offset = index / 6
    notes.add(note)
    return note
  })
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  fx(ctx, 0, 1000, notes, (p, now) => {
    source.focusPoint(from, 0.9)
    target.focusPoint(to, 1)
    noteMeshes.forEach((note, index) => {
      const t = easeInOut(
        phase(
          p,
          (note.userData.offset as number) * 0.4,
          0.75 + (note.userData.offset as number) * 0.25,
        ),
      )
      const angle = now * 0.004 + index
      note.position.lerpVectors(from, to, t)
      note.position.x += Math.cos(angle) * 0.35 * (1 - t * 0.5)
      note.position.y += Math.sin(now * 0.006 + index) * 0.15 + Math.sin(Math.PI * t) * 0.4
      note.position.z += Math.sin(angle) * 0.35 * (1 - t * 0.5)
      note.quaternion.copy(ctx.camera.quaternion)
    })
    setOpacity(notes, 1 - phase(p, 0.9, 1))
  })
  // Three marks above the target go out one by one: the Perish count reaching zero.
  const counter = new THREE.Group()
  const marks = [0, 1, 2].map((index) => {
    const mark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#c4b5fd'))
    mark.add(new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 20), glow('#7c3aed', 0.9)))
    mark.position.x = (index - 1) * 0.22
    counter.add(mark)
    return mark
  })
  const ticks = [420, 610, 800]
  fx(ctx, 260, impact - 260 + 150, counter, (p) => {
    const elapsed = 260 + p * (impact - 260 + 150)
    target.focusPoint(counter.position, 1.45)
    billboard(ctx, counter)
    marks.forEach((mark, index) => {
      const gone = phase(elapsed, ticks[2 - index], ticks[2 - index] + 90)
      mark.scale.setScalar(Math.max(0.01, (1 - gone) * (1 + 0.6 * pulse(gone * 3))))
    })
    setOpacity(counter, phase(p, 0, 0.1))
  })
  ticks.forEach((tick) =>
    shockwave(ctx, ground(target), { color: '#8b5cf6', delay: tick, radius: 0.9, duration: 380 }),
  )
  ringCage(ctx, target, { color: '#7c3aed', delay: 300, duration: 950, radius: 0.7, tube: 0.02 })
  shockwave(ctx, ground(target), { color: '#7c3aed', delay: impact, radius: 2.3, duration: 700 })
  shockwave(ctx, ground(target), {
    color: '#e9d5ff',
    delay: impact + 80,
    radius: 1.3,
    duration: 500,
  })
  burst(ctx, at(target), {
    color: '#c4b5fd',
    count: 24,
    delay: impact,
    spread: 'ring',
    gravity: 0,
    speed: 2,
  })
  const victims = enemiesAround(ctx, source, target, 1.6).slice(0, 3)
  victims.forEach((victim) =>
    ringCage(ctx, victim, {
      color: '#6d28d9',
      count: 2,
      delay: impact,
      duration: 600,
      radius: 0.5,
      tube: 0.02,
    }),
  )
  flinch(ctx, victims, impact)
  shake(ctx, strength, impact)
  return impact
}

const grimerSludge: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 400
  crouch(ctx, source, { duration: 220 })
  prop(ctx, source, target, {
    build: () => makeGlob('#6b21a8', 0.16, 0.35),
    from: at(source, 0.7),
    to: at(target, 0.5),
    delay: 120,
    duration: 280,
    arc: 0.7,
    spin: 6,
    tumble: 4,
  })
  burst(ctx, at(target), { color: '#a855f7', count: 20, delay: impact, speed: 1.8, gravity: 2.5 })
  puddle(ctx, ground(target), { color: '#581c87', bubbles: '#d8b4fe', delay: impact, radius: 0.55 })
  squash(ctx, target, { delay: impact, amount: 0.12 })
  shake(ctx, strength * 0.6, impact)
  return impact
}

const mukAcidArmor: Choreography = (ctx, { source, target }) => {
  const impact = 420
  fx(ctx, 0, 950, undefined, (p, now) => {
    const melt = pulse(phase(p, 0, 0.7))
    source.pose.scale *= 1 - 0.35 * melt
    source.pose.lift -= 0.28 * melt
    source.pose.tilt += Math.sin(now * 0.02) * 0.08 * melt
  })
  puddle(ctx, ground(source), {
    color: '#7e22ce',
    bubbles: '#e9d5ff',
    radius: 0.85,
    duration: 1000,
  })
  allyTeam(ctx, source, target, 1.6, 4).forEach((ally, index) =>
    sludgeDome(ctx, ally, 200 + index * 80),
  )
  burst(ctx, at(source, 0.9), {
    color: '#c084fc',
    count: 16,
    delay: impact,
    speed: 1.2,
    gravity: 2.4,
  })
  return impact
}

const mukGunkShot: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 620
  crouch(ctx, source, { duration: 300 })
  leap(ctx, source, { delay: 220, duration: 360, height: 0.35 })
  const garbage = makeGlob('#4c1d95', 0.3, 0.4)
  const junk: [ColorInput, THREE.BufferGeometry][] = [
    ['#78350f', new THREE.BoxGeometry(0.12, 0.08, 0.1)],
    ['#9ca3af', new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8)],
    ['#65a30d', new THREE.BoxGeometry(0.1, 0.1, 0.06)],
    ['#e5e7eb', new THREE.TetrahedronGeometry(0.08)],
    ['#b45309', new THREE.CylinderGeometry(0.035, 0.045, 0.12, 6)],
  ]
  junk.forEach(([color, geometry], index) => {
    const piece = new THREE.Mesh(geometry, lit(color, 0.2, 0.6))
    const angle = (index / junk.length) * Math.PI * 2
    piece.position.set(Math.cos(angle) * 0.3, Math.sin(index * 1.7) * 0.2, Math.sin(angle) * 0.3)
    piece.rotation.set(index, index * 2, index * 0.5)
    garbage.add(piece)
  })
  prop(ctx, source, target, {
    build: () => garbage,
    from: at(source, 1.1),
    to: at(target, 0.45),
    delay: 260,
    duration: 360,
    arc: 1.4,
    spin: 4,
    tumble: 3,
  })
  cameraPunch(ctx, at(target), 0.4, impact - 40)
  burst(ctx, at(target), { color: '#7e22ce', count: 30, delay: impact, speed: 2.6, gravity: 3 })
  burst(ctx, at(target), { color: '#a3e635', count: 12, delay: impact, speed: 2, gravity: 2.5 })
  puddle(ctx, ground(target), {
    color: '#581c87',
    bubbles: '#bef264',
    delay: impact,
    radius: 1,
    duration: 1100,
  })
  shockwave(ctx, ground(target), { color: '#6b21a8', delay: impact, radius: 1.8 })
  squash(ctx, target, { delay: impact, amount: 0.25, duration: 400 })
  const splatter = [-0.35, 0.35].map((side) => {
    const direction = flatDirection(source, target)
    return offsetPoint(
      beyond(source, target, 1.3, 0.2),
      direction.clone().cross(UP).multiplyScalar(side),
    )
  })
  splatter.forEach((point, index) =>
    prop(ctx, source, target, {
      build: () => makeGlob('#6b21a8', 0.1, 0.35),
      from: at(target, 0.5),
      to: point,
      delay: impact,
      duration: 280 + index * 40,
      arc: 0.4,
      spin: 6,
    }),
  )
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.5 }).slice(0, 2)
  flinch(ctx, victims, impact + 260)
  shake(ctx, strength + 1, impact, 320)
  return impact
}

const shellderIcicleSpear: Choreography = (ctx, { source, target, shake: strength }) => {
  const first = 220
  for (let index = 0; index < 4; index++) {
    const offset = new THREE.Vector3(0, ((index % 2) - 0.5) * 0.12, 0)
    prop(ctx, source, target, {
      build: () => makeIcicle('#bae6fd', 0.4),
      from: offsetPoint(ahead(source, target, 0.2, 0.55), offset),
      to: at(target, 0.55),
      delay: 60 + index * 70,
      duration: 160,
      arc: 0.04,
    })
  }
  burst(ctx, at(target), { color: '#e0f2fe', count: 10, delay: first, speed: 1.4 })
  burst(ctx, at(target), { color: '#a5f3fc', count: 14, delay: first + 210, speed: 1.8 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1 }).slice(0, 2)
  flinch(ctx, victims, first + 210)
  shake(ctx, strength * 0.5, first + 210)
  return first
}

const cloysterSpikeCannon: Choreography = (ctx, { source, target, shake: strength }) => {
  const first = 260
  fx(ctx, 0, 700, undefined, (p) => {
    source.pose.scale *=
      1 + 0.12 * pulse(phase(p, 0, 0.3)) + 0.04 * Math.sin(p * 40) * phase(p, 0.2, 0.9)
  })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.8 }).slice(0, 2)
  const muzzlePoint = ahead(source, target, 0.35, 0.6)
  for (let index = 0; index < 7; index++) {
    const spike = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.34, 7).rotateX(Math.PI / 2),
      lit('#64748b', 0.2, 0.3),
    )
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.12, 6).rotateX(Math.PI / 2),
      lit('#f1f5f9', 0.5, 0.2),
    )
    tip.position.z = 0.14
    spike.add(body, tip)
    const fan = new THREE.Vector3((((index * 3) % 5) - 2) * 0.06, ((index % 3) - 1) * 0.08, 0)
    const aim =
      index >= 5 && victims[index - 5] ? at(victims[index - 5]) : offsetPoint(at(target), fan)
    prop(ctx, source, target, {
      build: () => spike,
      from: offsetPoint(muzzlePoint, fan),
      to: aim,
      delay: 100 + index * 45,
      duration: 160,
      arc: 0.03,
    })
  }
  burst(ctx, muzzlePoint, {
    color: '#e2e8f0',
    count: 10,
    delay: 100,
    speed: 1.2,
    spread: 'ring',
    gravity: 0,
  })
  burst(ctx, at(target), { color: '#cbd5e1', count: 12, delay: first, speed: 1.6 })
  burst(ctx, at(target), { color: '#a5f3fc', count: 16, delay: first + 180, speed: 2.1 })
  shockwave(ctx, ground(target), {
    color: '#94a3b8',
    delay: first + 180,
    radius: 1.1,
    duration: 380,
  })
  flinch(ctx, victims, first + 250)
  shake(ctx, strength, first + 180)
  return first
}

const cloysterShellSmash: Choreography = (ctx, { source, target, shake: strength }) => {
  const smash = 460
  const shell = new THREE.Group()
  const halves = [1, -1].map((flip) => {
    const half = new THREE.Group()
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#4b5563',
        emissive: '#ef4444',
        emissiveIntensity: 0,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    )
    half.add(dome)
    for (let index = 0; index < 6; index++) {
      const angle = (index / 6) * Math.PI * 2
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 6), lit('#e5e7eb', 0.2, 0.3))
      spike.position.set(Math.cos(angle) * 0.4, 0.45, Math.sin(angle) * 0.4)
      spike.lookAt(Math.cos(angle) * 2, 1.4, Math.sin(angle) * 2)
      spike.rotateX(Math.PI / 2)
      half.add(spike)
    }
    half.scale.y = flip
    shell.add(half)
    return { half, dome, flip }
  })
  fx(ctx, 0, 900, shell, (p, now) => {
    shell.position.copy(source.root.position).setY(0.6)
    const close = easeInOut(phase(p, 0, 0.35))
    const burstOut = easeInOut(phase(p, 0.51, 0.8))
    halves.forEach(({ half, dome, flip }) => {
      half.position.y = flip * (0.5 * (1 - close) + burstOut * 1.2)
      half.rotation.z = flip * burstOut * 1.2
      half.rotation.x = flip * burstOut * 0.6
      const material = dome.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = phase(p, 0.3, 0.5) * (0.8 + 0.4 * Math.sin(now * 0.05))
    })
    shell.scale.setScalar(0.6 + 0.4 * close + 0.3 * burstOut)
    setOpacity(shell, 1 - phase(p, 0.65, 0.9))
  })
  fx(ctx, 150, smash - 150, undefined, (p, now) => {
    source.pose.offset.x += Math.sin(now * 0.1) * 0.03 * p
  })
  burst(ctx, at(source), { color: '#94a3b8', count: 26, delay: smash, speed: 2.8, gravity: 2 })
  pillar(ctx, ground(source), {
    color: '#ef4444',
    delay: smash,
    duration: 650,
    height: 2.4,
    radius: 0.42,
  })
  aura(ctx, source, { color: '#f97316', delay: smash, duration: 800, count: 26 })
  shockwave(ctx, ground(source), { color: '#fb7185', delay: smash, radius: 1.9 })
  allyTeam(ctx, source, target, 1.6, 3)
    .filter((ally) => ally !== source)
    .forEach((ally, index) =>
      aura(ctx, ally, {
        color: '#fb923c',
        delay: smash + 100 + index * 60,
        duration: 600,
        count: 12,
      }),
    )
  shake(ctx, strength, smash)
  return smash
}

const gastlyHex: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 420
  stream(ctx, at(source, 0.6), at(target, 0.6), {
    color: '#7c3aed',
    count: 26,
    size: 0.22,
    duration: 520,
    spread: 0.3,
    travel: 0.6,
    wobble: 0.12,
    rise: 0.3,
  })
  const glyph = new THREE.Group()
  const hexRing = new THREE.Mesh(hexagonGeometry(0.4, 0.34), glow('#a855f7', 0.9))
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), glow('#f0abfc', 0.8))
  eye.scale.y = 0.45
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), glow('#4c1d95', 1))
  pupil.scale.x = 0.5
  pupil.position.z = 0.01
  glyph.add(hexRing, eye, pupil)
  fx(ctx, 140, 780, glyph, (p) => {
    target.focusPoint(glyph.position, 1.35)
    billboard(ctx, glyph)
    hexRing.rotation.z = p * 4
    eye.scale.y = 0.45 * (1 - pulse(phase(p, 0.3, 0.4)) * 0.9)
    glyph.scale.setScalar(0.5 + 0.5 * phase(p, 0, 0.25) + 0.3 * pulse(phase(p, 0.35, 0.6)))
    setOpacity(glyph, 1 - phase(p, 0.75, 1))
  })
  burst(ctx, ground(target), {
    color: '#a855f7',
    count: 22,
    delay: impact,
    spread: 'up',
    speed: 1.5,
    gravity: -0.6,
    duration: 800,
  })
  burst(ctx, at(target), { color: '#f0abfc', count: 14, delay: impact, speed: 1.6 })
  shockwave(ctx, ground(target), { color: '#6d28d9', delay: impact, radius: 1, duration: 420 })
  shake(ctx, strength * 0.6, impact)
  return impact
}

const haunterNightmare: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 460
  const hands = new THREE.Group()
  const handMeshes = [1, -1].map((side) => {
    const hand = fistMesh(0.13 * 2, () => lit('#7c3aed', 0.25))
    hand.userData.side = side
    hands.add(hand)
    return hand
  })
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const lateral = new THREE.Vector3()
  fx(ctx, 0, 1000, hands, (p, now) => {
    source.focusPoint(from, 0.7)
    target.focusPoint(to, 1)
    lateral.subVectors(to, from).setY(0).cross(UP).normalize()
    const reach = easeInOut(phase(p, 0, impact / 1000))
    handMeshes.forEach((hand) => {
      const side = hand.userData.side as number
      hand.position.lerpVectors(from, to, reach)
      hand.position.addScaledVector(lateral, side * (0.5 - 0.3 * reach))
      hand.position.y += Math.sin(Math.PI * reach) * 0.5 + Math.sin(now * 0.015 + side) * 0.04
      hand.lookAt(to)
    })
    setOpacity(hands, 0.8 * (1 - phase(p, 0.8, 1)))
  })
  const cloud = new THREE.Group()
  for (let index = 0; index < 7; index++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + (index % 3) * 0.05, 12, 8),
      new THREE.MeshBasicMaterial({
        color: '#1e1b4b',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    )
    puff.userData.angle = (index / 7) * Math.PI * 2
    cloud.add(puff)
  }
  cloud.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), glow('#6d28d9', 0.35)))
  fx(ctx, 250, 1000, cloud, (p, now) => {
    target.focusPoint(cloud.position, 1.5)
    cloud.children.forEach((puff, index) => {
      const angle = ((puff.userData.angle as number | undefined) ?? 0) + now * 0.004
      if (puff.userData.angle === undefined) return
      puff.position.set(
        Math.cos(angle) * 0.3,
        Math.sin(now * 0.01 + index) * 0.05,
        Math.sin(angle) * 0.3,
      )
    })
    cloud.scale.setScalar(
      Math.max(0.01, easeInOut(phase(p, 0, 0.25))) * (1 + 0.08 * Math.sin(now * 0.01)),
    )
    setOpacity(cloud, 1 - phase(p, 0.75, 1))
  })
  fx(ctx, impact, 800, undefined, (p, now) => {
    target.pose.lift -= 0.1 * pulse(p)
    target.pose.tilt += Math.sin(now * 0.006) * 0.3 * pulse(p)
  })
  ringCage(ctx, target, {
    color: '#6d28d9',
    delay: impact,
    duration: 800,
    radius: 0.55,
    tube: 0.025,
  })
  burst(ctx, at(target, 1.3), {
    color: '#4c1d95',
    count: 16,
    delay: impact,
    speed: 0.8,
    gravity: 1.8,
    duration: 800,
  })
  burst(ctx, at(target), { color: '#c4b5fd', count: 12, delay: impact, speed: 1.6 })
  shake(ctx, strength * 0.6, impact)
  return impact
}

const krabbyCrabhammer: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 480
  aura(ctx, source, { color: '#38bdf8', duration: 500, count: 12 })
  if (!ctx.reducedMotion) {
    leap(ctx, source, { delay: 150, duration: 450, height: 0.6 })
    dash(ctx, source, target, { delay: 150, duration: 700, hold: 0.25 })
  }
  const claw = makePincer('#ea580c', 0.2)
  claw.setOpen(0.1)
  claw.group.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), glow('#7dd3fc', 0.3)))
  const top = new THREE.Vector3()
  const hit = new THREE.Vector3()
  fx(ctx, 0, 700, claw.group, (p) => {
    source.focusPoint(top, 1.5).add(source.pose.offset)
    top.y += source.pose.lift
    target.focusPoint(hit, 1.1)
    const swing = easeInOut(phase(p, 0.3, impact / 700))
    claw.group.position.lerpVectors(top, hit, swing)
    claw.group.position.y += Math.sin(Math.PI * swing) * 0.5
    billboard(ctx, claw.group)
    claw.group.rotateZ(Math.PI / 2 - swing * 2.2)
    claw.group.scale.setScalar(0.6 + 0.4 * phase(p, 0, 0.2) + 0.3 * swing)
    setOpacity(claw.group, 1 - phase(p, 0.8, 1))
  })
  burst(ctx, ground(target), {
    color: '#7dd3fc',
    count: 24,
    delay: impact,
    spread: 'up',
    speed: 2.2,
    gravity: 2.5,
  })
  burst(ctx, at(target), { color: '#ffffff', count: 10, delay: impact, speed: 1.6 })
  shockwave(ctx, ground(target), { color: '#38bdf8', delay: impact, radius: 1.4 })
  squash(ctx, target, { delay: impact, amount: 0.2 })
  shake(ctx, strength, impact)
  return impact
}

const kinglerRazorShell: Choreography = (ctx, { source, target, shake: strength }) => {
  const extra = 1.8
  const launch = 150
  const travel = 380
  const impact =
    launch + Math.round((travel * distance(source, target)) / (distance(source, target) + extra))
  chargeOrb(ctx, ahead(source, target, 0.3, 0.6), { color: '#67e8f9', size: 0.14, duration: 200 })
  const to = beyond(source, target, extra, 0.6)
  ;[0.6, -0.6].forEach((tilt, index) => {
    const blade = new THREE.Group()
    const edge = crescentMesh('#22d3ee', 0.3)
    const inner = crescentMesh('#ecfeff', 0.24)
    blade.add(edge, inner)
    for (let ridge = 0; ridge < 3; ridge++) {
      const angle = 0.3 + ridge * 0.9
      const scallop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow('#a5f3fc', 0.9))
      scallop.position.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0)
      blade.add(scallop)
    }
    const start = new THREE.Vector3()
    fx(ctx, launch + index * 40, travel, blade, (p, now) => {
      if (p === 0 || start.lengthSq() === 0) start.copy(ahead(source, target, 0.3, 0.6)())
      blade.position.lerpVectors(start, to(), p)
      billboard(ctx, blade)
      blade.rotateZ(tilt + now * 0.03)
      blade.rotateX(tilt)
      setOpacity(blade, 1 - phase(p, 0.85, 1))
    })
  })
  slashArc(ctx, at(target), {
    color: '#22d3ee',
    delay: impact,
    angle: -0.8,
    radius: 0.6,
    sweep: 1.6,
  })
  slashArc(ctx, at(target), {
    color: '#a5f3fc',
    delay: impact + 40,
    angle: 2.3,
    radius: 0.6,
    sweep: 1.6,
  })
  burst(ctx, at(target), { color: '#cffafe', count: 18, delay: impact, speed: 2 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: extra }).slice(0, 3)
  flinch(ctx, victims, impact + 100)
  shake(ctx, strength, impact)
  return impact
}

const kinglerGuillotine: Choreography = (ctx, { source, target, shake: strength }) => {
  const snap = 700
  crouch(ctx, source, { duration: 320 })
  aura(ctx, source, { color: '#f97316', duration: 700, count: 16 })
  pincerSnap(ctx, target, {
    color: '#c2410c',
    size: 0.55,
    delay: 100,
    duration: 1000,
    snapAt: 0.6,
    lift: 0.4,
  })
  cameraPunch(ctx, at(target), 0.7, snap - 60)
  slashArc(ctx, at(target), {
    color: '#ffffff',
    delay: snap,
    angle: -0.05,
    radius: 1.2,
    width: 0.07,
    sweep: 0.15,
    duration: 300,
  })
  burst(ctx, at(target), { color: '#fed7aa', count: 30, delay: snap, speed: 2.6 })
  shockwave(ctx, ground(target), { color: '#f97316', delay: snap, radius: 1.9 })
  shockwave(ctx, ground(target), { color: '#ffffff', delay: snap + 60, radius: 1.1, duration: 420 })
  squash(ctx, target, { delay: snap, amount: 0.3, duration: 360 })
  shake(ctx, strength + 2, snap, 360)
  return snap
}

const horseaBubbleBeam: Choreography = (ctx, { source, target, shake: strength }) => {
  const extra = 1.2
  const launch = 80
  const duration = 700
  const impact =
    launch +
    Math.round((duration * 0.5 * distance(source, target)) / (distance(source, target) + extra))
  crouch(ctx, source, { duration: 200 })
  bubbles(ctx, ahead(source, target, 0.3, 0.6), beyond(source, target, extra, 0.6), {
    color: '#7dd3fc',
    count: 12,
    size: 0.1,
    wobble: 0.08,
    delay: launch,
    duration,
  })
  burst(ctx, at(target), {
    color: '#e0f2fe',
    count: 12,
    delay: impact,
    speed: 1.3,
    spread: 'ring',
    gravity: 0,
  })
  burst(ctx, at(target), { color: '#7dd3fc', count: 12, delay: impact + 200, speed: 1.6 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: extra }).slice(0, 2)
  flinch(ctx, victims, impact + 150)
  shake(ctx, strength * 0.5, impact)
  return impact
}

const seadraHydroPump: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 280
  crouch(ctx, source, { duration: 200 })
  const direction = new THREE.Vector3()
  fx(ctx, 200, 650, undefined, (p) => {
    flatDirection(source, target, direction)
    source.pose.offset.addScaledVector(direction, -0.2 * pulse(phase(p, 0, 0.6)))
  })
  const mouth = ahead(source, target, 0.3, 0.6)
  const end = beyond(source, target, 1.6, 0.6)
  rayBeam(ctx, mouth, end, {
    colors: ['#2563eb', '#38bdf8'],
    core: '#e0f2fe',
    width: 0.2,
    delay: 200,
    duration: 650,
    grow: 0.12,
    twist: 2,
    rings: '#bae6fd',
  })
  stream(ctx, mouth, end, {
    color: '#e0f2fe',
    count: 30,
    size: 0.1,
    spread: 0.45,
    travel: 0.4,
    delay: 200,
    duration: 600,
  })
  burst(ctx, ground(target), {
    color: '#7dd3fc',
    count: 26,
    delay: impact,
    spread: 'up',
    speed: 2.2,
    gravity: 2.2,
  })
  burst(ctx, at(target), { color: '#ffffff', count: 12, delay: impact, speed: 1.8 })
  shockwave(ctx, ground(target), { color: '#60a5fa', delay: impact, radius: 1.4 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.6 }).slice(0, 3)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#7dd3fc', count: 10, delay: impact + 60 }),
  )
  flinch(ctx, victims, impact + 60)
  shake(ctx, strength + 1, impact, 360)
  return impact
}

const kingdraDracoMeteor: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 1000
  const head = ahead(source, target, 0.1, 0.9)
  chargeOrb(ctx, head, { color: '#f97316', core: '#fde68a', size: 0.2, duration: 340 })
  const sky = new THREE.Vector3()
  const skyPoint = () => sky.copy(source.root.position).setY(6)
  const orb = orbMesh('#60a5fa', '#fb923c', 0.14)
  prop(ctx, source, target, {
    build: () => orb,
    from: head,
    to: skyPoint,
    delay: 300,
    duration: 300,
    arc: 0,
  })
  burst(ctx, skyPoint, { color: '#fb923c', count: 24, delay: 600, speed: 2.5, gravity: 0 })
  const center = target.root.position
  const spots: [number, number][] = [
    [0.9, -0.5],
    [-0.8, 0.6],
    [0.5, 0.9],
    [-0.6, -0.8],
    [1.1, 0.4],
  ]
  spots.forEach(([x, z], index) => {
    const point = () => new THREE.Vector3(center.x + x, 0.1, center.z + z)
    const delay = 640 + index * 55
    meteor(ctx, point, {
      color: index % 2 ? '#fb923c' : '#f97316',
      trail: '#60a5fa',
      delay,
      duration: 360,
      size: 0.16,
    })
    burst(ctx, point, { color: '#fdba74', count: 8, delay: delay + 360, speed: 1.4 })
  })
  meteor(ctx, ground(target), {
    color: '#f97316',
    trail: '#3b82f6',
    delay: impact - 420,
    duration: 420,
    size: 0.32,
  })
  cameraPunch(ctx, at(target), 0.6, impact - 40)
  shockwave(ctx, ground(target), { color: '#fb923c', delay: impact, radius: 2.4 })
  pillar(ctx, ground(target), {
    color: '#f97316',
    delay: impact,
    duration: 600,
    height: 2,
    radius: 0.55,
  })
  burst(ctx, at(target), { color: '#fde68a', count: 32, delay: impact, speed: 2.8 })
  const victims = enemiesAround(ctx, source, target, 1.8).slice(0, 3)
  flinch(ctx, victims, impact - 100, 40)
  shake(ctx, strength + 2, impact, 420)
  return impact
}

const dratiniDragonBreath: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 300
  leap(ctx, source, { duration: 320, height: 0.15 })
  const mouth = ahead(source, target, 0.3, 0.7)
  const end = beyond(source, target, 1.4, 0.55)
  stream(ctx, mouth, end, {
    color: '#34d399',
    count: 36,
    size: 0.18,
    spread: 0.5,
    travel: 0.45,
    wobble: 0.04,
    delay: 120,
    duration: 520,
  })
  stream(ctx, mouth, end, {
    color: '#818cf8',
    count: 22,
    size: 0.14,
    spread: 0.35,
    travel: 0.42,
    wobble: 0.04,
    delay: 150,
    duration: 480,
  })
  lightning(ctx, target, {
    color: '#fde047',
    from: at(target, 1.2),
    delay: impact + 40,
    duration: 220,
    segments: 5,
    jitter: 0.25,
  })
  burst(ctx, at(target), { color: '#6ee7b7', count: 16, delay: impact, speed: 1.8 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.4 }).slice(0, 2)
  flinch(ctx, victims, impact + 80)
  shake(ctx, strength * 0.6, impact)
  return impact
}

const dragonairAquaTail: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 600
  if (!ctx.reducedMotion) {
    spin(ctx, source, { duration: 450, turns: 1.5 })
    dash(ctx, source, target, { delay: 380, duration: 520, hold: 0.25 })
  }
  leap(ctx, source, { delay: 380, duration: 420, height: 0.7, slam: true })
  ringCage(ctx, source, { color: '#38bdf8', count: 2, radius: 0.6, tube: 0.05, duration: 520 })
  const tail = new THREE.Group()
  tail.add(crescentMesh('#38bdf8', 0.7), crescentMesh('#e0f2fe', 0.62))
  fx(ctx, 420, 400, tail, (p) => {
    target.focusPoint(tail.position, 0.7)
    billboard(ctx, tail)
    tail.rotateZ(1.8 - easeInOut(phase(p, 0, 0.45)) * 2.6)
    tail.scale.setScalar(0.7 + 0.5 * phase(p, 0, 0.45))
    setOpacity(tail, 1 - phase(p, 0.6, 1))
  })
  burst(ctx, ground(target), {
    color: '#7dd3fc',
    count: 28,
    delay: impact,
    spread: 'up',
    speed: 2.4,
    gravity: 2.5,
  })
  burst(ctx, at(target), { color: '#ffffff', count: 12, delay: impact, speed: 1.8 })
  shockwave(ctx, ground(target), { color: '#0ea5e9', delay: impact, radius: 2 })
  shockwave(ctx, ground(target), {
    color: '#e0f2fe',
    delay: impact + 70,
    radius: 1.2,
    duration: 450,
  })
  const victims = enemiesAround(ctx, source, target, 1.5).slice(0, 3)
  victims.forEach((victim) =>
    burst(ctx, ground(victim), {
      color: '#7dd3fc',
      count: 10,
      delay: impact + 80,
      spread: 'up',
      speed: 1.6,
      gravity: 2.5,
    }),
  )
  flinch(ctx, victims, impact + 80)
  shake(ctx, strength, impact)
  return impact
}

const dragoniteHyperBeam: Choreography = (ctx, { source, target, shake: strength }) => {
  const fire = 620
  const beamMs = 700
  const impact = fire + 110
  fx(ctx, 0, fire, undefined, (p) => {
    source.pose.lift += 0.2 * easeInOut(p)
    source.pose.scale *= 1 + 0.12 * easeInOut(p)
    source.pose.tilt -= 0.12 * easeInOut(p)
  })
  aura(ctx, source, { color: '#fb923c', duration: 700, count: 26 })
  const mouth: PointFn = (() => {
    const base = ahead(source, target, 0.35, 0.8)
    const out = new THREE.Vector3()
    return () => out.copy(base()).setY(source.height * 0.8 + source.pose.lift)
  })()
  chargeOrb(ctx, mouth, { color: '#fb923c', core: '#fef9c3', size: 0.3, duration: fire, count: 30 })
  cameraPunch(ctx, at(source), 0.35, 200)
  rayBeam(ctx, mouth, beyond(source, target, 3, 0.6), {
    colors: ['#f97316', '#facc15'],
    core: '#fffbeb',
    width: 0.3,
    delay: fire,
    duration: beamMs,
    grow: 0.12,
    twist: 1,
    rings: '#fde68a',
  })
  const direction = new THREE.Vector3()
  fx(ctx, fire, beamMs, undefined, (p, now) => {
    flatDirection(source, target, direction)
    source.pose.offset.addScaledVector(direction, -0.18 * pulse(phase(p, 0, 0.3)) - 0.08 * (1 - p))
    source.pose.offset.x += Math.sin(now * 0.1) * 0.02 * (1 - p)
    source.pose.lift += 0.2 * (1 - p)
  })
  cameraPunch(ctx, at(target), 0.6, impact - 40)
  blast(ctx, at(target), {
    color: '#f97316',
    core: '#fef08a',
    radius: 1.2,
    delay: impact,
    duration: 560,
  })
  pillar(ctx, ground(target), {
    color: '#fbbf24',
    delay: impact,
    duration: 650,
    height: 3,
    radius: 0.5,
  })
  shockwave(ctx, ground(target), { color: '#f97316', delay: impact, radius: 2.4 })
  burst(ctx, at(target), { color: '#fde047', count: 36, delay: impact, speed: 3 })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 3 }).slice(0, 3)
  victims.forEach((victim, index) =>
    burst(ctx, at(victim), {
      color: '#fb923c',
      count: 12,
      delay: impact + 60 + index * 50,
      speed: 2,
    }),
  )
  flinch(ctx, victims, impact + 60, 50)
  shake(ctx, strength + 2, impact, 450)
  // Recharge turn: Dragonite slumps and steams before it can move again.
  fx(ctx, fire + beamMs, 450, undefined, (p) => {
    source.pose.scale *= 1 - 0.1 * pulse(p)
    source.pose.lift -= 0.08 * pulse(p)
    source.pose.tilt += 0.15 * pulse(p)
  })
  burst(ctx, at(source, 0.9), {
    color: '#d6d3d1',
    count: 12,
    delay: fire + beamMs + 20,
    spread: 'up',
    speed: 0.9,
    gravity: -0.3,
  })
  return impact
}

export const POKEMON_TIER_3_ULTIMATES: UltimateSet = {
  abra: abraKinesis,
  kadabra: kadabraPsybeam,
  alakazam: alakazamFutureSight,
  machop: machopLowSweep,
  machoke: machokeBulkUp,
  machamp: machampDynamicPunch,
  bellsprout: bellsproutVineWhip,
  weepinbell: weepinbellAcid,
  victreebel: victreebelPowerWhip,
  doduo: doduoDoubleHit,
  'dodrio:Tri Attack': dodrioTriAttack,
  'dodrio:Agility': dodrioAgility,
  'dewgong:Aurora Beam': dewgongAuroraBeam,
  'dewgong:Perish Song': dewgongPerishSong,
  grimer: grimerSludge,
  'muk:Acid Armor': mukAcidArmor,
  'muk:Gunk Shot': mukGunkShot,
  shellder: shellderIcicleSpear,
  'cloyster:Spike Cannon': cloysterSpikeCannon,
  'cloyster:Shell Smash': cloysterShellSmash,
  gastly: gastlyHex,
  haunter: haunterNightmare,
  krabby: krabbyCrabhammer,
  'kingler:Razor Shell': kinglerRazorShell,
  'kingler:Guillotine': kinglerGuillotine,
  horsea: horseaBubbleBeam,
  seadra: seadraHydroPump,
  kingdra: kingdraDracoMeteor,
  dratini: dratiniDragonBreath,
  dragonair: dragonairAquaTail,
  dragonite: dragoniteHyperBeam,
}
