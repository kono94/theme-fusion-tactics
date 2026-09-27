import * as THREE from 'three'
import { easeInOut, type UnitView } from '../../unitView'
import {
  at,
  aura,
  beam,
  burst,
  cameraPunch,
  cloud,
  crouch,
  flare,
  glow,
  ground,
  halo,
  leap,
  levitate,
  orbit,
  orbMesh,
  pillar,
  projectile,
  prop,
  pushBack,
  ringMesh,
  rockMesh,
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
import {
  alliesAround,
  beyond,
  billboard,
  bodyAt,
  bodyPoint,
  clamp01,
  debris,
  easeIn,
  easeOut,
  enemiesAround,
  enemiesInLine,
  fadeInOut,
  fangs,
  fistMesh,
  flat,
  flatDirection,
  flames,
  flinch,
  flinchAlong,
  fx,
  groundCracks,
  heartGeometry,
  hexagonGeometry,
  motionScale,
  noteGeometry,
  phase,
  pulse,
  setOpacity,
  shell,
  standard,
  starPower,
  statArrows,
  stream,
  zap,
  zzz,
  above,
} from '../kit/shared'
import {
  batWings,
  flameMesh,
  jaggedStone,
  kitsuneTails,
  rush,
  sheath,
  speedStreaks,
  thickBolt,
  waveWall,
  type PositionAt,
} from '../kit/pokemonTier2'
import type { Choreography, UltimateSet } from '../types'

const YELLOW = '#facc15'
const PALE_YELLOW = '#fef08a'
const UP = new THREE.Vector3(0, 1, 0)

const living = (views: UnitView[]): UnitView[] => views.filter((view) => !view.isDying)

const around = (ctx: FxContext, source: UnitView, center: UnitView, radius: number, limit = 3) =>
  living(enemiesAround(ctx, source, center, radius)).slice(0, limit)

const inLine = (ctx: FxContext, source: UnitView, target: UnitView, limit = 3) =>
  living(enemiesInLine(ctx, source, target, { limit: 6 })).slice(0, limit)

const teamOf = (ctx: FxContext, source: UnitView, target: UnitView, radius: number) => {
  const allies = alliesAround(ctx, source, radius, 4).filter((ally) => !ally.isDying)
  return target !== source && !allies.includes(target) ? [...allies.slice(0, 3), target] : allies
}

const lineTravel = (source: UnitView, target: UnitView, extra: number) => {
  const distance = Math.max(0.5, source.root.position.distanceTo(target.root.position))
  return {
    distance,
    reach: (distance + extra) / distance,
    hitFraction: distance / (distance + extra),
  }
}

const cameraRight = (ctx: FxContext, out: THREE.Vector3) =>
  out.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)

// Short electric forks crackling from a point to the floor around it.
function groundForks(
  ctx: FxContext,
  view: UnitView,
  color: string,
  delay: number,
  count = 3,
): void {
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2 + Math.random()
    const offset = new THREE.Vector3(Math.cos(angle) * 0.8, 0.05, Math.sin(angle) * 0.8)
    const end = new THREE.Vector3()
    zap(ctx, at(view, 0.5), () => end.copy(view.root.position).add(offset), {
      color,
      delay: delay + index * 30,
      duration: 200,
      segments: 5,
      jitter: 0.25,
    })
  }
}

// Sleepy sway used by Sing and Yawn victims.
function drowse(ctx: FxContext, view: UnitView, delay: number, duration: number): void {
  const m = motionScale(ctx)
  fx(ctx, delay, duration, undefined, (p) => {
    const sleepy = easeOut(phase(p, 0, 0.3)) * (1 - phase(p, 0.85, 1))
    view.pose.tilt += (Math.sin(p * Math.PI * 3) * 0.3 * m + 0.22) * sleepy
    view.pose.lift -= 0.06 * sleepy
    view.pose.scale *= 1 - 0.05 * sleepy
  })
}

// ---------- Pikachu / Raichu ----------

function electroBallMesh(size: number): THREE.Group {
  const group = new THREE.Group()
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 1.35, 1), glow(YELLOW, 0.7))
  ;(cage.material as THREE.MeshBasicMaterial).wireframe = true
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(size * 1.15, size * 0.07, 6, 28),
    glow('#f59e0b', 0.75),
  )
  band.rotation.x = 1.1
  group.add(
    new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 14, 10), glow('#fde047', 0.9)),
    new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), glow('#eab308', 0.45)),
    cage,
    band,
  )
  return group
}

const pikachuElectroBall: Choreography = (ctx, { source, target, shake: strength }) => {
  const dir = flatDirection(source, target)
  const tail = new THREE.Vector3()
  const tailPoint = () => source.focusPoint(tail, 1.05).addScaledVector(dir, -0.3)
  crouch(ctx, source, { duration: 380 })
  aura(ctx, source, { color: YELLOW, duration: 460, count: 14 })
  const charge = electroBallMesh(0.16)
  fx(ctx, 0, 400, charge, (p, now) => {
    charge.position.copy(tailPoint())
    charge.scale.setScalar(0.25 + easeOut(p) * 0.85)
    charge.children[2].rotation.set(now * 0.02, now * 0.03, 0)
    charge.children[3].rotation.z = now * 0.03
  })
  zap(ctx, at(source, 0.6), tailPoint, {
    color: PALE_YELLOW,
    delay: 60,
    duration: 160,
    segments: 5,
    jitter: 0.18,
  })
  zap(ctx, at(source, 0.5), tailPoint, {
    color: YELLOW,
    delay: 220,
    duration: 160,
    segments: 5,
    jitter: 0.18,
  })
  prop(ctx, source, target, {
    build: () => electroBallMesh(0.18),
    from: tailPoint,
    delay: 400,
    duration: 300,
    arc: 0.7,
    spin: 18,
    tumble: 10,
  })
  stream(ctx, tailPoint, at(target), {
    color: '#facc15',
    count: 18,
    size: 0.07,
    spread: 0.18,
    wobble: 0.1,
    travel: 0.55,
    rise: 0.35,
    delay: 400,
    duration: 320,
  })
  const impact = 700
  burst(ctx, at(target), { color: YELLOW, count: 22, delay: impact, speed: 2.2 })
  burst(ctx, at(target), {
    color: '#f59e0b',
    count: 14,
    delay: impact + 30,
    spread: 'ring',
    speed: 1.6,
    gravity: 0.4,
  })
  burst(ctx, at(target, 0.4), {
    color: '#fde047',
    count: 10,
    size: 0.08,
    delay: impact + 120,
    duration: 900,
    spread: 'up',
    speed: 0.7,
    gravity: -0.4,
  })
  shockwave(ctx, ground(target), { color: YELLOW, delay: impact, radius: 1.3, duration: 450 })
  groundForks(ctx, target, YELLOW, impact)
  cameraPunch(ctx, at(target), 0.3, impact - 60)
  shake(ctx, strength, impact)
  return impact
}

const raichuThunder: Choreography = (ctx, { source, target, shake: strength }) => {
  const power = starPower(source)
  const skyPoint = above(target, 4.2)
  leap(ctx, source, { duration: 440, height: 0.35 * motionScale(ctx) })
  aura(ctx, source, { color: YELLOW, duration: 520, count: 20 })
  zap(ctx, at(source, 0.9), above(source, 5), {
    color: PALE_YELLOW,
    delay: 120,
    duration: 240,
    segments: 8,
    jitter: 0.4,
  })
  cloud(ctx, skyPoint, {
    color: '#1f2937',
    count: 9,
    radius: 1.1,
    size: 0.6,
    rise: 0,
    opacity: 0.9,
    duration: 1400,
  })
  flare(ctx, skyPoint, { color: '#fde047', size: 1.4, delay: 380, duration: 180 })
  const strike = 540
  thickBolt(ctx, skyPoint, ground(target), {
    color: YELLOW,
    core: '#fffbe6',
    width: 0.09 * power,
    segments: 8,
    jitter: 0.55,
    delay: strike,
    duration: 380,
  })
  pillar(ctx, ground(target), {
    color: '#fde047',
    delay: strike,
    duration: 320,
    height: 4.2,
    radius: 0.28,
  })
  cameraPunch(ctx, at(target), 0.7, strike - 60)
  shake(ctx, strength + 2, strike, 420)
  shockwave(ctx, ground(target), { color: YELLOW, delay: strike, radius: 2.3, duration: 520 })
  shockwave(ctx, ground(target), {
    color: '#fffbe6',
    delay: strike + 90,
    radius: 1.4,
    duration: 420,
  })
  burst(ctx, at(target, 0.3), {
    color: PALE_YELLOW,
    count: 30,
    delay: strike,
    speed: 2.6,
    spread: 'up',
  })
  const victims = around(ctx, source, target, 1.9, 3)
  victims.forEach((victim, index) => {
    const delay = strike + 70 + index * 60
    zap(ctx, skyPoint, at(victim), {
      color: PALE_YELLOW,
      delay,
      duration: 240,
      segments: 9,
      jitter: 0.5,
    })
    burst(ctx, at(victim), { color: YELLOW, count: 12, delay })
  })
  flinch(ctx, victims, strike + 70, 60)
  return strike
}

// ---------- Sandshrew / Sandslash ----------

const sandshrewDig: Choreography = (ctx, { source, target, shake: strength }) => {
  const travel = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  const roam = ctx.reducedMotion ? 0 : 0.85
  fx(ctx, 0, 1150, undefined, (p, now) => {
    const sink = easeInOut(phase(p, 0.05, 0.22))
    const rise = easeOut(phase(p, 0.58, 0.68))
    const underground = sink * (1 - rise)
    const pose = source.pose
    pose.lift += -0.85 * underground + 0.6 * pulse(phase(p, 0.58, 0.82))
    pose.scale *= 1 - 0.9 * underground
    pose.spin += Math.sin(now * 0.05) * 0.25 * sink * (1 - rise)
    pose.offset.addScaledVector(
      travel,
      roam * easeInOut(phase(p, 0.22, 0.56)) * (1 - easeInOut(phase(p, 0.8, 1))),
    )
  })
  burst(ctx, ground(source), { color: '#a16207', count: 20, delay: 80, spread: 'up', speed: 1.6 })
  cloud(ctx, ground(source), {
    color: '#d6b98c',
    delay: 100,
    duration: 700,
    radius: 0.4,
    opacity: 0.5,
  })
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    standard('#8b5a2b', { flatShading: true, roughness: 1 }),
  )
  const start = source.root.position.clone()
  const end = target.root.position.clone()
  fx(ctx, 250, 420, mound, (p, now) => {
    mound.position.lerpVectors(start, end, easeInOut(p)).setY(0)
    mound.scale.set(1, 0.6 + 0.25 * Math.sin(now * 0.04), 1)
    mound.rotation.y = p * 6
  })
  burst(ctx, () => start.clone().lerp(end, 0.5).setY(0.1), {
    color: '#b45309',
    count: 10,
    delay: 460,
    spread: 'up',
    speed: 1,
  })
  const impact = 700
  burst(ctx, ground(target), {
    color: '#a16207',
    count: 26,
    delay: impact,
    spread: 'up',
    speed: 2.2,
  })
  debris(ctx, ground(target), { color: '#8b5a2b', count: 7, size: 0.1, delay: impact, speed: 1.8 })
  spikes(ctx, ground(target), {
    color: '#92400e',
    solid: true,
    count: 5,
    height: 0.6,
    delay: impact - 10,
    duration: 520,
  })
  shockwave(ctx, ground(target), { color: '#a16207', delay: impact, radius: 1.2, duration: 420 })
  levitate(ctx, target, { delay: impact, duration: 420, height: 0.4 })
  cameraPunch(ctx, at(target), 0.45, impact - 40)
  shake(ctx, strength, impact)
  return impact
}

