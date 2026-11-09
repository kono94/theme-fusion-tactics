import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import {
  bloomRing,
  caltrop,
  clawMarks,
  crescentSlash,
  DARK_BODY,
  DARK_RIM,
  DARK_SHADE,
  DARK_SMOKE,
  darkCrescent,
  eggMesh,
  gemMesh,
  helixStrands,
  heracrossHorn,
  mawileJaw,
  milkBottle,
  scizorPincer,
  sickleBlade,
  stoneBlade,
  tailSweep,
  tearMesh,
} from '../kit/gen23Tier45'
import {
  above,
  alliesAround,
  beyond,
  bodyAt,
  bodyPoint,
  crystalShard,
  debris,
  driftMotes,
  easeIn,
  easeOut,
  embers,
  enemiesAround,
  enemiesInLine,
  extend,
  fadeInOut,
  flames,
  flameTorrent,
  flat,
  flatDirection,
  flinch,
  flinchAlong,
  forkedBolt,
  fx,
  groundArcs,
  groundCracks,
  heartGeometry,
  heatShimmer,
  hexagonGeometry,
  legendaryWings,
  motionScale,
  offsetPoint,
  phase,
  puddle,
  pulse,
  rayBeam,
  rush,
  setOpacity,
  shell,
  shiver,
  spectrumRing,
  speedStreaks,
  splashCrown,
  squash,
  standard,
  starPower,
  statArrows,
  stream,
  tailRibbons,
  waterJet,
  waveWall,
  zap,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  crouch,
  flare,
  type FxContext,
  glow,
  ground,
  levitate,
  meteor,
  orbit,
  pillar,
  prop,
  pushBack,
  shake,
  shockwave,
  spikes,
  spin,
  starGeometry,
  vortex,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'

const UP = new THREE.Vector3(0, 1, 0)

// Small stars circling above stunned heads.
function daze(ctx: FxContext, victims: UnitView[], delay: number, color = '#fde047'): void {
  victims.slice(0, 4).forEach((victim) =>
    orbit(ctx, victim, {
      color,
      count: 3,
      radius: 0.3,
      heightFactor: 1.08,
      turns: 2,
      billboard: true,
      build: () => new THREE.Mesh(starGeometry(5, 0.07, 0.03), glow(color, 0.85)),
      delay,
      duration: 900,
    }),
  )
}

// Hover envelope for flying legendaries: rise, bob, settle.
function hover(ctx: FxContext, source: UnitView, duration: number, height: number): void {
  const m = motionScale(ctx)
  fx(ctx, 0, duration, undefined, (p, now) => {
    const rise = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.8, 1)))
    source.pose.lift += (height + Math.sin(now * 0.006) * 0.05) * rise * m
  })
}

const scizorBulletPunch: Choreography = (ctx, { source, target, shake: strength }) => {
  const jabs = [260, 330, 400]
  const impact = 500
  crouch(ctx, source, { duration: 200 })
  aura(ctx, source, { color: '#cbd5e1', duration: 420, count: 14, radius: 0.4 })
  flare(ctx, bodyAt(source, 0.6), {
    color: '#ef4444',
    core: '#fecaca',
    size: 0.3,
    rays: 4,
    delay: 150,
  })
  rush(ctx, source, target, { delay: 200, duration: 560, reach: 0.75, outEnd: 0.12, hold: 0.55 })
  speedStreaks(ctx, bodyAt(source, 0.55), at(target), {
    color: '#fca5a5',
    count: 8,
    spread: 0.4,
    delay: 200,
    duration: 220,
  })
  const pincers = [...jabs, impact].map((delay, index) => {
    const main = index === jabs.length
    const { group, open } = scizorPincer(main ? 0.22 : 0.15)
    open(main ? 0.15 : 0.5)
    extend(ctx, source, target, {
      color: '#991b1b',
      tip: group,
      delay: delay - 70,
      duration: main ? 260 : 150,
      thickness: 0.04,
      side: index % 2 ? 0.16 : -0.16,
      rise: main ? 0.05 : -0.05,
    })
    flare(ctx, at(target, 0.5 + (index % 2) * 0.1), {
      color: main ? '#ef4444' : '#f87171',
      core: '#e2e8f0',
      size: main ? 0.5 : 0.28,
      rays: main ? 8 : 4,
      delay,
    })
    return delay
  })
  flinch(ctx, [target], jabs[0])
  burst(ctx, at(target), { color: '#cbd5e1', count: 14, delay: impact, speed: 2.2 })
  debris(ctx, at(target), { color: '#94a3b8', count: 6, size: 0.05, pointed: true, delay: impact })
  shockwave(ctx, ground(target), { color: '#ef4444', delay: impact, radius: 1.1, duration: 380 })
  // Execute pressure: a red finishing crosshair snaps shut over the target.
  clawMarks(ctx, at(target), {
    color: '#b91c1c',
    edge: '#ef4444',
    count: 1,
    length: 0.9,
    angle: 0.8,
    delay: impact + 40,
  })
  clawMarks(ctx, at(target), {
    color: '#b91c1c',
    edge: '#ef4444',
    count: 1,
    length: 0.9,
    angle: -0.8,
    delay: impact + 80,
  })
  pushBack(ctx, target, source.root.position, { delay: impact, duration: 320, distance: 0.25 })
  shake(ctx, strength * 0.6, pincers[pincers.length - 1], 220)
  return impact
}

const heracrossMegahorn: Choreography = (ctx, { source, target, shake: strength }) => {
  const charge = 300
  const impact = 560
  const direction = flatDirection(source, target)
  shiver(ctx, source, { duration: 300, amount: 0.04 })
  cloud(ctx, ground(source), {
    color: '#a8a29e',
    count: 4,
    radius: 0.35,
    opacity: 0.35,
    delay: 120,
    duration: 500,
  })
  const body = rush(ctx, source, target, {
    delay: charge,
    duration: 560,
    reach: 0.95,
    outEnd: 0.45,
    hold: 0.15,
  })
  const horn = heracrossHorn(0.5)
  const holder = new THREE.Group()
  holder.add(horn)
  const bodyNow = new THREE.Vector3()
  fx(ctx, 0, charge + 560, holder, (p, now) => {
    const elapsed = p * (charge + 560)
    if (elapsed < charge) bodyPoint(source, 0.75, holder.position)
    else body(now, holder.position).setY(source.height * 0.75)
    bodyNow.copy(holder.position).addScaledVector(direction, 1)
    holder.lookAt(bodyNow)
    holder.rotateX(
      -0.6 * (1 - easeInOut(phase(elapsed, 120, charge + 80))) +
        0.15 * pulse(phase(elapsed, charge, impact)),
    )
    setOpacity(holder, fadeInOut(p, 0.1, 0.15))
  })
  speedStreaks(ctx, bodyAt(source, 0.6), beyond(source, target, 1.4), {
    color: '#93c5fd',
    count: 10,
    spread: 0.55,
    delay: charge + 60,
    duration: 300,
  })
  const victims = [target, ...enemiesInLine(ctx, source, target, { overshoot: 1.5 })].slice(0, 4)
  flare(ctx, at(target, 0.65), {
    color: '#3b82f6',
    core: '#bfdbfe',
    size: 0.55,
    rays: 6,
    delay: impact,
  })
  shockwave(ctx, ground(target), { color: '#60a5fa', delay: impact, radius: 1.3, duration: 420 })
  debris(ctx, ground(target), { color: '#78716c', count: 8, delay: impact, speed: 1.6 })
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    burst(ctx, at(victim), { color: '#93c5fd', count: 10, delay, speed: 1.8 })
    pushBack(ctx, victim, source.root.position, {
      delay,
      duration: 420,
      distance: 0.55,
      lift: 0.25,
    })
  })
  flinch(ctx, victims, impact, 70)
  shake(ctx, strength * 0.7, impact, 260)
  return impact
}

const skarmorySpikes: Choreography = (ctx, { source, shake: strength }) => {
  const impact = 600
  hover(ctx, source, 1100, 0.35)
  legendaryWings(ctx, source, {
    style: 'spike',
    color: '#94a3b8',
    core: '#cbd5e1',
    accent: '#b91c1c',
    span: 0.95,
    feathers: 6,
    flapRate: 1.2,
    flapAmount: 0.14,
    thrust: [0.3, 0.45],
    duration: 1100,
  })
  const count = 8
  const landing = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.2
    const distance = 0.9 + (index % 2) * 0.45
    return new THREE.Vector3(Math.cos(angle) * distance, 0.07, Math.sin(angle) * distance)
  })
  const group = new THREE.Group()
  const pieces = landing.map(() => {
    const piece = caltrop(0.09)
    group.add(piece)
    return piece
  })
  const glints = new THREE.Group()
  group.add(glints)
  const start = new THREE.Vector3()
  fx(ctx, 330, 1150, group, (p, now) => {
    const elapsed = p * 1150
    bodyPoint(source, 0.6, start)
    const flight = easeOut(phase(elapsed, 0, impact - 330))
    pieces.forEach((piece, index) => {
      const land = landing[index]
      piece.position.set(
        start.x + (source.root.position.x + land.x - start.x) * flight,
        start.y + (land.y - start.y) * flight + Math.sin(Math.PI * flight) * 0.7,
        start.z + (source.root.position.z + land.z - start.z) * flight,
      )
      piece.rotation.set(now * 0.01 * (1 - flight) + index, index * 1.3, 0)
    })
    setOpacity(group, 1 - phase(p, 0.8, 1))
  })
  const victims = enemiesAround(ctx, source, source, 1.9).slice(0, 4)
  shockwave(ctx, ground(source), {
    color: '#94a3b8',
    delay: impact,
    radius: 1.8,
    duration: 420,
    thickness: 0.12,
  })
  burst(ctx, ground(source), {
    color: '#cbd5e1',
    count: 16,
    delay: impact,
    speed: 1.6,
    spread: 'ring',
  })
  victims.forEach((victim) => {
    spikes(ctx, ground(victim), {
      color: '#64748b',
      count: 5,
      radius: 0.35,
      height: 0.55,
      width: 0.08,
      solid: true,
      delay: impact,
      duration: 700,
    })
    burst(ctx, at(victim, 0.25), {
      color: '#f87171',
      count: 6,
      delay: impact + 300,
      speed: 0.8,
      spread: 'up',
    })
  })
  flinch(ctx, victims, impact, 40)
  shake(ctx, strength * 0.4, impact, 200)
  return impact
}