const sandslashEarthquake: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  leap(ctx, source, { duration: 560, height: 1.1 * m, slam: true })
  aura(ctx, source, { color: '#d97706', duration: 420 })
  const slam = 500
  groundCracks(ctx, ground(target), {
    color: '#f59e0b',
    count: 8,
    length: 2.2,
    width: 0.07,
    delay: slam,
    duration: 1000,
  })
  ;[
    ['#a16207', 2.8, 0],
    ['#fbbf24', 2.2, 110],
    ['#78350f', 3.2, 220],
  ].forEach(([color, radius, offset]) =>
    shockwave(ctx, ground(target), {
      color: color as string,
      radius: radius as number,
      delay: slam + (offset as number),
      duration: 620,
      thickness: 0.24,
    }),
  )
  burst(ctx, ground(target), { color: '#d6b98c', count: 30, delay: slam, spread: 'up', speed: 2 })
  debris(ctx, ground(target), {
    color: '#92400e',
    count: 9,
    size: 0.13,
    speed: 2.2,
    delay: slam,
    duration: 800,
  })
  cloud(ctx, ground(target), {
    color: '#c8a878',
    radius: 1.4,
    size: 0.5,
    delay: slam + 60,
    duration: 1000,
    opacity: 0.45,
  })
  shake(ctx, strength + 3, slam, 800)
  cameraPunch(ctx, ground(target), 0.5, slam - 40)
  const victims = [target, ...around(ctx, source, target, 2.6, 4)]
  victims.forEach((victim) =>
    fx(ctx, slam, 700, undefined, (p, now) => {
      const decay = 1 - p
      victim.pose.lift += Math.abs(Math.sin(p * Math.PI * 5)) * 0.18 * decay * m
      victim.pose.offset.x += Math.sin(now * 0.09) * 0.06 * decay * m
    }),
  )
  flinch(ctx, victims.slice(1), slam + 60)
  return slam
}

// ---------- Vulpix / Ninetales ----------

const vulpixWillOWisp: Choreography = (ctx, { source, target, shake: strength }) => {
  const victims = [target, ...around(ctx, source, target, 1.8, 2)]
  aura(ctx, source, { color: '#818cf8', duration: 600, count: 16 })
  const count = 5
  for (let index = 0; index < count; index++) {
    const victim = victims[index % victims.length]
    const wisp = flameMesh(index % 2 ? '#6366f1' : '#8b5cf6', '#e0e7ff', 0.16)
    const home = new THREE.Vector3()
    const dest = new THREE.Vector3()
    const ringStart = new THREE.Vector3()
    const ringEnd = new THREE.Vector3()
    const angle0 = (index / count) * Math.PI * 2
    fx(ctx, index * 40, 1000, wisp, (p, now) => {
      const angle = angle0 + p * 9
      source.focusPoint(home, 0.6)
      victim.focusPoint(dest, 0.55)
      const plunge = easeIn(phase(p, 0.76, 0.86))
      ringStart.set(
        home.x + Math.cos(angle) * 0.5,
        home.y + 0.25 + Math.sin(p * 12 + index) * 0.08,
        home.z + Math.sin(angle) * 0.5,
      )
      ringEnd.set(
        dest.x + Math.cos(angle) * 0.45 * (1 - plunge),
        dest.y + 0.2 * (1 - plunge),
        dest.z + Math.sin(angle) * 0.45 * (1 - plunge),
      )
      const travel = easeInOut(phase(p, 0.35, 0.72))
      wisp.position.lerpVectors(ringStart, ringEnd, travel)
      wisp.position.y += Math.sin(Math.PI * travel) * 0.6
      const flicker = 1 + 0.25 * Math.sin(now * 0.03 + index)
      wisp.scale.set(0.16, 0.16 * flicker, 0.16)
      wisp.visible = p < 0.88
      setOpacity(wisp, fadeInOut(p, 0.1, 0.15))
    })
  }
  const impact = 880
  victims.forEach((victim, index) => {
    burst(ctx, at(victim, 0.4), {
      color: '#8b5cf6',
      count: 16,
      delay: impact + index * 40,
      spread: 'up',
      speed: 1.4,
    })
  })
  aura(ctx, target, { color: '#6366f1', delay: impact, duration: 700, count: 16 })
  flare(ctx, at(target), { color: '#a78bfa', delay: impact, size: 0.6 })
  flinch(ctx, victims.slice(1), impact, 40)
  shake(ctx, strength, impact)
  return impact
}

interface FoxfireTiming {
  delay: number
  launch: number
  arrive: number
}

// Kitsune-bi: flame wisps circle Ninetales, then corkscrew out to `dest` (the target or the casting seal).
function foxfire(
  ctx: FxContext,
  source: UnitView,
  dest: () => THREE.Vector3,
  colors: string[],
  core: string,
  timing: FoxfireTiming,
): void {
  const count = 6
  const group = new THREE.Group()
  const wisps = Array.from({ length: count }, (_, index) => {
    const wisp = flameMesh(colors[index % colors.length], core, 0.12)
    group.add(wisp)
    return wisp
  })
  const home = new THREE.Vector3()
  const ring = new THREE.Vector3()
  const end = new THREE.Vector3()
  const duration = timing.arrive - timing.delay
  const launch = (timing.launch - timing.delay) / duration
  fx(ctx, timing.delay, duration, group, (p, now) => {
    bodyPoint(source, 0.6, home)
    end.copy(dest())
    const travel = easeInOut(phase(p, launch, 1))
    const appear = easeOut(phase(p, 0, 0.18))
    wisps.forEach((wisp, index) => {
      const angle = (index / count) * Math.PI * 2 + now * 0.007
      ring.set(
        home.x + Math.cos(angle) * 0.55,
        home.y + 0.2 + Math.sin(now * 0.01 + index * 1.7) * 0.08,
        home.z + Math.sin(angle) * 0.55,
      )
      const spiral = 0.4 * (1 - travel)
      wisp.position.lerpVectors(ring, end, travel)
      wisp.position.x += Math.cos(angle * 1.5) * spiral * travel
      wisp.position.z += Math.sin(angle * 1.5) * spiral * travel
      wisp.position.y += Math.sin(Math.PI * travel) * 0.55
      const flicker = 1 + 0.25 * Math.sin(now * 0.03 + index)
      wisp.scale.set(0.12 * appear, 0.12 * appear * flicker, 0.12 * appear)
    })
    setOpacity(group, 1 - phase(p, 0.92, 1))
  })
}

interface HelixOptions {
  colors: string[]
  core: string
  delay: number
  duration: number
  radius: number
  height: number
  count?: number
}

// A corkscrew of flame tongues whirling around a unit: the swirling core of Fire Spin.
function fireHelix(ctx: FxContext, view: UnitView, options: HelixOptions): void {
  const count = Math.max(8, Math.round((options.count ?? 16) * Math.max(0.6, ctx.particleScale)))
  const group = new THREE.Group()
  const tongues = Array.from({ length: count }, (_, index) => {
    const tongue = flameMesh(options.colors[index % options.colors.length], options.core, 0.15)
    group.add(tongue)
    return tongue
  })
  const center = new THREE.Vector3()
  fx(ctx, options.delay, options.duration, group, (p, now) => {
    center.copy(view.root.position).add(view.pose.offset)
    const grow = easeOut(phase(p, 0, 0.25))
    const squeeze = 1 - 0.25 * phase(p, 0.4, 0.8)
    tongues.forEach((tongue, index) => {
      const t = index / count
      const angle = t * Math.PI * 4 + now * 0.011
      const radius = options.radius * (1 - 0.35 * t) * squeeze * (0.6 + 0.4 * grow)
      tongue.position.set(
        center.x + Math.cos(angle) * radius,
        0.08 + t * options.height * grow,
        center.z + Math.sin(angle) * radius,
      )
      tongue.rotation.set(0, -angle, 0.55)
      const flicker = 1 + 0.2 * Math.sin(now * 0.04 + index * 1.3)
      const size = 0.17 * (1 - 0.45 * t) * grow
      tongue.scale.set(size, size * 1.4 * flicker, size)
    })
    setOpacity(group, 0.65 * (1 - phase(p, 0.72, 1)))
  })
}

// Mystical Fire's casting seal: nine-rune circle with a counter-rotating hexagram, standing before Ninetales.
function mysticSeal(ctx: FxContext, anchor: () => THREE.Vector3, aim: () => THREE.Vector3): void {
  const seal = new THREE.Group()
  const outer = new THREE.Group()
  outer.add(new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 56), glow('#e879f9', 0.9)))
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * Math.PI * 2
    const rune = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), glow('#fdba74', 0.95))
    rune.position.set(Math.cos(angle) * 0.965, Math.sin(angle) * 0.965, 0.01)
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.12, 16), glow('#f0abfc', 0.7))
    halo.position.copy(rune.position)
    outer.add(rune, halo)
  }
  const hexagram = new THREE.Group()
  hexagram.add(
    new THREE.Mesh(new THREE.RingGeometry(0.7, 0.77, 3), glow('#fb923c', 0.9)),
    new THREE.Mesh(new THREE.RingGeometry(0.7, 0.77, 3, 1, Math.PI), glow('#fb923c', 0.9)),
    new THREE.Mesh(new THREE.RingGeometry(0.4, 0.44, 40), glow('#c084fc', 0.85)),
  )
  const heart = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), glow('#a21caf', 0.16))
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glow('#f472b6', 0.55))
  eye.position.z = 0.02
  seal.add(heart, outer, hexagram, eye)
  fx(ctx, 60, 1000, seal, (p, now) => {
    seal.position.copy(anchor())
    seal.lookAt(aim())
    outer.rotation.z = p * 2.2
    hexagram.rotation.z = -p * 3.4
    const charged = phase(p, 0.25, 0.4)
    eye.scale.setScalar(0.5 + 0.9 * charged + 0.08 * Math.sin(now * 0.03))
    seal.scale.setScalar(easeOut(phase(p, 0, 0.25)) * 0.6 * (1 + 0.12 * pulse(phase(p, 0.36, 0.5))))
    setOpacity(seal, fadeInOut(p, 0.1, 0.3))
  })
}

const FIRE_SPIN_COLORS = ['#f97316', '#ef4444', '#fb923c']

const ninetalesFireSpin: Choreography = (ctx, { source, target, shake: strength }) => {
  kitsuneTails(ctx, source, { base: '#c2410c', tip: '#fbbf24', core: '#fb923c', duration: 1400 })
  levitate(ctx, source, { duration: 1200, height: 0.18, wobble: 0.04 })
  sigil(ctx, ground(source), {
    color: '#f97316',
    secondary: '#fbbf24',
    radius: 0.85,
    points: 9,
    duration: 1300,
  })
  const impact = 640
  foxfire(ctx, source, at(target, 0.5), FIRE_SPIN_COLORS, '#fbbf24', {
    delay: 60,
    launch: 380,
    arrive: impact,
  })
  fireHelix(ctx, target, {
    colors: FIRE_SPIN_COLORS,
    core: '#fbbf24',
    delay: impact - 40,
    duration: 1100,
    radius: 0.62,
    height: 1.9,
  })
  vortex(ctx, ground(target), {
    color: '#f97316',
    secondary: '#dc2626',
    height: 1.7,
    radius: 0.75,
    rings: 6,
    delay: impact,
    duration: 1050,
  })
  shockwave(ctx, ground(target), { color: '#fb923c', delay: impact, radius: 1.6 })
  burst(ctx, at(target), { color: '#fbbf24', count: 20, delay: impact, spread: 'up', speed: 2 })
  burst(ctx, at(target, 0.6), {
    color: '#fb923c',
    count: 14,
    size: 0.08,
    delay: impact + 350,
    duration: 1100,
    spread: 'up',
    speed: 0.8,
    gravity: -0.5,
  })
  levitate(ctx, target, { delay: impact, duration: 950, height: 0.25, spins: 1 })
  const victims = around(ctx, source, target, 1.6, 2)
  victims.forEach((victim) =>
    flames(ctx, ground(victim), {
      color: '#f97316',
      core: '#fbbf24',
      radius: 0.3,
      height: 0.4,
      count: 5,
      delay: impact + 80,
      duration: 700,
    }),
  )
  flinch(ctx, victims, impact + 80)
  cameraPunch(ctx, at(target), 0.4, impact - 40)
  shake(ctx, strength, impact, 400)
  return impact
}

const MYSTIC_COLORS = ['#d946ef', '#a855f7', '#fb923c']

const ninetalesMysticalFire: Choreography = (ctx, { source, target, shake: strength }) => {
  kitsuneTails(ctx, source, { base: '#6b21a8', tip: '#f472b6', core: '#fb923c', duration: 1300 })
  levitate(ctx, source, { duration: 1100, height: 0.16, wobble: 0.04 })
  sigil(ctx, ground(source), {
    color: '#c026d3',
    secondary: '#fb923c',
    radius: 0.8,
    points: 9,
    duration: 1200,
  })
  const dir = flatDirection(source, target)
  const front = new THREE.Vector3()
  const frontPoint = () => bodyPoint(source, 0.6, front).addScaledVector(dir, 0.55)
  const aim = at(target)
  mysticSeal(ctx, frontPoint, aim)
  const fire = 440
  foxfire(ctx, source, frontPoint, MYSTIC_COLORS, '#f9a8d4', {
    delay: 40,
    launch: 240,
    arrive: fire,
  })
  beam(ctx, source, target, {
    color: '#e879f9',
    core: '#fdba74',
    delay: fire,
    duration: 440,
    width: 0.12,
    from: frontPoint,
  })
  const end = beyond(source, target, 1.2, 0.6)
  stream(ctx, frontPoint, end, {
    color: '#f0abfc',
    count: 30,
    size: 0.1,
    spread: 0.35,
    wobble: 0.12,
    travel: 0.4,
    delay: fire,
    duration: 460,
  })
  const side = new THREE.Vector3().crossVectors(dir, UP).normalize()
  for (let strand = 0; strand < 3; strand++) {
    const orb = flameMesh(MYSTIC_COLORS[strand], '#fed7aa', 0.11)
    const a = new THREE.Vector3()
    let resolved = false
    fx(ctx, fire + strand * 50, 400, orb, (p) => {
      if (!resolved) {
        a.copy(frontPoint())
        resolved = true
      }
      const angle = p * 14 + strand * 2.09
      orb.position.lerpVectors(a, end(), p).addScaledVector(side, Math.cos(angle) * 0.25)
      orb.position.y += Math.sin(angle) * 0.25
      orb.rotation.set(0, 0, -angle)
    })
  }
  const impact = fire + 120
  fireHelix(ctx, target, {
    colors: MYSTIC_COLORS,
    core: '#f9a8d4',
    delay: impact,
    duration: 700,
    radius: 0.5,
    height: 1.4,
    count: 10,
  })
  burst(ctx, at(target), { color: '#e879f9', count: 20, delay: impact, speed: 2.2 })
  burst(ctx, at(target, 0.6), {
    color: '#c084fc',
    count: 12,
    size: 0.08,
    delay: impact + 300,
    duration: 1000,
    spread: 'up',
    speed: 0.7,
    gravity: -0.5,
  })
  const victims = inLine(ctx, source, target)
  victims.forEach((victim) =>
    burst(ctx, at(victim), {
      color: '#fb923c',
      count: 12,
      delay: fire + victim.root.position.distanceTo(source.root.position) * 60,
    }),
  )
  flinchAlong(ctx, source, victims, fire, 60)
  cameraPunch(ctx, at(target), 0.35, impact - 40)
  shake(ctx, strength, impact)
  return impact
}

// ---------- Jigglypuff / Wigglytuff ----------

const NOTE_COLORS = ['#f472b6', '#c084fc', '#60a5fa', '#f9a8d4']

const jigglypuffSing: Choreography = (ctx, { source, target }) => {
  const victims = [target, ...around(ctx, source, target, 1.9, 2)]
  const m = motionScale(ctx)
  fx(ctx, 0, 1300, undefined, (p) => {
    source.pose.tilt += Math.sin(p * Math.PI * 5) * 0.28 * m * pulse(p * 1.05)
    source.pose.scale *= 1 + 0.06 * Math.sin(p * Math.PI * 10)
  })
  ;[0, 380, 760].forEach((delay) =>
    shockwave(ctx, ground(source), {
      color: '#f9a8d4',
      delay,
      radius: 1.8,
      duration: 700,
      thickness: 0.1,
    }),
  )
  for (let index = 0; index < 6; index++) {
    const victim = victims[index % victims.length]
    const note = new THREE.Mesh(noteGeometry(0.2), glow(NOTE_COLORS[index % NOTE_COLORS.length]))
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    fx(ctx, 120 + index * 90, 760, note, (p) => {
      source.focusPoint(from, 0.95)
      victim.focusPoint(to, 1)
      note.position.lerpVectors(from, to, easeInOut(p))
      note.position.y += Math.sin(p * Math.PI * 3 + index) * 0.18 + Math.sin(Math.PI * p) * 0.4
      billboard(ctx, note)
      note.rotateZ(Math.sin(p * 12 + index) * 0.35)
      setOpacity(note, fadeInOut(p, 0.1, 0.2))
    })
  }
  const sleep = 860
  victims.forEach((victim, index) => {
    drowse(ctx, victim, sleep + index * 40, 1000)
    zzz(ctx, victim, { color: '#fbcfe8', delay: sleep + 80 + index * 40, duration: 1000, count: 2 })
  })
  burst(ctx, at(target, 0.9), {
    color: '#fbcfe8',
    count: 14,
    delay: sleep,
    spread: 'ring',
    speed: 0.9,
  })
  flinch(ctx, victims.slice(1), sleep, 40)
  return sleep
}

const wigglytuffHelpingHand: Choreography = (ctx, { source, target }) => {
  const allies = teamOf(ctx, source, target, 2.6)
  fx(ctx, 0, 700, undefined, (p) => {
    source.pose.scale *= 1 + 0.35 * pulse(phase(p, 0, 0.6))
  })
  const clapPoint = above(source, 1.5)
  const fists = [0, 1].map(() => fistMesh(0.16, () => glow('#fda4af', 0.95)))
  const bump = new THREE.Group()
  bump.add(...fists)
  const right = new THREE.Vector3()
  const center = new THREE.Vector3()
  fx(ctx, 120, 520, bump, (p) => {
    center.copy(clapPoint())
    cameraRight(ctx, right)
    const meet = easeIn(phase(p, 0, 0.45))
    const gap = 0.6 * (1 - meet) + 0.1 + 0.12 * pulse(phase(p, 0.45, 0.75))
    fists.forEach((fist, index) => {
      fist.position.copy(center).addScaledVector(right, (index === 0 ? -1 : 1) * gap)
      fist.lookAt(center)
    })
    setOpacity(bump, fadeInOut(p, 0.1, 0.3))
  })
  const clap = 354
  flare(ctx, clapPoint, { color: '#fbbf24', size: 0.7, delay: clap, rays: 6 })
  burst(ctx, clapPoint, { color: '#fde68a', count: 16, delay: clap, speed: 1.6 })
  shockwave(ctx, ground(source), { color: '#fb7185', delay: clap, radius: 2.6, duration: 600 })
  allies.forEach((ally, index) => {
    const delay = clap + 60 + index * 70
    aura(ctx, ally, { color: '#f97316', delay, duration: 700, count: 14 })
    statArrows(ctx, ally, { color: '#ef4444', direction: 'rise', delay, duration: 750 })
  })
  return clap
}

const wigglytuffPlayRough: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 950, undefined, (p) => {
    const bounce = fadeInOut(p, 0.08, 0.2)
    source.pose.lift += Math.abs(Math.sin(p * Math.PI * 4)) * 0.16 * m * bounce
    source.pose.tilt += Math.sin(p * Math.PI * 8) * 0.12 * m * bounce
    source.pose.scale *= 1 + 0.05 * Math.sin(p * Math.PI * 8) * bounce
  })
  stream(ctx, at(source, 0.6), at(target, 0.5), {
    color: '#f9a8d4',
    count: 16,
    size: 0.1,
    spread: 0.2,
    wobble: 0.12,
    travel: 0.45,
    rise: 0.3,
    delay: 60,
    duration: 360,
  })
  const brawl = new THREE.Group()
  const seeds = Array.from({ length: 8 }, (_, index) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8),
      flat(index % 3 ? '#fdf2f8' : '#fbcfe8', 0.92),
    )
    brawl.add(puff)
    const angle = (index / 8) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle), Math.sin(angle * 2) * 0.5, Math.sin(angle))
  })
  const center = new THREE.Vector3()
  const toward = new THREE.Vector3()
  fx(ctx, 180, 760, brawl, (p, now) => {
    target.focusPoint(center, 0.5)
    source.focusPoint(toward, 0.5)
    center.lerp(toward, 0.2)
    const grow = easeOut(phase(p, 0, 0.15)) * (1 - phase(p, 0.85, 1))
    brawl.children.forEach((puff, index) => {
      const wobble = 0.35 + 0.12 * Math.sin(now * 0.03 + index * 1.7)
      puff.position.copy(center).addScaledVector(seeds[index], wobble)
      puff.scale.setScalar(Math.max(0.01, grow * (0.9 + 0.3 * Math.sin(now * 0.05 + index))))
    })
  })
  for (let index = 0; index < 6; index++) {
    const heart = index % 2 === 0
    const shape = new THREE.Mesh(
      heart ? heartGeometry(0.12) : starGeometry(5, 0.14, 0.06),
      glow(heart ? '#f472b6' : '#fde047'),
    )
    const angle = (index / 6) * Math.PI * 2 + 0.4
    const out = new THREE.Vector3(Math.cos(angle), 0.6, Math.sin(angle))
    const origin = new THREE.Vector3()
    fx(ctx, 260 + index * 80, 420, shape, (p) => {
      target.focusPoint(origin, 0.6)
      shape.position.copy(origin).addScaledVector(out, easeOut(p) * 0.9)
      shape.position.y += Math.sin(Math.PI * p) * 0.25
      billboard(ctx, shape)
      shape.rotateZ(p * 3)
      setOpacity(shape, fadeInOut(p, 0.1, 0.35))
    })
  }
  ;[300, 440, 580].forEach((delay) =>
    burst(ctx, at(target), { color: '#f9a8d4', count: 8, delay, speed: 1.4 }),
  )
  const finale = 760
  burst(ctx, at(target), { color: '#f9a8d4', count: 26, delay: finale, speed: 2.4 })
  flare(ctx, at(target), { color: '#f472b6', size: 0.8, delay: finale })
  shockwave(ctx, ground(target), { color: '#f472b6', delay: finale, radius: 1.4 })
  cameraPunch(ctx, at(target), 0.4, 300)
  shake(ctx, strength, finale)
  return 440
}

// ---------- Zubat / Golbat / Crobat ----------

const zubatLeechLife: Choreography = (ctx, { source, target }) => {
  batWings(ctx, source, {
    membrane: '#818cf8',
    edge: '#c4b5fd',
    span: 0.42,
    hover: 0.22,
    flapMs: 140,
    duration: 1150,
  })
  const bite = 360
  fangs(ctx, target, {
    glowColor: '#a855f7',
    size: 0.24,
    teeth: 3,
    delay: bite - 170,
    duration: 330,
  })
  burst(ctx, at(target), { color: '#dc2626', count: 10, delay: bite, speed: 1.3 })
  stream(ctx, bodyAt(target, 0.55), bodyAt(source, 0.55), {
    color: '#ef4444',
    count: 26,
    size: 0.09,
    spread: 0.12,
    wobble: 0.12,
    travel: 0.45,
    rise: 0.25,
    delay: bite + 60,
    duration: 640,
  })
  stream(ctx, bodyAt(target, 0.45), bodyAt(source, 0.6), {
    color: '#fb7185',
    count: 14,
    size: 0.06,
    spread: 0.08,
    wobble: 0.18,
    travel: 0.5,
    rise: 0.4,
    delay: bite + 140,
    duration: 580,
  })
  halo(ctx, target, { color: '#dc2626', direction: 'fall', delay: bite + 40, duration: 500 })
  aura(ctx, source, { color: '#86efac', delay: bite + 520, duration: 500, count: 12 })
  halo(ctx, source, { color: '#4ade80', direction: 'rise', delay: bite + 560, duration: 500 })
  return bite
}