const steelixIronTail: Choreography = (ctx, { source, target, shake: strength }) => {
  const duration = 820
  const impact = Math.round(duration * 0.62)
  squash(ctx, source, { duration: 300, amount: 0.12 })
  const tip = new THREE.Group()
  tip.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.5),
      standard('#64748b', { metalness: 0.8, roughness: 0.25, flatShading: true }),
    ),
    new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.54), glow('#cbd5e1', 0.35)),
  )
  tailSweep(ctx, source, target, {
    color: '#71717a',
    tip,
    segments: 8,
    size: 0.17,
    height: 1.8,
    duration,
  })
  aura(ctx, source, { color: '#94a3b8', duration: 500, count: 12, radius: 0.45 })
  const victims = [
    target,
    ...enemiesAround(ctx, source, source, 1.9).filter((enemy) => enemy !== target),
  ].slice(0, 4)
  groundCracks(ctx, ground(target), {
    color: '#57534e',
    count: 7,
    length: 1.4,
    delay: impact,
    duration: 900,
  })
  shockwave(ctx, ground(source), { color: '#a1a1aa', delay: impact, radius: 2, duration: 480 })
  shockwave(ctx, ground(target), {
    color: '#cbd5e1',
    delay: impact,
    radius: 1,
    duration: 360,
    thickness: 0.25,
  })
  debris(ctx, ground(target), { color: '#78716c', count: 10, delay: impact, speed: 2 })
  cloud(ctx, ground(target), {
    color: '#a8a29e',
    count: 5,
    radius: 0.6,
    opacity: 0.35,
    delay: impact,
    duration: 700,
  })
  flinch(ctx, victims, impact, 40)
  daze(ctx, victims, impact + 120)
  shake(ctx, strength * 0.8, impact, 300)
  return impact
}

const blisseySoftBoiled: Choreography = (ctx, { source }) => {
  const crack = 420
  const impact = 680
  squash(ctx, source, { duration: 260, amount: 0.12 })
  squash(ctx, source, { delay: 260, duration: 260, amount: 0.08 })
  const egg = eggMesh(0.16)
  const halves = new THREE.Group()
  const shells = [1, -1].map((sign) => {
    const half = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.3, 1),
      standard('#fef3c7', { roughness: 0.35 }),
    )
    half.rotation.x = sign > 0 ? 0 : Math.PI
    halves.add(half)
    return { half, sign }
  })
  const holder = new THREE.Group()
  holder.add(egg, halves)
  fx(ctx, 0, impact + 200, holder, (p, now) => {
    const elapsed = p * (impact + 200)
    bodyPoint(source, 0.55, holder.position)
    holder.position.y += 0.45 * easeOut(phase(elapsed, 0, 300)) + 0.03 * Math.sin(now * 0.01)
    holder.rotation.z = 0.15 * Math.sin(elapsed * 0.04) * pulse(phase(elapsed, 250, crack))
    const open = easeOut(phase(elapsed, crack, crack + 160))
    egg.visible = elapsed < crack
    halves.visible = elapsed >= crack
    shells.forEach(({ half, sign }) => {
      half.position.y = sign * 0.12 * open
      half.rotation.z = sign * 0.6 * open
    })
    setOpacity(holder, fadeInOut(p, 0.1, 0.25))
  })
  flare(ctx, offsetPoint(bodyAt(source, 0.55), new THREE.Vector3(0, 0.45, 0)), {
    color: '#f9a8d4',
    core: '#fdf2f8',
    size: 0.4,
    rays: 6,
    delay: crack,
  })
  const allies = alliesAround(ctx, source, 2.3, 4)
  const eggPoint = offsetPoint(bodyAt(source, 0.55), new THREE.Vector3(0, 0.45, 0))
  allies.forEach((ally, index) => {
    const delay = crack + 60 + index * 50
    prop(ctx, source, ally, {
      build: () => new THREE.Mesh(heartGeometry(0.09), flat('#f472b6', 0.9)),
      from: eggPoint,
      to: at(ally, 0.75),
      delay,
      duration: impact - delay,
      arc: 0.5,
      grow: 0.4,
    })
    bloomRing(ctx, ally, { color: '#86efac', radius: 0.55, delay: impact - 40, duration: 700 })
    aura(ctx, ally, { color: '#f9a8d4', delay: impact, duration: 600, count: 12, radius: 0.35 })
  })
  driftMotes(ctx, ground(source), {
    colors: ['#f9a8d4', '#86efac', '#fde68a'],
    count: 18,
    radius: 1,
    height: 1.4,
    delay: crack,
    duration: 800,
    twinkle: true,
  })
  return impact
}

const wobbuffetCounter: Choreography = (ctx, { source, shake: strength }) => {
  const impact = 600
  const power = Math.min(1.4, starPower(source))
  const m = motionScale(ctx)
  fx(ctx, 0, 700, undefined, (p) => {
    source.pose.tilt += -0.12 * pulse(phase(p, 0, 0.55)) * m
    source.pose.scale *= 1 - 0.1 * pulse(phase(p, 0.3, 0.75)) + 0.12 * pulse(phase(p, 0.75, 1))
  })
  shell(ctx, source, {
    color: '#60a5fa',
    edge: '#bfdbfe',
    radius: 0.62,
    material: 'crystal',
    delay: 60,
    duration: impact - 20,
  })
  orbit(ctx, source, {
    color: '#3b82f6',
    count: 6,
    radius: 0.7,
    heightFactor: 0.55,
    turns: 1.2,
    collapse: 0.65,
    billboard: true,
    build: () => new THREE.Mesh(hexagonGeometry(0.1, 0.07), glow('#93c5fd', 0.7)),
    delay: 100,
    duration: impact - 100,
  })
  const victims = enemiesAround(ctx, source, source, 1.9).slice(0, 4)
  // The stored damage is thrown back: hexagonal mirror panes burst outward at every nearby foe.
  victims.forEach((victim, index) => {
    prop(ctx, source, victim, {
      build: () => {
        const pane = new THREE.Group()
        pane.add(
          new THREE.Mesh(hexagonGeometry(0.16), flat('#1d4ed8', 0.4)),
          new THREE.Mesh(hexagonGeometry(0.16, 0.12), glow('#93c5fd', 0.8)),
        )
        return pane
      },
      delay: impact - 120 + index * 30,
      duration: 160,
      arc: 0.05,
    })
    flare(ctx, at(victim), {
      color: '#ef4444',
      core: '#fecaca',
      size: 0.35 * power,
      rays: 6,
      delay: impact + index * 30,
    })
  })
  shockwave(ctx, ground(source), {
    color: '#3b82f6',
    delay: impact - 120,
    radius: 1.9 * power,
    duration: 420,
  })
  burst(ctx, at(source), {
    color: '#93c5fd',
    count: 16,
    delay: impact - 120,
    speed: 2,
    spread: 'ring',
  })
  flinch(ctx, victims, impact, 30)
  shake(ctx, strength * 0.6 * power, impact, 220)
  return impact
}

const miltankMilkDrink: Choreography = (ctx, { source, target }) => {
  const pour = 380
  const impact = 700
  const bottle = milkBottle(0.2)
  const holder = new THREE.Group()
  holder.add(bottle)
  const bottleAt = new THREE.Vector3()
  const bottlePoint = (): THREE.Vector3 => bottleAt.copy(holder.position)
  fx(ctx, 0, impact + 100, holder, (p) => {
    const elapsed = p * (impact + 100)
    bodyPoint(source, 0.8, holder.position)
    holder.position.y += 0.5 * easeOut(phase(elapsed, 0, 300))
    holder.rotation.z =
      -1.6 * easeInOut(phase(elapsed, 260, pour)) * (flatDirection(source, target).x >= 0 ? 1 : -1)
    setOpacity(holder, fadeInOut(p, 0.1, 0.2))
  })
  squash(ctx, source, { duration: 300, amount: 0.1 })
  stream(ctx, bottlePoint, at(target, 0.85), {
    color: '#fef9c3',
    count: 34,
    size: 0.11,
    spread: 0.12,
    rise: 0.3,
    delay: pour,
    duration: impact - pour + 60,
    travel: 0.4,
  })
  burst(ctx, at(target, 0.85), {
    color: '#fdf2f8',
    count: 10,
    delay: impact - 60,
    speed: 0.9,
    spread: 'up',
  })
  bloomRing(ctx, target, { color: '#86efac', radius: 0.6, delay: impact - 60, duration: 700 })
  aura(ctx, target, { color: '#f9a8d4', delay: impact, duration: 600, count: 14, radius: 0.4 })
  orbit(ctx, target, {
    color: '#f472b6',
    count: 3,
    radius: 0.42,
    heightFactor: 0.9,
    turns: 0.8,
    collapse: 1.3,
    billboard: true,
    build: () => new THREE.Mesh(heartGeometry(0.07), flat('#f472b6', 0.9)),
    delay: impact,
    duration: 650,
  })
  return impact
}