const golbatPoisonFang: Choreography = (ctx, { source, target, shake: strength }) => {
  batWings(ctx, source, {
    membrane: '#6d28d9',
    edge: '#e879f9',
    span: 0.62,
    hover: 0.26,
    flapMs: 170,
    duration: 1250,
  })
  fangs(ctx, target, {
    glowColor: '#7c3aed',
    color: '#f5f3ff',
    size: 0.42,
    teeth: 5,
    delay: 190,
    duration: 440,
  })
  fangs(ctx, target, {
    glowColor: '#c084fc',
    color: '#e9d5ff',
    size: 0.52,
    teeth: 5,
    delay: 260,
    duration: 380,
  })
  const bite = 190 + Math.round(440 * 0.55)
  stream(ctx, bodyAt(source, 0.5), bodyAt(target, 0.55), {
    color: '#a855f7',
    count: 22,
    size: 0.08,
    spread: 0.15,
    wobble: 0.14,
    travel: 0.5,
    rise: 0.2,
    delay: bite - 200,
    duration: 380,
  })
  stream(ctx, bodyAt(target, 0.5), bodyAt(source, 0.55), {
    color: '#d946ef',
    count: 14,
    size: 0.07,
    spread: 0.1,
    wobble: 0.16,
    travel: 0.5,
    rise: 0.35,
    delay: bite + 80,
    duration: 560,
  })
  burst(ctx, at(target), { color: '#a855f7', count: 18, delay: bite, gravity: 3, speed: 1.4 })
  burst(ctx, at(target, 0.3), {
    color: '#c084fc',
    count: 14,
    delay: bite + 120,
    spread: 'up',
    gravity: -0.6,
    speed: 1,
    duration: 1000,
    size: 0.12,
  })
  cloud(ctx, at(target, 0.35), {
    color: '#6b21a8',
    opacity: 0.4,
    radius: 0.45,
    delay: bite + 60,
    duration: 900,
  })
  halo(ctx, target, { color: '#7c3aed', direction: 'fall', delay: bite + 80, duration: 600 })
  shockwave(ctx, ground(target), { color: '#7c3aed', delay: bite, radius: 1, duration: 400 })
  cameraPunch(ctx, at(target), 0.35, bite - 40)
  shake(ctx, strength, bite)
  return bite
}

// Crobat's giant glowing X, two bars that slash in one after the other.
function crossStrike(ctx: FxContext, view: UnitView, delay: number, size: number): void {
  const group = new THREE.Group()
  const bars = [-0.8, 0.8].map((angle) => {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), glow('#a21caf', 0.95))
    bar.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035), glow('#f5d0fe')))
    bar.rotation.z = angle
    group.add(bar)
    return bar
  })
  const center = at(view)
  fx(ctx, delay, 520, group, (p) => {
    group.position.copy(center())
    billboard(ctx, group)
    bars.forEach((bar, index) => {
      const cut = easeOut(phase(p, index * 0.12, 0.3 + index * 0.12))
      bar.scale.set(Math.max(0.01, cut * size), 1 + 0.6 * pulse(phase(p, 0.3, 0.6)), 1)
    })
    setOpacity(group, 1 - phase(p, 0.55, 1))
  })
}

const crobatCrossPoison: Choreography = (ctx, { source, target, shake: strength }) => {
  const { reach, hitFraction } = lineTravel(source, target, 1.1)
  crouch(ctx, source, { duration: 140 })
  rush(ctx, source, target, { delay: 120, duration: 640, reach, outEnd: 0.32, hold: 0.22 })
  trail(ctx, source, { color: '#a855f7', delay: 120, duration: 420 })
  speedStreaks(ctx, at(source, 0.6), beyond(source, target, 1.1, 0.6), {
    color: '#c084fc',
    count: 12,
    delay: 120,
    duration: 320,
  })
  const strike = 120 + Math.round(640 * 0.32 * hitFraction)
  crossStrike(ctx, target, strike, 1.3)
  burst(ctx, at(target), { color: '#7c3aed', count: 24, delay: strike + 60, speed: 2.2 })
  cloud(ctx, at(target, 0.4), {
    color: '#6b21a8',
    opacity: 0.4,
    delay: strike + 80,
    duration: 800,
    radius: 0.5,
  })
  const victims = inLine(ctx, source, target, 2)
  victims.forEach((victim) => {
    const delay = strike + Math.round(victim.root.position.distanceTo(target.root.position) * 50)
    crossStrike(ctx, victim, delay, 0.8)
    burst(ctx, at(victim), { color: '#a855f7', count: 12, delay })
  })
  flinchAlong(ctx, target, victims, strike, 50)
  cameraPunch(ctx, at(target), 0.45, strike - 40)
  shake(ctx, strength + 1, strike)
  return strike
}

// ---------- Psyduck / Golduck ----------

// A flat lavender spiral spinning above a confused unit.
function confusionSpiral(ctx: FxContext, view: UnitView, delay: number, duration: number): void {
  const points = Array.from({ length: 40 }, (_, index) => {
    const t = index / 39
    const angle = t * Math.PI * 5
    return new THREE.Vector3(Math.cos(angle) * t * 0.3, 0, Math.sin(angle) * t * 0.3)
  })
  const spiral = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, 0.018, 5),
    glow('#c4b5fd'),
  )
  fx(ctx, delay, duration, spiral, (p, now) => {
    spiral.position
      .copy(view.root.position)
      .add(view.pose.offset)
      .setY(view.height + 0.3 + view.pose.lift)
    spiral.rotation.y = -now * 0.012
    spiral.scale.setScalar(easeOut(phase(p, 0, 0.2)))
    setOpacity(spiral, fadeInOut(p, 0.1, 0.25))
  })
}

const psyduckConfusion: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 700, undefined, (p, now) => {
    source.pose.tilt += Math.sin(now * 0.04) * 0.12 * pulse(p) * m
    source.pose.scale *= 1 - 0.06 * pulse(p)
  })
  orbit(ctx, source, {
    color: '#a5b4fc',
    count: 3,
    radius: 0.35,
    heightFactor: 1.05,
    turns: 2,
    duration: 700,
    build: () => ringMesh('#818cf8', 0.08, 0.02),
  })
  for (let index = 0; index < 4; index++) {
    prop(ctx, source, target, {
      build: () => ringMesh(index % 2 ? '#a78bfa' : '#818cf8', 0.26, 0.035),
      from: at(source, 0.9),
      delay: 300 + index * 70,
      duration: 300,
      arc: 0,
      grow: 1.2,
      fadeOut: 0.3,
    })
  }
  const hit = 600
  levitate(ctx, target, { delay: hit, duration: 900, height: 0.45, wobble: 0.35, spins: 0.5 })
  confusionSpiral(ctx, target, hit, 1000)
  burst(ctx, at(target), { color: '#c4b5fd', count: 16, delay: hit })
  flare(ctx, at(target), { color: '#818cf8', delay: hit, size: 0.6 })
  shake(ctx, strength * 0.6, hit)
  return hit
}

const golduckAquaJet: Choreography = (ctx, { source, target, shake: strength }) => {
  const { hitFraction } = lineTravel(source, target, 0.9)
  const dir = flatDirection(source, target)
  crouch(ctx, source, { duration: 160 })
  const launch = 140
  const travelMs = 420
  const start = ctx.now + launch
  const from = new THREE.Vector3()
  const end = beyond(source, target, 0.9, 0.55)
  // Golduck stays on its tile and fires a torpedo of water that surges down the line in its place.
  const body: PositionAt = (now, out) =>
    out.lerpVectors(source.focusPoint(from, 0.55), end(), clamp01((now - start) / travelMs))
  fx(ctx, launch, 360, undefined, (p) => {
    source.pose.offset.addScaledVector(dir, pulse(p) * 0.12 * motionScale(ctx))
  })
  sheath(ctx, body, {
    color: '#38bdf8',
    radius: 0.5,
    stretch: 1.7,
    axis: dir,
    delay: launch,
    duration: travelMs,
    opacity: 0.45,
  })
  sheath(ctx, body, {
    color: '#e0f2fe',
    radius: 0.58,
    stretch: 1.9,
    axis: dir,
    wire: true,
    delay: launch,
    duration: travelMs,
    opacity: 0.5,
  })
  speedStreaks(ctx, at(source, 0.55), beyond(source, target, 1, 0.55), {
    color: '#7dd3fc',
    count: 10,
    delay: 150,
    duration: 300,
  })
  const strike = launch + Math.round(travelMs * hitFraction)
  burst(ctx, at(target), { color: '#93c5fd', count: 22, delay: strike, spread: 'up', speed: 2 })
  shockwave(ctx, ground(target), { color: '#38bdf8', delay: strike, radius: 1.2, duration: 420 })
  flare(ctx, at(target), { color: '#bae6fd', delay: strike, size: 0.6 })
  const victims = inLine(ctx, source, target)
  const total = source.root.position.distanceTo(target.root.position) / hitFraction
  victims.forEach((victim) => {
    const delay =
      launch +
      Math.round(
        travelMs * Math.min(1, victim.root.position.distanceTo(source.root.position) / total),
      )
    burst(ctx, at(victim), { color: '#60a5fa', count: 12, delay })
    flinch(ctx, [victim], delay)
  })
  cameraPunch(ctx, at(target), 0.35, strike - 30)
  shake(ctx, strength, strike)
  return strike
}

const golduckPsychic: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const gem = new THREE.Group()
  gem.add(
    new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#ef4444')),
    new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), glow('#f472b6', 0.5)),
  )
  const forward = new THREE.Vector3()
  fx(ctx, 0, 760, gem, (p, now) => {
    forward.set(0, 0, 1).applyQuaternion(ctx.camera.quaternion)
    source.focusPoint(gem.position, 0.88).addScaledVector(forward, 0.12)
    gem.scale.setScalar(0.6 + 0.6 * easeOut(phase(p, 0, 0.4)) + 0.15 * Math.sin(now * 0.04))
    setOpacity(gem, fadeInOut(p, 0.1, 0.3))
  })
  shockwave(ctx, ground(source), { color: '#f472b6', delay: 200, radius: 2, duration: 600 })
  shockwave(ctx, ground(source), { color: '#e879f9', delay: 320, radius: 2.4, duration: 600 })
  const victims = [target, ...around(ctx, source, target, 1.9, 3)]
  const lift = 380
  const hold = 600
  const slam = lift + Math.round(hold * 0.88)
  victims.forEach((victim, index) => {
    shell(ctx, victim, {
      color: '#f472b6',
      edge: '#fbcfe8',
      radius: 0.58,
      delay: lift,
      duration: hold - 40,
    })
    fx(ctx, lift, hold, undefined, (p, now) => {
      const up = easeOut(phase(p, 0, 0.5))
      const drop = easeIn(phase(p, 0.78, 0.88))
      victim.pose.lift += 0.75 * m * up * (1 - drop)
      victim.pose.tilt += Math.sin(now * 0.02 + index) * 0.2 * up * (1 - drop)
    })
    burst(ctx, ground(victim), {
      color: '#f0abfc',
      count: 14,
      delay: slam,
      spread: 'ring',
      speed: 1.6,
    })
  })
  shockwave(ctx, ground(target), { color: '#e879f9', delay: slam, radius: 2.2 })
  cameraPunch(ctx, at(target), 0.5, slam - 50)
  shake(ctx, strength + 1, slam, 380)
  flinch(ctx, victims.slice(1), slam)
  return slam
}

// ---------- Mankey / Primeape / Annihilape ----------

const mankeyKarateChop: Choreography = (ctx, { source, target, shake: strength }) => {
  leap(ctx, source, { duration: 420, height: 0.5 * motionScale(ctx) })
  rush(ctx, source, target, { duration: 520, reach: 0.6, outEnd: 0.45, hold: 0.2 })
  const blade = new THREE.Group()
  const hand = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.75).translate(0, -0.38, 0),
    glow('#fff7ed'),
  )
  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.8).translate(0, -0.4, 0),
    glow('#fb923c', 0.6),
  )
  blade.add(edge, hand)
  const pivot = at(target, 1.25)
  fx(ctx, 140, 320, blade, (p) => {
    blade.position.copy(pivot())
    billboard(ctx, blade)
    blade.rotateZ(2.2 - easeIn(phase(p, 0, 0.5)) * 2.3)
    setOpacity(blade, 1 - phase(p, 0.6, 1))
  })
  const hit = 300
  slashArc(ctx, at(target), {
    color: '#fb923c',
    delay: hit - 20,
    angle: 1.3,
    radius: 0.55,
    sweep: -1.2,
    duration: 220,
  })
  flare(ctx, at(target), { color: '#ffffff', delay: hit, size: 0.5 })
  burst(ctx, at(target), { color: '#fdba74', count: 14, delay: hit })
  shockwave(ctx, ground(target), { color: '#fb923c', delay: hit, radius: 0.9, duration: 320 })
  shake(ctx, strength, hit)
  return hit
}

const primeapeRageFist: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 460, undefined, (p, now) => {
    source.pose.offset.x += Math.sin(now * 0.11) * 0.05 * m
    source.pose.scale *= 1 + 0.12 * pulse(p)
  })
  aura(ctx, source, { color: '#dc2626', duration: 520, count: 22 })
  ;[80, 260].forEach((delay) =>
    burst(ctx, at(source, 1), {
      color: '#f5f5f4',
      count: 8,
      delay,
      spread: 'up',
      gravity: -0.5,
      speed: 0.8,
    }),
  )
  const launch = above(source, 1.3)
  prop(ctx, source, target, {
    build: () => {
      const fist = fistMesh(0.34, () =>
        standard('#b91c1c', { emissive: '#7f1d1d', emissiveIntensity: 0.6, flatShading: true }),
      )
      fist.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), glow('#f97316', 0.35)))
      return fist
    },
    from: launch,
    delay: 420,
    duration: 200,
    arc: 0.2,
  })
  speedStreaks(ctx, launch, at(target), { color: '#f87171', count: 8, delay: 420, duration: 220 })
  const hit = 620
  flare(ctx, at(target), { color: '#f97316', size: 1, delay: hit })
  burst(ctx, at(target), { color: '#ef4444', count: 28, delay: hit, speed: 2.6 })
  shockwave(ctx, ground(target), { color: '#dc2626', delay: hit, radius: 1.5 })
  pushBack(ctx, target, ground(source), { delay: hit, duration: 380, distance: 0.4 })
  cameraPunch(ctx, at(target), 0.55, hit - 50)
  shake(ctx, strength + 1, hit)
  return hit
}

const annihilapeShadowRageFist: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  aura(ctx, source, { color: '#581c87', duration: 800, count: 30 })
  halo(ctx, source, { color: '#7e22ce', direction: 'rise', duration: 600 })
  fx(ctx, 0, 600, undefined, (p, now) => {
    source.pose.offset.x += Math.sin(now * 0.13) * 0.04 * m
    source.pose.scale *= 1 + 0.15 * pulse(p)
  })
  sigil(ctx, ground(target), {
    color: '#3b0764',
    secondary: '#a855f7',
    radius: 1.1,
    points: 5,
    delay: 200,
    duration: 1100,
  })
  const sky = above(target, 4.5)
  prop(ctx, source, target, {
    build: () => {
      const fist = fistMesh(0.75, () => glow('#a855f7', 0.55))
      const outline = fistMesh(0.84, () => glow('#e9d5ff', 0.16))
      fist.add(outline)
      return fist
    },
    from: sky,
    to: at(target, 0.7),
    delay: 420,
    duration: 340,
    arc: 0,
    grow: 0.4,
  })
  speedStreaks(ctx, sky, at(target, 0.7), {
    color: '#c084fc',
    count: 10,
    delay: 420,
    duration: 340,
    spread: 0.8,
  })
  const hit = 760
  flare(ctx, at(target), { color: '#a855f7', size: 1.4, delay: hit })
  pillar(ctx, ground(target), {
    color: '#7e22ce',
    delay: hit,
    duration: 600,
    height: 3,
    radius: 0.5,
  })
  shockwave(ctx, ground(target), { color: '#a855f7', delay: hit, radius: 2.2 })
  shockwave(ctx, ground(target), { color: '#3b0764', delay: hit + 80, radius: 1.4 })
  burst(ctx, at(target), { color: '#c084fc', count: 34, delay: hit, spread: 'up', speed: 2.4 })
  orbit(ctx, target, {
    color: '#a855f7',
    count: 4,
    radius: 0.6,
    turns: 1.5,
    collapse: 1.8,
    delay: hit,
    duration: 700,
    build: () => flameMesh('#7e22ce', '#e9d5ff', 0.12),
  })
  cameraPunch(ctx, at(target), 0.8, hit - 80)
  shake(ctx, strength + 2, hit, 500)
  return hit
}

// ---------- Growlithe / Arcanine ----------

const growlitheFlameWheel: Choreography = (ctx, { source, target, shake: strength }) => {
  const { reach, hitFraction } = lineTravel(source, target, 0.7)
  const dir = flatDirection(source, target)
  const normal = new THREE.Vector3().crossVectors(dir, UP).normalize()
  crouch(ctx, source, { duration: 220 })
  const wheel = new THREE.Group()
  wheel.add(
    new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 32), glow('#f97316', 0.9)),
    new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 32), glow('#fde047', 0.9)),
  )
  for (let index = 0; index < 6; index++) {
    const flame = flameMesh('#fb923c', '#fef3c7', 0.1)
    const angle = (index / 6) * Math.PI * 2
    flame.position.set(Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0)
    flame.rotation.z = angle - Math.PI / 2
    wheel.add(flame)
  }
  const look = new THREE.Vector3()
  const body = rush(ctx, source, target, {
    delay: 200,
    duration: 700,
    reach,
    outEnd: 0.32,
    hold: 0.18,
  })
  fx(ctx, 80, 820, wheel, (p, now) => {
    body(now, wheel.position)
    wheel.lookAt(look.copy(wheel.position).add(normal))
    wheel.rotateZ(-now * 0.02)
    wheel.scale.setScalar(easeOut(phase(p, 0, 0.2)))
    setOpacity(wheel, 1 - phase(p, 0.8, 1))
  })
  spin(ctx, source, { delay: 200, duration: 700, turns: ctx.reducedMotion ? 0 : -3 })
  trail(ctx, source, { color: '#f97316', delay: 200, duration: 600 })
  const strike = 200 + Math.round(700 * 0.32 * hitFraction)
  burst(ctx, at(target), { color: '#fb923c', count: 22, delay: strike, speed: 2 })
  shockwave(ctx, ground(target), { color: '#f97316', delay: strike, radius: 1.1, duration: 380 })
  flare(ctx, at(target), { color: '#fde047', delay: strike, size: 0.6 })
  const victims = inLine(ctx, source, target)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#f97316', count: 12, delay: strike + 90 }),
  )
  flinch(ctx, victims, strike + 90, 40)
  shake(ctx, strength, strike)
  return strike
}

const arcanineExtremeSpeed: Choreography = (ctx, { source, target, shake: strength }) => {
  const { distance } = lineTravel(source, target, 1)
  const dir = flatDirection(source, target)
  const jump = dir.clone().multiplyScalar((distance + 1) * motionScale(ctx))
  crouch(ctx, source, { duration: 180 })
  const vanish = 180
  const duration = 820
  fx(ctx, vanish, duration, undefined, (p) => {
    const gone = phase(p, 0, 0.06) * (1 - phase(p, 0.44, 0.52))
    source.pose.scale *= 1 - 0.97 * gone
    const out = p < 0.05 ? 0 : 1 - easeInOut(phase(p, 0.7, 1))
    source.pose.offset.addScaledVector(jump, out)
  })
  burst(ctx, at(source), { color: '#ffffff', count: 14, delay: vanish, spread: 'ring', speed: 1.4 })
  speedStreaks(ctx, at(source, 0.55), beyond(source, target, 1, 0.55), {
    color: '#fefce8',
    count: 16,
    delay: vanish,
    duration: 260,
    spread: 0.7,
    thickness: 0.025,
  })
  speedStreaks(ctx, at(source, 0.4), beyond(source, target, 1, 0.4), {
    color: '#fdba74',
    count: 8,
    delay: vanish + 60,
    duration: 240,
  })
  const strike = vanish + 70
  const victims = [target, ...inLine(ctx, source, target)]
  victims.forEach((victim, index) => {
    slashArc(ctx, at(victim), {
      color: '#ffffff',
      delay: strike + index * 30,
      angle: -0.4,
      sweep: 0.5,
      radius: 0.7,
      duration: 200,
    })
    burst(ctx, at(victim), { color: '#fff7ed', count: 12, delay: strike + index * 30, speed: 2 })
  })
  flare(ctx, at(target), { color: '#ffffff', delay: strike, size: 0.7 })
  shockwave(ctx, ground(target), {
    color: '#ffffff',
    delay: strike + 60,
    radius: 1.4,
    duration: 380,
  })
  burst(ctx, beyond(source, target, 1, 0.5), {
    color: '#fb923c',
    count: 14,
    delay: vanish + Math.round(duration * 0.5),
    speed: 1.4,
  })
  flinch(ctx, victims.slice(1), strike + 30, 30)
  cameraPunch(ctx, at(target), 0.4, strike - 30)
  shake(ctx, strength, strike)
  return strike
}

const arcanineFlareBlitz: Choreography = (ctx, { source, target, shake: strength }) => {
  const { reach, hitFraction } = lineTravel(source, target, 0.3)
  const dir = flatDirection(source, target)
  aura(ctx, source, { color: '#ef4444', duration: 500, count: 30 })
  halo(ctx, source, { color: '#f97316', direction: 'rise', duration: 420 })
  pillar(ctx, ground(source), { color: '#f97316', duration: 420, height: 1.8, radius: 0.45 })
  const body = rush(ctx, source, target, {
    delay: 380,
    duration: 760,
    reach,
    outEnd: 0.3,
    hold: 0.28,
    lift: 0.15,
  })
  sheath(ctx, body, {
    color: '#f97316',
    radius: 0.62,
    stretch: 1.25,
    axis: dir,
    opacity: 0.45,
    delay: 300,
    duration: 560,
  })
  const shroud = flameMesh('#ef4444', '#fde68a', 0.9)
  const tongue = dir
    .clone()
    .negate()
    .add(new THREE.Vector3(0, 0.6, 0))
    .normalize()
  fx(ctx, 300, 560, shroud, (p, now) => {
    body(now, shroud.position)
    shroud.quaternion.setFromUnitVectors(UP, tongue)
    const flick = 1 + 0.18 * Math.sin(now * 0.03)
    const grow = easeOut(phase(p, 0, 0.2))
    shroud.scale.set(0.9 * grow, 0.9 * grow * flick, 0.9 * grow)
    setOpacity(shroud, fadeInOut(p, 0.1, 0.25))
  })
  trail(ctx, source, { color: '#fb923c', delay: 380, duration: 520 })
  const start = source.root.position.clone()
  const end = target.root.position.clone()
  ;[0.25, 0.5, 0.75].forEach((t) =>
    burst(ctx, start.clone().lerp(end, t).setY(0.1), {
      color: '#f97316',
      count: 10,
      delay: 380 + Math.round(760 * 0.3 * t * hitFraction),
      spread: 'up',
      speed: 1.4,
    }),
  )
  const strike = 380 + Math.round(760 * 0.3 * hitFraction)
  pillar(ctx, ground(target), {
    color: '#f97316',
    delay: strike,
    duration: 700,
    height: 2.8,
    radius: 0.55,
  })
  burst(ctx, at(target), { color: '#fde68a', count: 34, delay: strike, speed: 2.8 })
  shockwave(ctx, ground(target), { color: '#dc2626', delay: strike, radius: 2.2 })
  flare(ctx, at(target), { color: '#fb923c', delay: strike, size: 1.1 })
  const victims = inLine(ctx, source, target)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#ef4444', count: 14, delay: strike + 60 }),
  )
  flinch(ctx, victims, strike + 60, 40)
  cloud(ctx, at(source, 0.8), {
    color: '#57534e',
    delay: strike + 260,
    duration: 800,
    radius: 0.35,
    opacity: 0.5,
  })
  fx(ctx, strike + 150, 360, undefined, (p) => {
    source.pose.tilt += Math.sin(p * Math.PI * 4) * 0.15 * (1 - p)
  })
  cameraPunch(ctx, at(target), 0.7, strike - 60)
  shake(ctx, strength + 2, strike, 420)
  return strike
}