const absolRazorWind: Choreography = (ctx, { source, target, shake: strength }) => {
  const release = 460
  const flight = 160
  const impact = release + flight
  crouch(ctx, source, { duration: 300 })
  vortex(ctx, ground(source), {
    color: DARK_SHADE,
    secondary: DARK_RIM,
    height: 1.3,
    radius: 0.55,
    rings: 4,
    duration: release + 80,
  })
  cloud(ctx, ground(source), {
    color: DARK_SMOKE,
    count: 5,
    radius: 0.45,
    opacity: 0.4,
    duration: release + 200,
  })
  chargeOrb(ctx, bodyAt(source, 0.95), {
    color: DARK_RIM,
    core: '#c4b5fd',
    size: 0.14,
    count: 12,
    delay: 80,
    duration: release - 80,
  })
  crescentSlash(ctx, bodyAt(source, 0.8), {
    size: 0.5,
    angle: 0.4,
    sweep: 2.2,
    delay: release - 120,
    duration: 260,
  })
  const end = beyond(source, target, 1.5)
  ;[0, 70, 140].forEach((offset, index) => {
    prop(ctx, source, target, {
      build: () => {
        const blade = darkCrescent(0.34 - index * 0.04)
        blade.rotation.z = Math.PI / 2
        return blade
      },
      to: index === 0 ? at(target) : end,
      delay: release + offset,
      duration: index === 0 ? flight : flight * 1.7,
      arc: 0.05 + index * 0.06,
      spin: 0.3,
      fadeOut: 0.25,
    })
  })
  speedStreaks(ctx, bodyAt(source, 0.6), end, {
    color: '#6d28d9',
    count: 8,
    spread: 0.5,
    delay: release,
    duration: 280,
  })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.5 }).slice(0, 3)
  crescentSlash(ctx, at(target), { size: 0.55, angle: 0.8, delay: impact, duration: 300 })
  crescentSlash(ctx, at(target), { size: 0.55, angle: -2.3, delay: impact + 60, duration: 300 })
  cloud(ctx, ground(target), {
    color: DARK_SMOKE,
    count: 4,
    radius: 0.4,
    opacity: 0.45,
    delay: impact,
    duration: 600,
  })
  victims.forEach((victim, index) =>
    crescentSlash(ctx, at(victim), { size: 0.4, angle: 0.6, delay: impact + 70 * (index + 1) }),
  )
  flinch(ctx, [target], impact)
  flinchAlong(ctx, source, victims, impact, 40)
  shake(ctx, strength * 0.5, impact, 220)
  return impact
}

const sableyeConfuseRay: Choreography = (ctx, { source, shake: strength }) => {
  const release = 420
  const impact = 640
  crouch(ctx, source, { duration: 260 })
  shiver(ctx, source, { duration: 400, amount: 0.04 })
  ;[-0.12, 0.12].forEach((side) => {
    const eye = new THREE.Group()
    eye.add(gemMesh('#22d3ee', 0.06))
    fx(ctx, 0, release + 120, eye, (p) => {
      bodyPoint(source, 0.78, eye.position)
      eye.quaternion.copy(ctx.camera.quaternion)
      eye.translateX(side)
      eye.translateZ(0.12)
      eye.scale.setScalar(0.6 + 0.6 * pulse(phase(p, 0.2, 0.9)))
      eye.rotateY(p * 6)
      setOpacity(eye, fadeInOut(p, 0.1, 0.2))
    })
  })
  cloud(ctx, ground(source), {
    color: DARK_SMOKE,
    count: 6,
    radius: 0.5,
    opacity: 0.45,
    duration: impact,
  })
  // The confusing light: a wobbling violet wisp orb with a dark heart.
  const orbHolder = new THREE.Group()
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), flat(DARK_BODY, 0.95))
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), glow('#a855f7', 0.45))
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 32), glow('#22d3ee', 0.5))
  orbHolder.add(core, halo, ring)
  fx(ctx, 120, release, orbHolder, (p, now) => {
    bodyPoint(source, 1.1, orbHolder.position)
    orbHolder.position.x += Math.sin(now * 0.02) * 0.06
    orbHolder.scale.setScalar(0.4 + 0.8 * easeOut(p))
    ring.rotation.set(now * 0.01, now * 0.013, 0)
    halo.scale.setScalar(1 + 0.25 * Math.sin(now * 0.03))
    setOpacity(orbHolder, 1 - phase(p, 0.85, 1))
  })
  const victims = enemiesAround(ctx, source, source, 2).slice(0, 4)
  victims.forEach((victim, index) => {
    prop(ctx, source, victim, {
      build: () => {
        const wisp = new THREE.Group()
        wisp.add(
          new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), flat(DARK_BODY, 0.9)),
          new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow('#a855f7', 0.5)),
        )
        return wisp
      },
      from: bodyAt(source, 1.1),
      to: at(victim, 0.85),
      delay: release + index * 40,
      duration: impact - release,
      arc: 0.5,
    })
    orbit(ctx, victim, {
      color: '#a855f7',
      count: 3,
      radius: 0.32,
      heightFactor: 1.05,
      turns: 2.5,
      billboard: true,
      build: () => {
        const glyph = new THREE.Group()
        glyph.add(
          new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), flat(DARK_SHADE, 0.9)),
          new THREE.Mesh(new THREE.RingGeometry(0.05, 0.07, 12), glow('#22d3ee', 0.6)),
        )
        return glyph
      },
      delay: impact,
      duration: 900,
    })
    shiver(ctx, victim, { delay: impact, duration: 600, amount: 0.05 })
  })
  shockwave(ctx, ground(source), {
    color: '#7e22ce',
    delay: impact - 60,
    radius: 2,
    duration: 450,
    thickness: 0.15,
  })
  flinch(ctx, victims, impact, 40)
  shake(ctx, strength * 0.3, impact, 180)
  return impact
}

const mawileFakeTears: Choreography = (ctx, { source, shake: strength }) => {
  const bite = 520
  const impact = 600
  const m = motionScale(ctx)
  fx(ctx, 0, 520, undefined, (p, now) => {
    source.pose.tilt += Math.sin(now * 0.012) * 0.12 * pulse(p) * m
  })
  ;[-0.1, 0.1].forEach((side, index) => {
    prop(ctx, source, source, {
      build: () => tearMesh(0.07),
      from: offsetPoint(bodyAt(source, 0.78), new THREE.Vector3(side, 0, 0.08)),
      to: offsetPoint(ground(source), new THREE.Vector3(side * 2.4, 0.05, 0.1)),
      delay: 80 + index * 120,
      duration: 360,
      arc: 0.05,
      fadeOut: 0.3,
    })
  })
  const { group, bite: chomp } = mawileJaw(0.4)
  const holder = new THREE.Group()
  holder.add(group)
  fx(ctx, 260, 560, holder, (p) => {
    const elapsed = 260 + p * 560
    bodyPoint(source, 1, holder.position)
    holder.position.y += 0.25
    holder.quaternion.copy(ctx.camera.quaternion)
    holder.rotateY(Math.PI / 2)
    chomp(
      elapsed < bite
        ? easeOut(phase(elapsed, 260, bite - 40))
        : 1 - easeOut(phase(elapsed, bite, bite + 70)),
    )
    holder.scale.setScalar(0.5 + 0.5 * easeOut(phase(p, 0, 0.3)))
    setOpacity(holder, 1 - phase(p, 0.8, 1))
  })
  const victims = enemiesAround(ctx, source, source, 1.9).slice(0, 4)
  victims.forEach((victim) => {
    statArrows(ctx, victim, {
      color: '#60a5fa',
      direction: 'fall',
      count: 3,
      delay: impact,
      duration: 700,
    })
    burst(ctx, at(victim), { color: '#cbd5e1', count: 8, delay: impact, speed: 1.2 })
  })
  shockwave(ctx, ground(source), {
    color: '#f9a8d4',
    delay: impact - 40,
    radius: 1.8,
    duration: 420,
    thickness: 0.12,
  })
  flinch(ctx, victims, impact, 30)
  shake(ctx, strength * 0.3, bite + 40, 160)
  return impact
}