// ---------- Tentacool / Tentacruel ----------

const tentacoolAcidSpray: Choreography = (ctx, { source, target }) => {
  const gems = new THREE.Group()
  const pair = [-1, 1].map(() => {
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glow('#ef4444'))
    gem.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), glow('#f87171', 0.4)))
    gems.add(gem)
    return gem
  })
  const right = new THREE.Vector3()
  const center = new THREE.Vector3()
  fx(ctx, 0, 520, gems, (p, now) => {
    cameraRight(ctx, right)
    source.focusPoint(center, 0.6)
    pair.forEach((gem, index) => {
      gem.position.copy(center).addScaledVector(right, index === 0 ? -0.18 : 0.18)
      gem.scale.setScalar(1 + 0.4 * Math.sin(now * 0.04))
    })
    setOpacity(gems, fadeInOut(p, 0.1, 0.3))
  })
  const victims = [target, ...inLine(ctx, source, target)]
  for (let index = 0; index < 6; index++) {
    projectile(ctx, source, victims[index % victims.length], {
      color: index % 2 ? '#a3e635' : '#a855f7',
      core: '#ecfccb',
      delay: 220 + index * 45,
      duration: 320,
      size: 0.07,
      arc: 0.45,
    })
  }
  const hit = 540
  victims.forEach((victim, index) => {
    const delay = hit + index * 45
    burst(ctx, at(victim, 0.4), {
      color: '#84cc16',
      count: 12,
      delay,
      spread: 'up',
      gravity: -0.8,
      speed: 0.9,
      duration: 900,
      size: 0.1,
    })
    statArrows(ctx, victim, {
      color: '#a855f7',
      direction: 'fall',
      delay: delay + 60,
      duration: 800,
    })
  })
  flinch(ctx, victims.slice(1), hit + 45, 45)
  return hit
}

function tentacles(ctx: FxContext, source: UnitView, duration: number): void {
  const group = new THREE.Group()
  const count = 6
  for (let index = 0; index < count; index++) {
    const points = [0, 1, 2, 3, 4].map(
      (step) =>
        new THREE.Vector3(Math.sin(step * 0.9) * 0.12 * step, step * 0.28, step * step * 0.015),
    )
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.035, 5),
      standard('#60a5fa', { opacity: 0.85, emissive: '#1e3a8a', emissiveIntensity: 0.5 }),
    )
    const holder = new THREE.Group()
    holder.rotation.y = (index / count) * Math.PI * 2
    tube.position.x = 0.3
    holder.add(tube)
    group.add(holder)
  }
  fx(ctx, 0, duration, group, (p, now) => {
    group.position.copy(source.root.position).setY(0.25 + source.pose.lift)
    const rise = easeOut(phase(p, 0, 0.3))
    group.children.forEach((holder, index) => {
      const tube = holder.children[0]
      tube.rotation.z = -0.4 + Math.sin(now * 0.012 + index) * 0.35
      tube.scale.set(1, Math.max(0.01, rise), 1)
    })
    setOpacity(group, fadeInOut(p, 0.1, 0.25))
  })
}

const tentacruelSludgeWave: Choreography = (ctx, { source, target, shake: strength }) => {
  tentacles(ctx, source, 1000)
  leap(ctx, source, { duration: 500, height: 0.4 * motionScale(ctx) })
  const crash = 460
  waveWall(ctx, ground(target), {
    color: '#7e22ce',
    crest: '#d8b4fe',
    radius: 2.6,
    height: 0.9,
    delay: crash - 120,
    duration: 820,
  })
  cloud(ctx, ground(target), {
    color: '#581c87',
    radius: 1.2,
    size: 0.45,
    rise: 0.1,
    opacity: 0.55,
    delay: crash,
    duration: 1000,
  })
  burst(ctx, at(target, 0.5), {
    color: '#a855f7',
    count: 28,
    delay: crash,
    speed: 2.2,
    gravity: 2.6,
    size: 0.2,
  })
  const victims = [target, ...around(ctx, source, target, 2.4, 3)]
  victims.forEach((victim, index) => {
    const delay = crash + index * 50
    statArrows(ctx, victim, {
      color: '#c084fc',
      direction: 'fall',
      delay: delay + 80,
      duration: 800,
    })
    halo(ctx, victim, { color: '#7e22ce', direction: 'fall', delay, duration: 600 })
  })
  flinch(ctx, victims.slice(1), crash, 50)
  cameraPunch(ctx, at(target), 0.4, crash - 60)
  shake(ctx, strength + 1, crash, 500)
  return crash
}

// ---------- Geodude / Graveler / Golem ----------

const geodudeRockThrow: Choreography = (ctx, { source, target, shake: strength }) => {
  fx(ctx, 0, 420, undefined, (p) => {
    source.pose.lift += 0.12 * pulse(phase(p, 0.3, 1))
    source.pose.scale *= 1 - 0.1 * pulse(phase(p, 0, 0.35))
  })
  const hoist = above(source, 1.35)
  const held = rockMesh('#8b8378', 0.26)
  fx(ctx, 60, 340, held, (p) => {
    const point = hoist()
    held.position.copy(point).setY(point.y - 0.9 * (1 - easeOut(p)))
    held.rotation.y = p * 2
    held.scale.setScalar(0.3 + 0.7 * easeOut(p))
  })
  burst(ctx, ground(source), { color: '#a8a29e', count: 10, delay: 60, spread: 'up', speed: 1 })
  prop(ctx, source, target, {
    build: () => rockMesh('#8b8378', 0.26),
    from: hoist,
    delay: 400,
    duration: 400,
    arc: 1.3,
    spin: 8,
    tumble: 6,
  })
  const hit = 800
  debris(ctx, at(target, 0.5), { color: '#78716c', count: 7, size: 0.1, delay: hit, speed: 1.8 })
  burst(ctx, at(target), { color: '#d6d3d1', count: 20, delay: hit, speed: 1.8 })
  shockwave(ctx, ground(target), { color: '#a8a29e', delay: hit, radius: 1.1, duration: 380 })
  flare(ctx, at(target), { color: '#e7e5e4', delay: hit, size: 0.6 })
  cameraPunch(ctx, at(target), 0.4, hit - 50)
  shake(ctx, strength, hit)
  return hit
}

const gravelerRollout: Choreography = (ctx, { source, target, shake: strength }) => {
  const { reach, hitFraction } = lineTravel(source, target, 1)
  const dir = flatDirection(source, target)
  const normal = new THREE.Vector3().crossVectors(UP, dir).normalize()
  fx(ctx, 0, 1150, undefined, (p) => {
    source.pose.scale *= 1 - 0.45 * easeOut(phase(p, 0, 0.15)) * (1 - phase(p, 0.9, 1))
  })
  const body = rush(ctx, source, target, {
    delay: 200,
    duration: 900,
    reach,
    outEnd: 0.42,
    hold: 0.12,
  })
  const boulder = new THREE.Group()
  boulder.add(
    new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.42, 0),
      standard('#78716c', { flatShading: true, roughness: 1, opacity: 0.88 }),
    ),
  )
  for (let index = 0; index < 4; index++) {
    const bump = rockMesh('#57534e', 0.14)
    const angle = (index / 4) * Math.PI * 2
    bump.position.set(Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, index % 2 ? 0.15 : -0.15)
    boulder.add(bump)
  }
  const home = source.root.position.clone()
  fx(ctx, 120, 1000, boulder, (p, now) => {
    body(now, boulder.position)
    const rolled = boulder.position.distanceTo(home.setY(boulder.position.y))
    boulder.position.y = 0.42 + Math.abs(Math.sin(p * 30)) * 0.04
    boulder.quaternion.setFromAxisAngle(normal, rolled / 0.42)
    boulder.scale.setScalar(easeOut(phase(p, 0, 0.1)) * (1 + 0.25 * phase(p, 0.1, 0.5)))
    setOpacity(boulder, 1 - phase(p, 0.85, 1))
  })
  spin(ctx, source, { delay: 200, duration: 900, turns: ctx.reducedMotion ? 0 : 4 })
  trail(ctx, source, { color: '#d6d3d1', delay: 200, duration: 700 })
  cloud(ctx, ground(source), {
    color: '#d6d3d1',
    delay: 200,
    duration: 700,
    radius: 0.4,
    opacity: 0.45,
  })
  const strike = 200 + Math.round(900 * 0.42 * hitFraction)
  burst(ctx, at(target), { color: '#a8a29e', count: 24, delay: strike, speed: 2 })
  debris(ctx, ground(target), { color: '#78716c', count: 6, size: 0.1, delay: strike })
  shockwave(ctx, ground(target), { color: '#78716c', delay: strike, radius: 1.4 })
  pushBack(ctx, target, ground(source), { delay: strike, duration: 380, distance: 0.4, lift: 0.2 })
  const victims = inLine(ctx, source, target)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#a8a29e', count: 12, delay: strike + 80 }),
  )
  flinch(ctx, victims, strike + 80, 40)
  cameraPunch(ctx, at(target), 0.45, strike - 40)
  shake(ctx, strength + 1, strike)
  return strike
}

// Stealth Rock shards: jagged stones rise from the floor, orbit menacingly, turn their points inward, then
// drive into the victim at `impact`.
function stoneRing(
  ctx: FxContext,
  victim: UnitView,
  delay: number,
  impact: number,
  count: number,
): void {
  const group = new THREE.Group()
  const stones = Array.from({ length: count }, (_, index) => {
    const stone = jaggedStone(index % 2 ? '#57534e' : '#78716c', '#fbbf24', 0.11)
    group.add(stone)
    return { stone, seed: Math.random() * Math.PI * 2 }
  })
  // The drive-in finishes at 90% so the burst lands on `impact` and the shards linger a beat in the body.
  const duration = Math.round((impact - delay) / 0.9)
  const center = new THREE.Vector3()
  const inward = new THREE.Vector3()
  const tumble = new THREE.Quaternion()
  const pointed = new THREE.Quaternion()
  const euler = new THREE.Euler()
  fx(ctx, delay, duration, group, (p, now) => {
    victim.focusPoint(center, 0.55).add(victim.pose.offset)
    const rise = easeOut(phase(p, 0, 0.22))
    const menace = phase(p, 0.5, 0.78)
    const drive = easeIn(phase(p, 0.8, 0.9))
    stones.forEach(({ stone, seed }, index) => {
      const angle = (index / count) * Math.PI * 2 + p * 2.6 + seed * 0.1
      const radius = (0.72 + 0.14 * easeOut(menace)) * (1 - drive * 0.95)
      const bob = Math.sin(now * 0.007 + seed) * 0.07 * (1 - drive)
      stone.position.set(
        center.x + Math.cos(angle) * radius,
        0.05 + (center.y + 0.25 - 0.05) * rise + bob - drive * 0.2,
        center.z + Math.sin(angle) * radius,
      )
      euler.set(now * 0.002 + seed, now * 0.003 + index, 0)
      tumble.setFromEuler(euler)
      inward.subVectors(center, stone.position).normalize()
      pointed.setFromUnitVectors(UP, inward)
      stone.quaternion.slerpQuaternions(tumble, pointed, easeOut(menace))
      stone.scale.setScalar(0.4 + 0.6 * rise)
    })
    group.visible = p < 0.93
  })
}