const torkoalHeatWave: Choreography = (ctx, { source, shake: strength }) => {
  const impact = 600
  squash(ctx, source, { duration: 360, amount: 0.12 })
  cloud(ctx, above(source, 1.1), {
    color: '#292524',
    count: 6,
    radius: 0.35,
    size: 0.3,
    rise: 0.9,
    opacity: 0.55,
    duration: 1000,
  })
  cloud(ctx, above(source, 1.3), {
    color: '#44403c',
    count: 5,
    radius: 0.3,
    size: 0.25,
    rise: 1.1,
    opacity: 0.45,
    delay: 200,
    duration: 900,
  })
  flames(ctx, ground(source), {
    color: '#f97316',
    core: '#fbbf24',
    count: 6,
    radius: 0.35,
    height: 0.5,
    duration: impact,
  })
  // A small local sun-disc over the shell evokes the harsh sunlight Torkoal brings.
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glow('#fb923c', 0.35))
  fx(ctx, 100, impact + 300, sun, (p) => {
    sun.position.copy(source.root.position).setY(source.height + 0.6)
    sun.quaternion.copy(ctx.camera.quaternion)
    sun.scale.setScalar(0.6 + 0.6 * easeOut(phase(p, 0, 0.4)))
    setOpacity(sun, fadeInOut(p, 0.2, 0.3))
  })
  waveWall(ctx, ground(source), {
    color: '#ea580c',
    crest: '#fbbf24',
    radius: 2,
    height: 0.45,
    delay: impact - 160,
    duration: 600,
  })
  const victims = enemiesAround(ctx, source, source, 2).slice(0, 4)
  victims.forEach((victim, index) => {
    heatShimmer(ctx, bodyAt(source, 0.5), at(victim, 0.5), {
      color: '#fdba74',
      delay: impact - 200,
      duration: 500,
    })
    flames(ctx, ground(victim), {
      color: '#ea580c',
      core: '#fbbf24',
      count: 4,
      radius: 0.22,
      height: 0.4,
      delay: impact + index * 40,
      duration: 900,
    })
  })
  embers(ctx, ground(source), above(source, 1.4), {
    count: 18,
    spread: 1.6,
    delay: impact - 120,
    duration: 700,
  })
  flinch(ctx, victims, impact, 40)
  shake(ctx, strength * 0.4, impact, 200)
  return impact
}

const castformWeatherBall: Choreography = (ctx, { source, target, shake: strength }) => {
  const release = 520
  const flight = 200
  const impact = release + flight
  spin(ctx, source, { duration: 400, turns: 1 })
  levitate(ctx, source, { height: 0.25, duration: 800 })
  cloud(ctx, above(source, 1.65), {
    color: '#64748b',
    count: 6,
    radius: 0.4,
    size: 0.26,
    rise: 0.05,
    opacity: 0.6,
    duration: 1000,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#7dd3fc', '#38bdf8'],
    count: 22,
    radius: 0.55,
    height: 1.4,
    base: 0.1,
    cycles: -2,
    sway: 0,
    size: 0.05,
    duration: 900,
  })
  chargeOrb(ctx, bodyAt(source, 1.05), {
    color: '#38bdf8',
    core: '#bae6fd',
    size: 0.2,
    count: 14,
    delay: 120,
    duration: release - 120,
  })
  prop(ctx, source, target, {
    build: () => {
      const ball = new THREE.Group()
      ball.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 12),
          standard('#0ea5e9', {
            opacity: 0.85,
            roughness: 0.05,
            emissive: '#0369a1',
            emissiveIntensity: 0.4,
          }),
        ),
        new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), glow('#e2e8f0', 0.4)),
        new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), glow('#38bdf8', 0.25)),
      )
      return ball
    },
    from: bodyAt(source, 1.05),
    to: at(target),
    delay: release,
    duration: flight,
    arc: 0.35,
    spin: 6,
  })
  const victims = enemiesInLine(ctx, source, target, { overshoot: 1.4 }).slice(0, 3)
  splashCrown(ctx, ground(target), { radius: 0.4, height: 0.55, delay: impact, duration: 750 })
  burst(ctx, at(target), { color: '#7dd3fc', count: 14, delay: impact, speed: 1.8 })
  stream(ctx, at(target), beyond(source, target, 1.4), {
    color: '#38bdf8',
    count: 20,
    size: 0.1,
    spread: 0.3,
    delay: impact,
    duration: 320,
    travel: 0.5,
  })
  victims.forEach((victim) =>
    splashCrown(ctx, ground(victim), {
      radius: 0.3,
      height: 0.35,
      delay: impact + 90,
      duration: 600,
    }),
  )
  flinch(ctx, [target], impact)
  flinchAlong(ctx, source, victims, impact, 35)
  shake(ctx, strength * 0.4, impact, 200)
  return impact
}

const zangooseCrushClaw: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  crouch(ctx, source, { duration: 240 })
  clawMarks(ctx, bodyAt(source, 0.6), {
    color: '#dc2626',
    edge: '#f87171',
    count: 3,
    length: 0.35,
    angle: 1.4,
    delay: 60,
    duration: 260,
  })
  rush(ctx, source, target, { delay: 220, duration: 520, reach: 0.75, outEnd: 0.22, hold: 0.45 })
  clawMarks(ctx, at(target), {
    color: '#b91c1c',
    edge: '#fca5a5',
    count: 3,
    length: 0.75,
    angle: -0.6,
    delay: 320,
  })
  clawMarks(ctx, at(target), {
    color: '#b91c1c',
    edge: '#fca5a5',
    count: 3,
    length: 0.75,
    angle: 0.7,
    delay: 410,
  })
  clawMarks(ctx, at(target, 0.5), {
    color: '#7f1d1d',
    edge: '#ef4444',
    count: 3,
    length: 1.1,
    angle: -1.3,
    delay: impact,
    duration: 420,
  })
  flare(ctx, at(target), { color: '#ef4444', core: '#fecaca', size: 0.5, rays: 6, delay: impact })
  burst(ctx, at(target), { color: '#fca5a5', count: 12, delay: impact, speed: 2 })
  shockwave(ctx, ground(target), { color: '#dc2626', delay: impact, radius: 1, duration: 360 })
  flinch(ctx, [target], 320)
  flinch(ctx, [target], 410)
  pushBack(ctx, target, source.root.position, {
    delay: impact,
    duration: 420,
    distance: 0.6,
    lift: 0.2,
  })
  shake(ctx, strength * 0.6, impact, 220)
  return impact
}

const seviperPoisonTail: Choreography = (ctx, { source, shake: strength }) => {
  const impact = 520
  crouch(ctx, source, { duration: 200 })
  spin(ctx, source, { delay: 220, duration: 420, turns: 1 })
  // The tail whips a full circle around Seviper; its crimson blade leads a venom-violet arc.
  const sweep = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 1.05, 48, 1, 0, Math.PI * 1.2),
    glow('#7e22ce', 0.45),
  )
  ring.rotation.x = -Math.PI / 2
  const bands = new THREE.Mesh(
    new THREE.RingGeometry(0.86, 0.94, 48, 1, 0, Math.PI * 1.2),
    flat('#facc15', 0.6),
  )
  bands.rotation.x = -Math.PI / 2
  bands.position.y = 0.005
  const blade = sickleBlade(0.22)
  sweep.add(ring, bands, blade)
  fx(ctx, 220, 460, sweep, (p) => {
    sweep.position.copy(source.root.position).setY(0.35)
    const turn = easeInOut(p) * Math.PI * 2
    sweep.rotation.y = -turn
    blade.position.set(Math.cos(Math.PI * 1.2) * 0.95, 0, -Math.sin(Math.PI * 1.2) * 0.95)
    blade.rotation.set(0, Math.PI * 1.2, 0)
    setOpacity(sweep, fadeInOut(p, 0.1, 0.3))
  })
  const victims = enemiesAround(ctx, source, source, 1.9).slice(0, 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 40
    puddle(ctx, ground(victim), {
      color: '#7e22ce',
      radius: 0.45,
      bubbles: '#c084fc',
      delay,
      duration: 1000,
    })
    burst(ctx, at(victim), { color: '#a855f7', count: 10, delay, speed: 1.5 })
    clawMarks(ctx, at(victim), {
      color: '#581c87',
      edge: '#a855f7',
      count: 1,
      length: 0.8,
      angle: -0.3,
      delay: delay - 30,
    })
  })
  daze(ctx, victims, impact + 100, '#c084fc')
  flinch(ctx, victims, impact, 40)
  shake(ctx, strength * 0.4, impact, 200)
  return impact
}