const golemStealthRock: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  leap(ctx, source, { duration: 380, height: 0.35 * m, slam: true })
  const stomp = 330
  groundCracks(ctx, ground(source), {
    color: '#f59e0b',
    count: 6,
    length: 1.1,
    delay: stomp,
    duration: 900,
  })
  cloud(ctx, ground(source), {
    color: '#a8a29e',
    count: 7,
    radius: 0.7,
    size: 0.35,
    rise: 0.3,
    opacity: 0.5,
    delay: stomp,
    duration: 800,
  })
  const victims = [target, ...around(ctx, source, target, 2, 2)]
  const pierce = 1080
  victims.forEach((victim, victimIndex) => {
    const rise = 380 + victimIndex * 70
    const hit = pierce + victimIndex * 60
    groundCracks(ctx, ground(victim), {
      color: '#fbbf24',
      count: 4,
      length: 0.6,
      width: 0.035,
      delay: rise,
      duration: 700,
    })
    stoneRing(ctx, victim, rise, hit, victimIndex === 0 ? 5 : 4)
    burst(ctx, at(victim), { color: '#fbbf24', count: 14, delay: hit, speed: 1.8 })
  })
  debris(ctx, at(target, 0.4), { color: '#57534e', count: 7, pointed: true, delay: pierce })
  cloud(ctx, ground(target), {
    color: '#a8a29e',
    count: 8,
    radius: 0.8,
    size: 0.4,
    rise: 0.45,
    opacity: 0.55,
    delay: pierce,
    duration: 1000,
  })
  groundCracks(ctx, ground(target), {
    color: '#f59e0b',
    count: 7,
    length: 1.4,
    delay: pierce,
    duration: 1100,
  })
  shockwave(ctx, ground(target), { color: '#a8a29e', delay: pierce, radius: 1.8 })
  burst(ctx, at(target, 0.5), {
    color: '#fcd34d',
    count: 10,
    size: 0.07,
    delay: pierce + 200,
    duration: 1000,
    spread: 'up',
    speed: 0.6,
    gravity: -0.3,
  })
  flinch(ctx, victims.slice(1), pierce, 60)
  cameraPunch(ctx, at(target), 0.5, pierce - 60)
  shake(ctx, strength + 1, pierce)
  return pierce
}

// ---------- Ponyta / Rapidash ----------

const ponytaFlameCharge: Choreography = (ctx, { source, target }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 520, undefined, (p) => {
    source.pose.lift += Math.abs(Math.sin(p * Math.PI * 2)) * 0.22 * m
  })
  ;[130, 390].forEach((delay) => {
    shockwave(ctx, ground(source), { color: '#fb923c', delay, radius: 0.9, duration: 380 })
    burst(ctx, ground(source), { color: '#fdba74', count: 10, delay, spread: 'up', speed: 1.2 })
  })
  vortex(ctx, ground(source), {
    color: '#f97316',
    secondary: '#fde047',
    height: 1.1,
    radius: 0.45,
    rings: 4,
    delay: 120,
    duration: 800,
  })
  const boost = 360
  flare(ctx, at(source), { color: '#fde047', delay: boost, size: 0.6 })
  teamOf(ctx, source, target, 2.2).forEach((ally, index) => {
    const delay = boost + index * 60
    halo(ctx, ally, { color: '#fb923c', direction: 'rise', delay, duration: 520 })
    statArrows(ctx, ally, { color: '#fde047', direction: 'rise', delay, duration: 700 })
  })
  return boost
}

const rapidashFireSpin: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 320, undefined, (p) => {
    source.pose.tilt -= 0.35 * pulse(p) * m
    source.pose.lift += 0.15 * pulse(p) * m
  })
  aura(ctx, source, { color: '#f97316', duration: 500, count: 20 })
  const ring = 0.85
  if (!ctx.reducedMotion) {
    const center = target.root.position.clone()
    const home = source.root.position.clone()
    const base = Math.atan2(home.z - center.z, home.x - center.x)
    const point = new THREE.Vector3()
    const onRing = (angle: number, out: THREE.Vector3) =>
      out.set(center.x + Math.cos(angle) * ring, 0, center.z + Math.sin(angle) * ring)
    const entry = new THREE.Vector3()
    fx(ctx, 300, 850, undefined, (p) => {
      if (p < 0.25) {
        point.lerpVectors(home, onRing(base, entry), easeInOut(p / 0.25))
      } else if (p < 0.8) {
        onRing(base + Math.PI * 2 * easeInOut(phase(p, 0.25, 0.8)), point)
      } else {
        point.lerpVectors(onRing(base, entry), home, easeInOut(phase(p, 0.8, 1)))
      }
      source.pose.offset.add(point.sub(home).setY(0))
      source.pose.lift += Math.abs(Math.sin(p * Math.PI * 8)) * 0.1
    })
    trail(ctx, source, { color: '#fb923c', delay: 300, duration: 850 })
  }
  burst(ctx, ground(target), {
    color: '#f97316',
    spread: 'ring',
    count: 22,
    speed: ring,
    gravity: 0,
    delay: 620,
    duration: 700,
  })
  const ignite = 980
  shockwave(ctx, ground(target), {
    color: '#f97316',
    delay: ignite - 120,
    radius: 1.2,
    duration: 420,
  })
  vortex(ctx, ground(target), {
    color: '#ef4444',
    secondary: '#fbbf24',
    height: 2.4,
    radius: 0.95,
    rings: 8,
    delay: ignite - 120,
    duration: 800,
  })
  pillar(ctx, ground(target), {
    color: '#fb923c',
    delay: ignite,
    duration: 600,
    height: 2.2,
    radius: 0.5,
  })
  burst(ctx, at(target), { color: '#fde68a', count: 22, delay: ignite, spread: 'up', speed: 2 })
  const victims = around(ctx, source, target, 1.6, 2)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#f97316', count: 12, delay: ignite }),
  )
  flinch(ctx, victims, ignite)
  cameraPunch(ctx, at(target), 0.45, ignite - 60)
  shake(ctx, strength + 1, ignite)
  return ignite
}

const rapidashMegahorn: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const { reach, hitFraction } = lineTravel(source, target, 0.5)
  const dir = flatDirection(source, target)
  fx(ctx, 0, 320, undefined, (p) => {
    source.pose.tilt -= 0.3 * pulse(p) * m
  })
  aura(ctx, source, { color: '#84cc16', duration: 400 })
  const body = rush(ctx, source, target, {
    delay: 300,
    duration: 700,
    reach,
    outEnd: 0.3,
    hold: 0.25,
  })
  const horn = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.8, 10).rotateX(Math.PI / 2).translate(0, 0, 0.4),
    glow('#a3e635'),
  )
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.7, 8).rotateX(Math.PI / 2).translate(0, 0, 0.38),
    glow('#f7fee7'),
  )
  horn.add(shaft, core)
  horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
  const strike = 300 + Math.round(700 * 0.3 * hitFraction)
  fx(ctx, 0, 1000, horn, (p, now) => {
    body(now, horn.position).addScaledVector(dir, 0.3)
    horn.position.y += 0.18
    const charge = easeOut(phase(p, 0, 0.3))
    const thrust = pulse(phase(p, (strike - 60) / 1000, (strike + 140) / 1000))
    horn.scale.setScalar(Math.max(0.01, charge * (1 + 0.5 * thrust)))
    setOpacity(horn, (0.8 + 0.2 * Math.sin(now * 0.04)) * (1 - phase(p, 0.85, 1)))
  })
  speedStreaks(ctx, at(source, 0.6), beyond(source, target, 0.5, 0.6), {
    color: '#bef264',
    count: 10,
    delay: 300,
    duration: 300,
  })
  flare(ctx, at(target), { color: '#bef264', size: 1.1, delay: strike })
  burst(ctx, at(target), { color: '#84cc16', count: 28, delay: strike, speed: 2.4 })
  shockwave(ctx, ground(target), { color: '#65a30d', delay: strike, radius: 1.6 })
  pushBack(ctx, target, ground(source), { delay: strike, duration: 400, distance: 0.5 })
  const victims = inLine(ctx, source, target)
  victims.forEach((victim) =>
    burst(ctx, at(victim), { color: '#a3e635', count: 12, delay: strike + 70 }),
  )
  flinchAlong(ctx, target, victims, strike, 60)
  cameraPunch(ctx, at(target), 0.6, strike - 50)
  shake(ctx, strength + 1, strike)
  return strike
}

// ---------- Slowpoke / Slowbro ----------

const slowpokeYawn: Choreography = (ctx, { source, target }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 900, undefined, (p) => {
    const gape = pulse(phase(p, 0.1, 0.8))
    source.pose.scale *= 1 + 0.12 * gape
    source.pose.tilt -= 0.25 * gape * m
    source.pose.lift += 0.05 * gape
  })
  const bubble = new THREE.Group()
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glow('#ffffff', 0.7))
  shine.position.set(-0.35, 0.35, 0.3)
  bubble.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glow('#fbcfe8', 0.35)), shine)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  let resolved = false
  fx(ctx, 380, 620, bubble, (p, now) => {
    if (!resolved) {
      source.focusPoint(from, 0.7)
      resolved = true
    }
    target.focusPoint(to, 0.6)
    bubble.position.lerpVectors(from, to, easeInOut(p))
    bubble.position.y += Math.sin(p * Math.PI * 2) * 0.12 + Math.sin(Math.PI * p) * 0.35
    const wobble = 1 + 0.06 * Math.sin(now * 0.02)
    bubble.scale.set(0.22 * wobble + p * 0.12, 0.22 / wobble + p * 0.12, 0.22 + p * 0.12)
  })
  const pop = 1000
  burst(ctx, at(target, 0.6), {
    color: '#fce7f3',
    count: 16,
    delay: pop,
    spread: 'ring',
    speed: 1.2,
  })
  flare(ctx, at(target, 0.6), { color: '#f9a8d4', delay: pop, size: 0.5 })
  drowse(ctx, target, pop, 1000)
  zzz(ctx, target, { color: '#e0e7ff', delay: pop + 80, duration: 1000 })
  return pop
}