const lugiaAeroblast: Choreography = (ctx, { source, target, shake: strength }) => {
  const release = 820
  const impact = release + 120
  const total = 1600
  const mouth = (): (() => THREE.Vector3) => {
    const out = new THREE.Vector3()
    const direction = flatDirection(source, target)
    return () => bodyPoint(source, 0.82, out).addScaledVector(direction, 0.32)
  }
  const muzzle = mouth()
  const end = beyond(source, target, 1.8)
  hover(ctx, source, total, 0.55)
  fx(ctx, 0, total, undefined, (p) => {
    const elapsed = p * total
    source.pose.tilt +=
      (-0.08 * pulse(phase(elapsed, 200, release)) +
        0.14 * pulse(phase(elapsed, release - 40, release + 300))) *
      motionScale(ctx)
  })
  legendaryWings(ctx, source, {
    style: 'crystal',
    color: '#cbd5e1',
    core: '#e0f2fe',
    accent: '#1e3a8a',
    span: 1.35,
    feathers: 8,
    flapRate: 1.1,
    flapAmount: 0.12,
    thrust: [0.48, 0.6],
    duration: total,
  })
  // Air is drawn in from all sides into a tight vortex at Lugia's mouth.
  vortex(ctx, muzzle, {
    color: '#93c5fd',
    secondary: '#c4b5fd',
    height: 0.7,
    radius: 0.5,
    rings: 4,
    delay: 120,
    duration: release - 80,
  })
  stream(ctx, offsetPoint(muzzle, new THREE.Vector3(0, 1.1, 0)), muzzle, {
    color: '#bfdbfe',
    count: 26,
    size: 0.07,
    spread: 0.9,
    delay: 150,
    duration: release - 200,
    travel: 0.4,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#bfdbfe', '#c7d2fe'],
    count: 26,
    radius: 1.3,
    height: 1.6,
    swirl: 3,
    size: 0.06,
    delay: 100,
    duration: release,
  })
  chargeOrb(ctx, muzzle, {
    color: '#818cf8',
    core: '#dbeafe',
    size: 0.24,
    count: 18,
    delay: 300,
    duration: release - 300,
  })
  // Aeroblast: a pale core shaft wrapped by three spiralling air currents and travelling pressure rings.
  rayBeam(ctx, muzzle, end, {
    colors: ['#93c5fd', '#a5b4fc'],
    core: '#dbeafe',
    width: 0.18,
    twist: 1.5,
    rings: '#c7d2fe',
    delay: release,
    duration: 620,
    grow: 0.22,
  })
  helixStrands(ctx, muzzle, end, {
    colors: ['#e0e7ff', '#93c5fd', '#a78bfa'],
    radius: 0.32,
    turns: 3.5,
    thickness: 0.028,
    opacity: 0.55,
    spin: 14,
    delay: release,
    duration: 620,
    grow: 0.22,
  })
  shockwave(ctx, muzzle, {
    color: '#a5b4fc',
    delay: release,
    radius: 0.7,
    duration: 300,
    thickness: 0.1,
    height: 0.9,
  })
  const victims = [target, ...enemiesInLine(ctx, source, target, { overshoot: 1.8 })].slice(0, 4)
  vortex(ctx, ground(target), {
    color: '#bfdbfe',
    secondary: '#818cf8',
    height: 1.5,
    radius: 0.6,
    rings: 4,
    delay: impact,
    duration: 620,
  })
  flare(ctx, at(target), { color: '#818cf8', core: '#dbeafe', size: 0.6, rays: 8, delay: impact })
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    burst(ctx, at(victim), { color: '#c7d2fe', count: 12, delay, speed: 2.2 })
    pushBack(ctx, victim, source.root.position, { delay, duration: 520, distance: 0.75, lift: 0.3 })
  })
  flinch(ctx, victims, impact, 60)
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength, impact, 360)
  return impact
}

const RAINBOW = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#6366f1', '#a855f7']

const hoOhSacredFire: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 940
  const total = 1700
  hover(ctx, source, total, 0.6)
  legendaryWings(ctx, source, {
    style: 'flame',
    color: '#ea580c',
    core: '#fbbf24',
    accent: '#16a34a',
    span: 1.4,
    feathers: 9,
    flapRate: 1.3,
    flapAmount: 0.14,
    thrust: [0.5, 0.62],
    duration: total,
  })
  tailRibbons(ctx, source, {
    from: '#facc15',
    to: '#16a34a',
    count: 3,
    length: 1.3,
    width: 0.12,
    spread: 0.3,
    duration: total,
  })
  // A rainbow halo unfurls behind Ho-Oh and spins up while the sacred flame gathers.
  const rainbow = spectrumRing(0.7, 0.86, RAINBOW, 0.45)
  fx(ctx, 80, impact + 300, rainbow, (p, now) => {
    bodyPoint(source, 0.7, rainbow.position)
    rainbow.quaternion.copy(ctx.camera.quaternion)
    rainbow.translateZ(-0.15)
    rainbow.rotateZ(now * 0.004)
    rainbow.scale.setScalar(0.4 + 0.8 * easeOut(phase(p, 0, 0.45)))
    setOpacity(rainbow, fadeInOut(p, 0.15, 0.25))
  })
  const ground3 = spectrumRing(0.2, 1, RAINBOW, 0.3)
  ground3.rotation.x = -Math.PI / 2
  fx(ctx, 400, 900, ground3, (p, now) => {
    ground3.position.copy(source.root.position).setY(0.04)
    ground3.rotation.z = now * 0.003
    ground3.scale.setScalar(0.6 + 1.6 * easeOut(p))
    setOpacity(ground3, fadeInOut(p, 0.15, 0.4))
  })
  chargeOrb(ctx, bodyAt(source, 0.95), {
    color: '#f97316',
    core: '#fde68a',
    size: 0.26,
    count: 18,
    delay: 260,
    duration: impact - 360,
  })
  embers(ctx, ground(source), bodyAt(source, 0.95), {
    count: 24,
    spread: 1.4,
    delay: 200,
    duration: impact - 200,
  })
  // Sacred fire: a golden column over Ho-Oh, then a flame pillar under every nearby foe with rainbow sparks.
  pillar(ctx, ground(source), {
    color: '#f59e0b',
    radius: 0.45,
    height: 2.6,
    delay: impact - 120,
    duration: 600,
  })
  shockwave(ctx, ground(source), {
    color: '#f97316',
    delay: impact - 60,
    radius: 2.3,
    duration: 520,
  })
  shockwave(ctx, ground(source), {
    color: '#facc15',
    delay: impact,
    radius: 1.6,
    duration: 420,
    thickness: 0.2,
  })
  const victims = [
    target,
    ...enemiesAround(ctx, source, source, 2.3).filter((enemy) => enemy !== target),
  ].slice(0, 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 70
    flameTorrent(ctx, ground(victim), above(victim, 1.7), {
      radius: 0.35,
      puffs: 4,
      delay: delay - 40,
      duration: 620,
    })
    flames(ctx, ground(victim), {
      color: '#dc2626',
      core: '#fbbf24',
      count: 5,
      radius: 0.28,
      height: 0.5,
      delay: delay + 200,
      duration: 900,
    })
    burst(ctx, at(victim), {
      color: RAINBOW[(index * 2) % RAINBOW.length],
      count: 10,
      delay,
      speed: 1.8,
      spread: 'up',
    })
  })
  flinch(ctx, victims, impact, 70)
  cameraPunch(ctx, at(source), 0.3, impact - 60)
  shake(ctx, strength, impact, 380)
  return impact
}

const raikouThunder: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 860
  const cloudHeight = 3
  const m = motionScale(ctx)
  fx(ctx, 0, 1300, undefined, (p) => {
    source.pose.tilt += -0.12 * pulse(phase(p, 0.05, 0.45)) * m
    source.pose.scale *= 1 + 0.08 * pulse(phase(p, 0.05, 0.45))
  })
  crouch(ctx, source, { delay: 560, duration: 260 })
  // Raikou's storm cloud mane boils up into a thundercloud over the battlefield.
  cloud(ctx, above(source, 1.25), {
    color: '#4c1d95',
    count: 6,
    radius: 0.35,
    size: 0.22,
    rise: 0.2,
    opacity: 0.6,
    duration: 900,
  })
  cloud(ctx, above(target, cloudHeight), {
    color: '#3f3a52',
    count: 10,
    radius: 1.3,
    size: 0.45,
    rise: 0.05,
    opacity: 0.6,
    delay: 200,
    duration: 1300,
  })
  cloud(ctx, above(target, cloudHeight + 0.2), {
    color: '#5b21b6',
    count: 6,
    radius: 0.9,
    size: 0.35,
    rise: 0.05,
    opacity: 0.4,
    delay: 260,
    duration: 1200,
  })
  zap(
    ctx,
    offsetPoint(bodyAt(source, 0.8), new THREE.Vector3(-0.45, 0.1, 0)),
    offsetPoint(bodyAt(source, 0.4), new THREE.Vector3(0.45, 0, 0)),
    { color: '#facc15', core: '#fef9c3', delay: 120, duration: 420, jitter: 0.2 },
  )
  zap(
    ctx,
    offsetPoint(bodyAt(source, 0.9), new THREE.Vector3(0.4, 0.1, 0)),
    offsetPoint(bodyAt(source, 0.35), new THREE.Vector3(-0.4, 0, 0)),
    { color: '#fde047', core: '#fef9c3', delay: 260, duration: 380, jitter: 0.2 },
  )
  groundArcs(ctx, ground(source), {
    color: '#facc15',
    radius: 0.7,
    arcs: 5,
    delay: 200,
    duration: 700,
  })
  // The roar answers: a bolt rises from Raikou into the cloud, then thunder crashes down on every foe around it.
  forkedBolt(ctx, bodyAt(source, 0.9), above(target, cloudHeight - 0.3), {
    color: '#facc15',
    width: 0.1,
    branches: 2,
    segments: 12,
    reveal: 0.2,
    delay: 600,
    duration: 240,
  })
  const victims = [
    target,
    ...enemiesAround(ctx, source, source, 2.2).filter((enemy) => enemy !== target),
  ].slice(0, 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 90
    const main = index === 0
    forkedBolt(
      ctx,
      offsetPoint(above(target, cloudHeight - 0.35), new THREE.Vector3((index - 1.5) * 0.35, 0, 0)),
      at(victim, 0.45),
      {
        color: '#facc15',
        width: main ? 0.2 : 0.14,
        branches: main ? 4 : 2,
        segments: 12,
        jitter: 0.42,
        delay,
        duration: 320,
      },
    )
    groundArcs(ctx, ground(victim), {
      color: '#fde047',
      radius: main ? 0.8 : 0.5,
      arcs: main ? 5 : 3,
      delay,
      duration: 700,
    })
    burst(ctx, at(victim), { color: '#fde047', count: 10, delay, speed: 1.9 })
  })
  shockwave(ctx, ground(target), { color: '#facc15', delay: impact, radius: 2, duration: 480 })
  daze(ctx, victims, impact + 150)
  flinch(ctx, victims, impact, 90)
  cameraPunch(ctx, at(target), 0.4, impact - 40)
  shake(ctx, strength, impact, 420)
  return impact
}

const enteiEruption: Choreography = (ctx, { source, shake: strength }) => {
  const blast = 640
  const impact = 980
  squash(ctx, source, { duration: 420, amount: 0.14 })
  shiver(ctx, source, { delay: 200, duration: 440, amount: 0.05 })
  groundCracks(ctx, ground(source), {
    color: '#f97316',
    count: 8,
    length: 1.8,
    width: 0.06,
    delay: 120,
    duration: 1300,
  })
  puddle(ctx, ground(source), {
    color: '#c2410c',
    radius: 0.8,
    bubbles: '#fbbf24',
    delay: 160,
    duration: 1200,
  })
  heatShimmer(ctx, ground(source), above(source, 2), {
    color: '#fdba74',
    delay: 120,
    duration: blast,
  })
  aura(ctx, source, { color: '#f97316', duration: blast, count: 20, radius: 0.5 })
  // Entei's volcanic back erupts: a fire column, black smoke, then molten rocks rain down on each foe.
  pillar(ctx, ground(source), {
    color: '#ea580c',
    radius: 0.4,
    height: 3,
    delay: blast,
    duration: 560,
  })
  flames(ctx, ground(source), {
    color: '#dc2626',
    core: '#fbbf24',
    count: 7,
    radius: 0.5,
    height: 0.9,
    delay: blast,
    duration: 800,
  })
  cloud(ctx, above(source, 2.4), {
    color: '#1c1917',
    count: 7,
    radius: 0.6,
    size: 0.4,
    rise: 0.6,
    opacity: 0.5,
    delay: blast + 60,
    duration: 1100,
  })
  burst(ctx, above(source, 1.6), {
    color: '#fb923c',
    count: 22,
    delay: blast,
    speed: 2.4,
    spread: 'up',
    gravity: 3,
  })
  shockwave(ctx, ground(source), { color: '#f97316', delay: blast, radius: 2.4, duration: 560 })
  const victims = enemiesAround(ctx, source, source, 2.4).slice(0, 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    meteor(ctx, ground(victim), {
      color: '#9a3412',
      trail: '#f97316',
      size: 0.18,
      height: 3.2,
      delay: delay - 300,
      duration: 300,
    })
    flames(ctx, ground(victim), {
      color: '#ea580c',
      core: '#fbbf24',
      count: 5,
      radius: 0.3,
      height: 0.55,
      delay,
      duration: 1000,
    })
    debris(ctx, ground(victim), { color: '#57534e', count: 6, delay, speed: 1.6 })
    pushBack(ctx, victim, source.root.position, { delay, duration: 460, distance: 0.6, lift: 0.35 })
  })
  if (victims.length === 0)
    meteor(ctx, offsetPoint(ground(source), new THREE.Vector3(0.9, 0, 0.4)), {
      color: '#9a3412',
      trail: '#f97316',
      size: 0.18,
      height: 3.2,
      delay: impact - 300,
      duration: 300,
    })
  flinch(ctx, victims, impact, 60)
  cameraPunch(ctx, at(source), 0.35, blast - 40)
  shake(ctx, strength * 0.7, blast, 300)
  shake(ctx, strength, impact, 360)
  return impact
}

const suicuneMist: Choreography = (ctx, { source }) => {
  const impact = 820
  const total = 1500
  leapAndGlide(ctx, source, total)
  tailRibbons(ctx, source, {
    from: '#e0f2fe',
    to: '#a78bfa',
    count: 2,
    length: 1.4,
    width: 0.14,
    spread: 0.35,
    droop: 0.2,
    duration: total,
  })
  const crest = new THREE.Group()
  crest.add(crystalShard(0.4, '#c4b5fd', '#67e8f9'))
  crest.rotation.x = -Math.PI / 2
  const crestHolder = new THREE.Group()
  crestHolder.add(crest)
  fx(ctx, 60, impact, crestHolder, (p, now) => {
    bodyPoint(source, 1.15, crestHolder.position)
    crestHolder.rotation.y = now * 0.004
    crestHolder.scale.setScalar(0.5 + 0.5 * easeOut(phase(p, 0, 0.3)))
    setOpacity(crestHolder, fadeInOut(p, 0.15, 0.2))
  })
  // Purifying water ring under Suicune, then a cool aurora mist rolls out to every nearby ally.
  splashCrown(ctx, ground(source), {
    color: '#22d3ee',
    foam: '#cffafe',
    radius: 0.35,
    height: 0.4,
    delay: 300,
    duration: 700,
  })
  const veil = spectrumRing(0.3, 1.4, ['#67e8f9', '#a5b4fc', '#5eead4', '#c4b5fd'], 0.22)
  veil.rotation.x = -Math.PI / 2
  fx(ctx, 360, 1100, veil, (p, now) => {
    veil.position.copy(source.root.position).setY(0.05)
    veil.rotation.z = now * 0.002
    veil.scale.setScalar(0.3 + 1.3 * easeOut(phase(p, 0, 0.55)))
    setOpacity(veil, fadeInOut(p, 0.15, 0.4))
  })
  cloud(ctx, ground(source), {
    color: '#cffafe',
    count: 8,
    radius: 1.3,
    size: 0.38,
    rise: 0.25,
    opacity: 0.22,
    delay: 400,
    duration: 1100,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#a5f3fc', '#c4b5fd', '#99f6e4'],
    count: 24,
    radius: 1.4,
    height: 1.3,
    swirl: 1.5,
    size: 0.06,
    twinkle: true,
    delay: 300,
    duration: 1100,
  })
  const allies = alliesAround(ctx, source, 2.4, 4)
  allies.forEach((ally, index) => {
    const delay = impact + index * 60
    shell(ctx, ally, {
      color: '#67e8f9',
      edge: '#c4b5fd',
      radius: 0.6,
      material: 'crystal',
      delay,
      duration: 800,
    })
    bloomRing(ctx, ally, { color: '#5eead4', radius: 0.55, delay: delay - 60, duration: 700 })
  })
  return impact
}

// Suicune bounds up and glides back down on the north wind.
function leapAndGlide(ctx: FxContext, source: UnitView, total: number): void {
  const m = motionScale(ctx)
  fx(ctx, 0, total, undefined, (p, now) => {
    const rise = easeOut(phase(p, 0.05, 0.3)) * (1 - easeInOut(phase(p, 0.75, 1)))
    source.pose.lift += (0.45 + 0.04 * Math.sin(now * 0.005)) * rise * m
    source.pose.tilt += 0.1 * Math.sin(p * Math.PI * 2) * rise * m
  })
}