function plusGeometry(size: number): THREE.ShapeGeometry {
  const a = size * 0.3
  const b = size
  const shape = new THREE.Shape()
  const outline: [number, number][] = [
    [-a, b],
    [a, b],
    [a, a],
    [b, a],
    [b, -a],
    [a, -a],
    [a, -b],
    [-a, -b],
    [-a, -a],
    [-b, -a],
    [-b, a],
    [-a, a],
  ]
  outline.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

const slowbroSlackOff: Choreography = (ctx, { source, target }) => {
  const m = motionScale(ctx)
  fx(ctx, 0, 1000, undefined, (p, now) => {
    const lounge = easeOut(phase(p, 0, 0.25)) * (1 - phase(p, 0.8, 1))
    source.pose.tilt += 0.4 * lounge * m
    source.pose.lift -= 0.06 * lounge - 0.02 * Math.sin(now * 0.006)
  })
  sigil(ctx, ground(source), {
    color: '#86efac',
    secondary: '#fbcfe8',
    radius: 0.75,
    points: 4,
    duration: 1000,
  })
  aura(ctx, source, { color: '#86efac', delay: 200, duration: 800, count: 18 })
  const patient = target
  const crosses = new THREE.Group()
  const pluses = Array.from({ length: 3 }, (_, index) => {
    const plus = new THREE.Mesh(plusGeometry(0.1), glow(index === 1 ? '#bbf7d0' : '#4ade80'))
    crosses.add(plus)
    return plus
  })
  fx(ctx, 300, 900, crosses, (p) => {
    pluses.forEach((plus, index) => {
      const local = phase(p, index * 0.15, 0.7 + index * 0.15)
      plus.position.copy(patient.root.position)
      plus.position.x += (index - 1) * 0.3
      plus.position.y = 0.4 + local * 1
      billboard(ctx, plus)
      ;(plus.material as THREE.MeshBasicMaterial).opacity = pulse(local)
    })
  })
  zzz(ctx, source, { color: '#bfdbfe', delay: 300, duration: 900, count: 2 })
  if (target !== source) aura(ctx, target, { color: '#7dff9a', delay: 300, duration: 800 })
  return 400
}

const slowbroPsychicTerrain: Choreography = (ctx, { source, target }) => {
  halo(ctx, source, { color: '#f472b6', direction: 'rise', duration: 500 })
  const terrain = new THREE.Group()
  terrain.add(new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), glow('#f472b6', 0.18)))
  const tiles: THREE.Mesh[] = []
  const spacing = 0.62
  for (let row = -3; row <= 3; row++) {
    for (let column = -3; column <= 3; column++) {
      const x = (column + (row % 2 ? 0.5 : 0)) * spacing
      const y = row * spacing * 0.866
      if (Math.hypot(x, y) > 2.1) continue
      const tile = new THREE.Mesh(hexagonGeometry(0.3, 0.25), glow('#f0abfc', 0.7))
      tile.position.set(x, y, 0.01)
      tiles.push(tile)
      terrain.add(tile)
    }
  }
  terrain.rotation.x = -Math.PI / 2
  fx(ctx, 100, 1600, terrain, (p, now) => {
    terrain.position.copy(source.root.position).setY(0.09)
    terrain.scale.setScalar(0.2 + 0.8 * easeOut(phase(p, 0, 0.25)))
    const fade = fadeInOut(p, 0.1, 0.3)
    tiles.forEach((tile) => {
      const ripple = 0.5 + 0.5 * Math.sin(now * 0.008 - tile.position.length() * 4)
      ;(tile.material as THREE.MeshBasicMaterial).opacity = (0.25 + 0.6 * ripple) * fade
    })
    ;((terrain.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.18 * fade
  })
  sigil(ctx, ground(source), {
    color: '#f0abfc',
    secondary: '#f9a8d4',
    radius: 1.2,
    points: 6,
    delay: 100,
    duration: 1300,
  })
  burst(ctx, ground(source), {
    color: '#fbcfe8',
    count: 24,
    spread: 'up',
    gravity: -0.6,
    speed: 1.2,
    delay: 300,
    duration: 1100,
    size: 0.1,
  })
  const guard = 450
  teamOf(ctx, source, target, 2.4).forEach((ally, index) => {
    const delay = guard + index * 60
    shell(ctx, ally, {
      color: '#f9a8d4',
      edge: '#fce7f3',
      radius: 0.64,
      detail: 2,
      delay,
      duration: 900,
    })
    flare(ctx, at(ally, 0.9), { color: '#f472b6', delay, size: 0.4 })
  })
  return guard
}

// ---------- Magnemite / Magneton / Magnezone ----------

const magnemiteThunderShock: Choreography = (ctx, { source, target }) => {
  fx(ctx, 0, 600, undefined, (p, now) => {
    source.pose.lift += Math.sin(Math.PI * p) * 0.15
    source.pose.offset.x += Math.sin(now * 0.08) * 0.02
  })
  const right = new THREE.Vector3()
  const left = new THREE.Vector3()
  const rightPoint = new THREE.Vector3()
  const magnet = (sign: number, out: THREE.Vector3) => () =>
    source.focusPoint(out, 0.55).addScaledVector(cameraRight(ctx, right), sign * 0.32)
  zap(ctx, magnet(-1, left), magnet(1, rightPoint), {
    color: PALE_YELLOW,
    delay: 40,
    duration: 180,
    segments: 4,
    jitter: 0.2,
  })
  zap(ctx, magnet(-1, left), magnet(1, rightPoint), {
    color: YELLOW,
    delay: 170,
    duration: 150,
    segments: 4,
    jitter: 0.2,
  })
  const fire = 260
  zap(ctx, at(source, 0.6), at(target), {
    color: YELLOW,
    delay: fire,
    duration: 260,
    segments: 10,
    jitter: 0.4,
  })
  zap(ctx, at(source, 0.6), at(target), {
    color: '#fffbe6',
    delay: fire + 30,
    duration: 200,
    segments: 10,
    jitter: 0.3,
  })
  const victims = inLine(ctx, source, target)
  let previous = target
  victims.forEach((victim, index) => {
    zap(ctx, at(previous), at(victim), {
      color: PALE_YELLOW,
      delay: fire + 60 * (index + 1),
      duration: 200,
      segments: 6,
    })
    burst(ctx, at(victim), { color: YELLOW, count: 8, delay: fire + 60 * (index + 1) })
    previous = victim
  })
  flinch(ctx, victims, fire + 60, 60)
  const hit = fire + 20
  burst(ctx, at(target), { color: '#fde047', count: 14, delay: hit })
  flare(ctx, at(target), { color: YELLOW, delay: hit, size: 0.45 })
  shockwave(ctx, ground(target), { color: YELLOW, delay: hit, radius: 0.8, duration: 300 })
  return hit
}

const TRI_COLORS = ['#f97316', '#7dd3fc', YELLOW]

function triangleMesh(): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 3, 1, Math.PI / 2), glow('#f8fafc', 0.85)),
  )
  TRI_COLORS.forEach((color, index) => {
    const orb = orbMesh(color, '#ffffff', 0.08)
    const angle = Math.PI / 2 + (index / 3) * Math.PI * 2
    orb.position.set(Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0)
    group.add(orb)
  })
  return group
}

const magnetonTriAttack: Choreography = (ctx, { source, target, shake: strength }) => {
  const dir = flatDirection(source, target)
  const front = new THREE.Vector3()
  const frontPoint = () => source.focusPoint(front, 0.6).addScaledVector(dir, 0.5)
  const aim = at(target)
  const charge = triangleMesh()
  fx(ctx, 80, 440, charge, (p, now) => {
    charge.position.copy(frontPoint())
    charge.lookAt(aim())
    charge.rotateZ(now * 0.008)
    charge.scale.setScalar(0.3 + 0.9 * easeOut(p))
    setOpacity(charge, fadeInOut(p, 0.15, 0.05))
  })
  zap(ctx, at(source, 0.6), frontPoint, {
    color: PALE_YELLOW,
    delay: 120,
    duration: 300,
    segments: 5,
    jitter: 0.2,
  })
  const flight = triangleMesh()
  const from = new THREE.Vector3()
  let resolved = false
  fx(ctx, 520, 300, flight, (p, now) => {
    if (!resolved) {
      from.copy(frontPoint())
      resolved = true
    }
    flight.position.lerpVectors(from, aim(), p)
    flight.lookAt(aim())
    flight.rotateZ(now * 0.03)
    flight.scale.setScalar(1.2)
  })
  const hit = 820
  burst(ctx, at(target), { color: TRI_COLORS[0], count: 14, delay: hit, speed: 2 })
  burst(ctx, at(target), { color: TRI_COLORS[1], count: 14, delay: hit, speed: 1.6 })
  spikes(ctx, ground(target), {
    color: '#bae6fd',
    count: 4,
    height: 0.7,
    delay: hit,
    duration: 600,
  })
  groundForks(ctx, target, PALE_YELLOW, hit, 2)
  flare(ctx, at(target), { color: '#f8fafc', delay: hit, size: 0.9, rays: 3 })
  shockwave(ctx, ground(target), { color: '#f8fafc', delay: hit, radius: 1.3 })
  const victims = inLine(ctx, source, target)
  victims.forEach((victim, index) =>
    burst(ctx, at(victim), {
      color: TRI_COLORS[index % 3],
      count: 12,
      delay: hit + 60 + index * 50,
    }),
  )
  flinch(ctx, victims, hit + 60, 50)
  cameraPunch(ctx, at(target), 0.45, hit - 50)
  shake(ctx, strength, hit)
  return hit
}

const magnezoneMagneticField: Choreography = (ctx, { source, target }) => {
  const field = new THREE.Group()
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.018, 6, 40),
      glow(index % 2 ? '#a5f3fc' : '#60a5fa', 0.85),
    )
    loop.position.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5)
    loop.rotation.y = -angle
    field.add(loop)
  }
  const sampler = bodyAt(source, 0.6)
  fx(ctx, 0, 1100, field, (p, now) => {
    field.position.copy(sampler())
    field.rotation.y = now * 0.003
    field.scale.setScalar(easeOut(phase(p, 0, 0.3)) * (1 + 0.05 * Math.sin(now * 0.02)))
    setOpacity(field, fadeInOut(p, 0.1, 0.25))
  })
  levitate(ctx, source, { duration: 1100, height: 0.35, wobble: 0.05 })
  const domeMaterial = glow('#38bdf8', 0.35)
  domeMaterial.wireframe = true
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMaterial,
  )
  fx(ctx, 200, 700, dome, (p) => {
    dome.position.copy(source.root.position).setY(0)
    dome.scale.setScalar(0.3 + easeOut(p) * 2)
    setOpacity(dome, 1 - p)
  })
  shockwave(ctx, ground(source), { color: '#7dd3fc', delay: 260, radius: 2.4 })
  const guard = 450
  teamOf(ctx, source, target, 2.4).forEach((ally, index) => {
    const delay = guard + index * 60
    orbit(ctx, ally, {
      color: '#93c5fd',
      count: 2,
      radius: 0.5,
      turns: 2,
      delay,
      duration: 900,
      build: () => ringMesh('#60a5fa', 0.14, 0.02),
    })
    if (ally !== source) {
      zap(ctx, at(source, 0.7), at(ally, 0.6), {
        color: '#bae6fd',
        delay: delay - 60,
        duration: 200,
        segments: 6,
        jitter: 0.2,
      })
    }
  })
  return guard
}

export const POKEMON_TIER_2_ULTIMATES: UltimateSet = {
  pikachu: pikachuElectroBall,
  raichu: raichuThunder,
  sandshrew: sandshrewDig,
  sandslash: sandslashEarthquake,
  vulpix: vulpixWillOWisp,
  'ninetales:Fire Spin': ninetalesFireSpin,
  'ninetales:Mystical Fire': ninetalesMysticalFire,
  jigglypuff: jigglypuffSing,
  'wigglytuff:Helping Hand': wigglytuffHelpingHand,
  'wigglytuff:Play Rough': wigglytuffPlayRough,
  zubat: zubatLeechLife,
  golbat: golbatPoisonFang,
  crobat: crobatCrossPoison,
  psyduck: psyduckConfusion,
  'golduck:Aqua Jet': golduckAquaJet,
  'golduck:Psychic': golduckPsychic,
  mankey: mankeyKarateChop,
  primeape: primeapeRageFist,
  annihilape: annihilapeShadowRageFist,
  growlithe: growlitheFlameWheel,
  'arcanine:Extreme Speed': arcanineExtremeSpeed,
  'arcanine:Flare Blitz': arcanineFlareBlitz,
  tentacool: tentacoolAcidSpray,
  tentacruel: tentacruelSludgeWave,
  geodude: geodudeRockThrow,
  graveler: gravelerRollout,
  golem: golemStealthRock,
  ponyta: ponytaFlameCharge,
  'rapidash:Fire Spin': rapidashFireSpin,
  'rapidash:Megahorn': rapidashMegahorn,
  slowpoke: slowpokeYawn,
  'slowbro:Slack Off': slowbroSlackOff,
  'slowbro:Psychic Terrain': slowbroPsychicTerrain,
  magnemite: magnemiteThunderShock,
  magneton: magnetonTriAttack,
  magnezone: magnezoneMagneticField,
}