const kyogreOriginPulse: Choreography = (ctx, { source, target, shake: strength }) => {
  const release = 720
  const impact = 940
  const total = 1500
  const direction = flatDirection(source, target)
  const side = new THREE.Vector3().crossVectors(direction, UP).normalize()
  levitate(ctx, source, { height: 0.35, duration: total, wobble: 0.03 })
  // Localised downpour and a churning whirl of seawater around Kyogre.
  driftMotes(ctx, ground(source), {
    colors: ['#38bdf8', '#7dd3fc'],
    count: 30,
    radius: 1.1,
    height: 2.2,
    base: 0.1,
    cycles: -3,
    sway: 0,
    size: 0.05,
    duration: total,
  })
  vortex(ctx, ground(source), {
    color: '#0284c7',
    secondary: '#22d3ee',
    height: 1.1,
    radius: 0.75,
    rings: 4,
    delay: 100,
    duration: release,
  })
  aura(ctx, source, { color: '#22d3ee', duration: release, count: 18, radius: 0.55 })
  // Primal energy lines: cyan arcs flicker along the body as the water lances form in a fan above.
  const lances = 5
  const lancePoints = Array.from({ length: lances }, (_, index) => {
    const spread = (index - (lances - 1) / 2) * 0.42
    return offsetPoint(
      bodyAt(source, 0.95),
      side
        .clone()
        .multiplyScalar(spread)
        .add(new THREE.Vector3(0, 0.45 - Math.abs(spread) * 0.4, 0)),
    )
  })
  const formed = new THREE.Group()
  const lanceMeshes = lancePoints.map(() => {
    const lance = new THREE.Group()
    lance.add(
      new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.6, 8).rotateX(Math.PI / 2),
        standard('#0ea5e9', {
          opacity: 0.85,
          roughness: 0.05,
          emissive: '#0369a1',
          emissiveIntensity: 0.5,
        }),
      ),
      new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.7, 8).rotateX(Math.PI / 2),
        glow('#22d3ee', 0.3),
      ),
    )
    formed.add(lance)
    return lance
  })
  const aim = new THREE.Vector3()
  fx(ctx, 200, release - 200, formed, (p) => {
    target.focusPoint(aim, 0.5)
    lanceMeshes.forEach((lance, index) => {
      lance.position.copy(lancePoints[index]())
      lance.lookAt(aim)
      lance.scale.setScalar(Math.max(0.01, easeOut(phase(p, index * 0.1, 0.5 + index * 0.1))))
    })
  })
  const end = beyond(source, target, 1.6)
  lancePoints.forEach((from, index) => {
    const delay = release + index * 40
    prop(ctx, source, target, {
      build: () => {
        const lance = new THREE.Group()
        lance.add(
          new THREE.Mesh(
            new THREE.ConeGeometry(0.06, 0.6, 8).rotateX(Math.PI / 2),
            standard('#0ea5e9', {
              opacity: 0.85,
              roughness: 0.05,
              emissive: '#0369a1',
              emissiveIntensity: 0.5,
            }),
          ),
          new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.8, 8).rotateX(Math.PI / 2).translate(0, 0, -0.12),
            glow('#22d3ee', 0.3),
          ),
        )
        return lance
      },
      from,
      to: index === 2 ? at(target) : end,
      delay,
      duration: index === 2 ? impact - delay : 300,
      arc: 0.2,
      fadeOut: 0.15,
    })
  })
  waterJet(ctx, bodyAt(source, 0.6), end, {
    color: '#0284c7',
    core: '#7dd3fc',
    foam: '#bae6fd',
    radius: 0.12,
    rings: 3,
    delay: release + 60,
    duration: 560,
  })
  const victims = [target, ...enemiesInLine(ctx, source, target, { overshoot: 1.6 })].slice(0, 4)
  splashCrown(ctx, ground(target), {
    color: '#0284c7',
    foam: '#bae6fd',
    radius: 0.55,
    height: 0.8,
    delay: impact,
    duration: 850,
  })
  shockwave(ctx, ground(target), { color: '#22d3ee', delay: impact, radius: 1.6, duration: 480 })
  victims.forEach((victim, index) =>
    burst(ctx, at(victim), { color: '#7dd3fc', count: 12, delay: impact + index * 50, speed: 2 }),
  )
  flinch(ctx, victims, impact, 50)
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength, impact, 380)
  return impact
}

const groudonPrecipiceBlades: Choreography = (ctx, { source, shake: strength }) => {
  const stomp = 520
  const impact = 860
  const m = motionScale(ctx)
  fx(ctx, 0, 900, undefined, (p) => {
    const elapsed = p * 900
    source.pose.lift += 0.35 * pulse(phase(elapsed, 180, stomp)) * m
    source.pose.scale *=
      1 + 0.08 * pulse(phase(elapsed, 0, 400)) - 0.1 * pulse(phase(elapsed, stomp, stomp + 200))
  })
  // Drought heat over Groudon while it rears up.
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), glow('#f97316', 0.3))
  fx(ctx, 60, impact + 300, sun, (p) => {
    sun.position.copy(source.root.position).setY(source.height + 0.9)
    sun.quaternion.copy(ctx.camera.quaternion)
    sun.scale.setScalar(0.6 + 0.6 * easeOut(phase(p, 0, 0.4)))
    setOpacity(sun, fadeInOut(p, 0.2, 0.3))
  })
  heatShimmer(ctx, ground(source), above(source, 2), {
    color: '#fdba74',
    delay: 0,
    duration: stomp,
  })
  groundCracks(ctx, ground(source), {
    color: '#f97316',
    count: 9,
    length: 2.2,
    width: 0.07,
    delay: stomp,
    duration: 1200,
  })
  debris(ctx, ground(source), { color: '#78716c', count: 10, delay: stomp, speed: 1.6 })
  cloud(ctx, ground(source), {
    color: '#a8a29e',
    count: 6,
    radius: 0.8,
    opacity: 0.35,
    delay: stomp,
    duration: 800,
  })
  // Blades of stone ripple outward from the stomp in two rings, then a towering cluster spears each foe.
  const ring = new THREE.Group()
  const blades = Array.from({ length: 12 }, (_, index) => {
    const outer = index >= 6
    const angle = (index / 6) * Math.PI * 2 + (outer ? Math.PI / 6 : 0)
    const distance = outer ? 1.5 : 0.85
    const blade = stoneBlade(outer ? 0.8 : 0.6, outer ? 0.2 : 0.16)
    blade.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
    blade.rotation.set(0, -angle + Math.PI / 2, 0)
    blade.rotateX(-0.3)
    blade.userData.reveal = outer ? 0.18 : 0
    ring.add(blade)
    return blade
  })
  fx(ctx, stomp, 900, ring, (p) => {
    ring.position.copy(source.root.position).setY(0)
    blades.forEach((blade) => {
      const start = blade.userData.reveal as number
      const rise = easeOut(phase(p, start, start + 0.2)) * (1 - easeInOut(phase(p, 0.7, 1)))
      blade.scale.set(1, Math.max(0.001, rise), 1)
    })
  })
  const victims = enemiesAround(ctx, source, source, 2.4).slice(0, 4)
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    const cluster = new THREE.Group()
    const pieces = [0, 1, 2].map((piece) => {
      const blade = stoneBlade(piece === 0 ? 1.2 : 0.75, piece === 0 ? 0.24 : 0.17)
      const angle = (piece / 3) * Math.PI * 2
      blade.position.set(
        piece === 0 ? 0 : Math.cos(angle) * 0.25,
        0,
        piece === 0 ? 0 : Math.sin(angle) * 0.25,
      )
      blade.rotation.set(piece === 0 ? 0 : 0.3, angle, 0)
      cluster.add(blade)
      return blade
    })
    fx(ctx, delay - 60, 820, cluster, (p) => {
      cluster.position.copy(victim.root.position).setY(0)
      const rise = easeOut(phase(p, 0, 0.18)) * (1 - easeInOut(phase(p, 0.7, 1)))
      pieces.forEach((piece) => piece.scale.set(1, Math.max(0.001, rise), 1))
    })
    debris(ctx, ground(victim), { color: '#7c2d12', count: 6, delay, speed: 1.8, pointed: true })
    pushBack(ctx, victim, source.root.position, { delay, duration: 480, distance: 0.55, lift: 0.5 })
  })
  shockwave(ctx, ground(source), { color: '#ea580c', delay: stomp, radius: 2.4, duration: 520 })
  flinch(ctx, victims, impact, 60)
  cameraPunch(ctx, at(source), 0.35, stomp - 40)
  shake(ctx, strength * 0.8, stomp, 300)
  shake(ctx, strength, impact, 340)
  return impact
}

const rayquazaDragonAscent: Choreography = (ctx, { source, target, shake: strength }) => {
  const ascend = 520
  const dive = 820
  const impact = 1020
  const m = motionScale(ctx)
  const skyHeight = 3.6
  const direction = flatDirection(source, target)
  fx(ctx, 0, impact + 500, undefined, (p) => {
    const elapsed = p * (impact + 500)
    const up = easeIn(phase(elapsed, 120, ascend)) * (1 - phase(elapsed, dive - 60, dive))
    source.pose.lift += 2.2 * up * m
    source.pose.scale *=
      1 -
      0.85 * phase(elapsed, ascend - 120, ascend) * (1 - phase(elapsed, impact + 120, impact + 400))
  })
  aura(ctx, source, { color: '#22c55e', duration: ascend, count: 22, radius: 0.5 })
  flames(ctx, ground(source), {
    color: '#16a34a',
    core: '#86efac',
    count: 6,
    radius: 0.35,
    height: 0.8,
    duration: ascend,
  })
  speedStreaks(ctx, bodyAt(source, 0.4), above(source, skyHeight), {
    color: '#4ade80',
    count: 8,
    spread: 0.4,
    delay: 160,
    duration: ascend - 120,
  })
  // Air Lock: the clouds overhead are pushed back as Rayquaza climbs, clearing the sky locally.
  const parting = new THREE.Group()
  const puffs = Array.from({ length: 8 }, (_, index) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), flat('#94a3b8', 0.45))
    puff.userData.angle = (index / 8) * Math.PI * 2
    parting.add(puff)
    return puff
  })
  const sky = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), glow('#bef264', 0.35))
  sky.rotation.x = -Math.PI / 2
  parting.add(sky)
  fx(ctx, 280, 800, parting, (p) => {
    parting.position.copy(source.root.position).setY(skyHeight - 0.4)
    const open = easeOut(phase(p, 0.1, 0.8))
    puffs.forEach((puff) => {
      const angle = puff.userData.angle as number
      puff.position.set(
        Math.cos(angle) * (0.4 + 1.3 * open),
        0,
        Math.sin(angle) * (0.4 + 1.3 * open),
      )
    })
    sky.scale.setScalar(1 + 4 * open)
    setOpacity(parting, fadeInOut(p, 0.1, 0.35))
  })
  // The dive: a serpentine green dragon streak with gold ring markings plunging from the sky through the line.
  const start = new THREE.Vector3()
  const end = beyond(source, target, 1.6)
  const head = new THREE.Vector3()
  const hit = new THREE.Vector3()
  const past = new THREE.Vector3()
  // Head position along sky -> target (first 70%) -> past the target.
  const pathAt = (s: number, out: THREE.Vector3): THREE.Vector3 =>
    s < 0.7 ? out.lerpVectors(start, hit, s / 0.7) : out.lerpVectors(hit, past, (s - 0.7) / 0.3)
  const fromSky = (): THREE.Vector3 =>
    start.copy(source.root.position).addScaledVector(direction, -0.6).setY(skyHeight)
  const dragon = new THREE.Group()
  const segments = Array.from({ length: 9 }, (_, index) => {
    const segment = new THREE.Group()
    segment.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.14 - index * 0.008, 10, 8).scale(1, 1, 1.6),
        standard('#15803d', { roughness: 0.4, emissive: '#14532d', emissiveIntensity: 0.4 }),
      ),
    )
    if (index % 2 === 1)
      segment.add(
        new THREE.Mesh(
          new THREE.TorusGeometry(0.13 - index * 0.006, 0.018, 6, 18),
          standard('#facc15', { emissive: '#ca8a04', emissiveIntensity: 0.4 }),
        ),
      )
    dragon.add(segment)
    return segment
  })
  const aura3 = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 10).scale(1, 1, 2),
    glow('#22c55e', 0.3),
  )
  dragon.add(aura3)
  const diveMs = impact + 260 - dive
  const hitAt = (impact - dive) / diveMs
  fx(ctx, dive, diveMs, dragon, (p) => {
    const travel =
      p < hitAt ? 0.7 * easeIn(p / hitAt) ** 0.6 : 0.7 + 0.3 * easeOut((p - hitAt) / (1 - hitAt))
    fromSky()
    target.focusPoint(hit, 0.5)
    past.copy(end())
    segments.forEach((segment, index) => {
      const t = Math.max(0, travel - index * 0.045)
      pathAt(t, segment.position)
      pathAt(Math.min(1, t + 0.02), head)
      if (head.distanceToSquared(segment.position) > 1e-8) segment.lookAt(head)
    })
    aura3.position.copy(segments[0].position)
    aura3.quaternion.copy(segments[0].quaternion)
    setOpacity(dragon, 1 - phase(p, 0.82, 1))
  })
  speedStreaks(ctx, fromSky, at(target), {
    color: '#86efac',
    count: 10,
    spread: 0.5,
    delay: dive,
    duration: impact - dive + 60,
  })
  const victims = [target, ...enemiesInLine(ctx, source, target, { overshoot: 1.6 })].slice(0, 4)
  flare(ctx, at(target), { color: '#22c55e', core: '#d9f99d', size: 0.6, rays: 8, delay: impact })
  shockwave(ctx, ground(target), { color: '#22c55e', delay: impact, radius: 1.9, duration: 500 })
  shockwave(ctx, ground(target), {
    color: '#facc15',
    delay: impact + 60,
    radius: 1.1,
    duration: 380,
    thickness: 0.2,
  })
  groundCracks(ctx, ground(target), {
    color: '#365314',
    count: 7,
    length: 1.5,
    delay: impact,
    duration: 900,
  })
  debris(ctx, ground(target), { color: '#78716c', count: 10, delay: impact, speed: 2.2 })
  victims.forEach((victim, index) =>
    burst(ctx, at(victim), { color: '#4ade80', count: 12, delay: impact + index * 50, speed: 2 }),
  )
  flinch(ctx, victims, impact, 50)
  cameraPunch(ctx, at(target), 0.5, impact - 40)
  shake(ctx, strength * 1.1, impact, 420)
  return impact
}

const latiosLusterPurge: Choreography = (ctx, { source, target, shake: strength }) => {
  const release = 700
  const flight = 160
  const impact = release + flight
  const total = 1400
  const direction = flatDirection(source, target)
  hover(ctx, source, total, 0.45)
  fx(ctx, 0, total, undefined, (p) => {
    source.pose.tilt +=
      (0.1 * pulse(phase(p, 0.05, 0.5)) - 0.12 * pulse(phase(p, 0.48, 0.7))) * motionScale(ctx)
  })
  const orbPoint = new THREE.Vector3()
  const orbAt = (): THREE.Vector3 =>
    bodyPoint(source, 0.7, orbPoint).addScaledVector(direction, 0.45)
  // A luminous mist-blue orb gathers between Latios' arms, ringed by red and blue triangular glyphs.
  const orb = new THREE.Group()
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 14),
    standard('#3b82f6', {
      roughness: 0.15,
      emissive: '#2563eb',
      emissiveIntensity: 0.6,
      opacity: 0.92,
    }),
  )
  const sheath = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), glow('#93c5fd', 0.3))
  const glyphs = new THREE.Group()
  ;[0, 1, 2, 3, 4, 5].forEach((index) => {
    const tri = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 3),
      flat(index % 2 ? '#dc2626' : '#1d4ed8', 0.85),
    )
    const angle = (index / 6) * Math.PI * 2
    tri.position.set(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0)
    tri.rotation.z = angle
    glyphs.add(tri)
  })
  orb.add(sphere, sheath, glyphs)
  fx(ctx, 120, release - 100, orb, (p, now) => {
    orb.position.copy(orbAt())
    glyphs.quaternion.copy(ctx.camera.quaternion)
    glyphs.rotateZ(now * 0.006)
    glyphs.scale.setScalar(1.3 - 0.5 * easeOut(p))
    orb.scale.setScalar(0.3 + 0.9 * easeOut(p))
    sheath.scale.setScalar(1 + 0.12 * Math.sin(now * 0.03))
    setOpacity(orb, fadeInOut(p, 0.12, 0.08))
  })
  stream(ctx, offsetPoint(orbAt, new THREE.Vector3(0, 0.9, 0)), orbAt, {
    color: '#bfdbfe',
    count: 20,
    size: 0.06,
    spread: 0.8,
    delay: 150,
    duration: release - 220,
    travel: 0.4,
  })
  driftMotes(ctx, ground(source), {
    colors: ['#93c5fd', '#c7d2fe', '#fca5a5'],
    count: 20,
    radius: 1,
    height: 1.6,
    swirl: 2,
    size: 0.05,
    delay: 100,
    duration: release,
  })
  const end = beyond(source, target, 1.6)
  prop(ctx, source, target, {
    build: () => {
      const ball = new THREE.Group()
      ball.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 16, 12),
          standard('#3b82f6', { roughness: 0.15, emissive: '#2563eb', emissiveIntensity: 0.6 }),
        ),
        new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), glow('#93c5fd', 0.3)),
      )
      return ball
    },
    from: orbAt,
    delay: release,
    duration: flight,
    arc: 0,
  })
  rayBeam(ctx, orbAt, end, {
    colors: ['#60a5fa', '#a5b4fc'],
    core: '#dbeafe',
    width: 0.15,
    twist: 1,
    rings: '#93c5fd',
    delay: release + 40,
    duration: 560,
    grow: 0.25,
  })
  const victims = [target, ...enemiesInLine(ctx, source, target, { overshoot: 1.6 })].slice(0, 4)
  flare(ctx, at(target), { color: '#3b82f6', core: '#dbeafe', size: 0.55, rays: 6, delay: impact })
  shockwave(ctx, ground(target), { color: '#60a5fa', delay: impact, radius: 1.4, duration: 460 })
  victims.forEach((victim, index) => {
    const delay = impact + index * 60
    statArrows(ctx, victim, { color: '#60a5fa', direction: 'fall', count: 3, delay, duration: 750 })
    burst(ctx, at(victim), { color: '#bfdbfe', count: 10, delay, speed: 1.6 })
  })
  flinch(ctx, victims, impact, 60)
  cameraPunch(ctx, at(target), 0.3, impact - 40)
  shake(ctx, strength * 0.8, impact, 320)
  return impact
}

export const GEN23_TIER45_ULTIMATES: UltimateSet = {
  'scizor:Bullet Punch': scizorBulletPunch,
  'heracross:Megahorn': heracrossMegahorn,
  'skarmory:Spikes': skarmorySpikes,
  'steelix:Iron Tail': steelixIronTail,
  'blissey:Soft-Boiled': blisseySoftBoiled,
  'wobbuffet:Counter': wobbuffetCounter,
  'miltank:Milk Drink': miltankMilkDrink,
  'absol:Razor Wind': absolRazorWind,
  'sableye:Confuse Ray': sableyeConfuseRay,
  'mawile:Fake Tears': mawileFakeTears,
  'torkoal:Heat Wave': torkoalHeatWave,
  'castform:Weather Ball': castformWeatherBall,
  'zangoose:Crush Claw': zangooseCrushClaw,
  'seviper:Poison Tail': seviperPoisonTail,
  'lugia:Aeroblast': lugiaAeroblast,
  'ho_oh:Sacred Fire': hoOhSacredFire,
  'raikou:Thunder': raikouThunder,
  'entei:Eruption': enteiEruption,
  'suicune:Mist': suicuneMist,
  'kyogre:Origin Pulse': kyogreOriginPulse,
  'groudon:Precipice Blades': groudonPrecipiceBlades,
  'rayquaza:Dragon Ascent': rayquazaDragonAscent,
  'latios:Luster Purge': latiosLusterPurge,
}
