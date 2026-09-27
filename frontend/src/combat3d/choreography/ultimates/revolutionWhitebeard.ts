import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  dash,
  flare,
  glow,
  ground,
  halo,
  later,
  leafMesh,
  leap,
  lightning,
  orbit,
  pillar,
  prop,
  shake,
  shockwave,
  slashArc,
  spikes,
  spin,
  starGeometry,
  trail,
  vortex,
  type FxContext,
} from '../primitives'
import {
  airCracks,
  crossSlash,
  dragonClaw,
  fireFist,
  needleMesh,
  palmStrike,
  phoenixWings,
  rose,
} from '../kit/revolutionWhitebeard'
import {
  ahead,
  alliesAround,
  bodyAt,
  easeOut,
  enemiesAround,
  fistMesh,
  flag,
  flames,
  flatDirection,
  fx,
  groundCracks,
  motionScale,
  phase,
  pulse,
  shell,
  standard,
} from '../kit/shared'
import type { Choreography, UltimateSet } from '../types'

const FIRE = '#fbbf24'
const WATER = '#38bdf8'

const distance = (a: UnitView, b: UnitView): number => a.root.position.distanceTo(b.root.position)

function hitWave(
  ctx: FxContext,
  victims: UnitView[],
  delayOf: (view: UnitView) => number,
  color: string,
): void {
  victims.forEach((victim) => {
    const delay = delayOf(victim)
    burst(ctx, at(victim), { color, count: 10, delay, speed: 1.6 })
    later(ctx, delay, () => victim.onHit(ctx.now + delay))
  })
}

// Support moves: the event target leads, then the caster and allies in range.
function supportGroup(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  radius: number,
  limit: number,
): UnitView[] {
  return [
    target,
    ...alliesAround(ctx, source, radius, limit + 1).filter((view) => view !== target),
  ].slice(0, limit)
}

const aceFireFist: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const motion = motionScale(ctx)
  fx(ctx, 0, 700, undefined, (p) => {
    const windup = pulse(phase(p, 0, 0.45))
    source.pose.scale *= 1 - 0.12 * windup + 0.12 * pulse(phase(p, 0.42, 1))
    source.pose.lift -= 0.06 * windup
    source.pose.tilt += 0.25 * windup * motion
  })
  aura(ctx, source, { color: primary, duration: 700, count: 26 })
  flames(ctx, ground(source), {
    color: primary,
    core: FIRE,
    count: 8,
    radius: 0.35,
    height: 1.1,
    duration: 800,
  })
  chargeOrb(ctx, ahead(source, target, 0.35), {
    color: primary,
    core: FIRE,
    size: 0.3,
    count: 22,
    duration: 320,
  })
  cameraPunch(ctx, at(source), 0.35, 0)
  const launch = 300
  const travel = 380
  fireFist(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: launch,
    travel,
    duration: travel + 520,
    scale: 1.1,
  })
  const impact = launch + travel
  cameraPunch(ctx, at(target), 0.6, impact - 40)
  pillar(ctx, ground(target), {
    color: primary,
    delay: impact,
    duration: 900,
    height: 4,
    radius: 0.75,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.6, thickness: 0.35 })
  shockwave(ctx, ground(target), { color: FIRE, delay: impact + 110, radius: 1.8 })
  burst(ctx, at(target), { color: FIRE, count: 44, delay: impact, speed: 3.4 })
  cloud(ctx, ground(target), {
    color: '#44403c',
    count: 7,
    radius: 0.8,
    size: 0.4,
    rise: 0.9,
    delay: impact + 150,
    duration: 1100,
  })
  flames(ctx, ground(target), {
    color: primary,
    core: FIRE,
    count: 12,
    radius: 1.1,
    height: 0.9,
    delay: impact,
    duration: 1100,
  })
  shake(ctx, Math.max(strength, 7), impact, 420)
  const splash = enemiesAround(ctx, source, target, 2.9).slice(0, 6)
  hitWave(ctx, splash, (enemy) => impact + 60 + distance(enemy, target) * 50, primary)
  return impact
}

const whitebeardQuake: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const motion = motionScale(ctx)
  const direction = flatDirection(source, target)
  const charge = 500
  const impact = 560
  fx(ctx, 0, 1000, undefined, (p) => {
    const rear = easeOut(phase(p, 0, 0.45)) * (1 - phase(p, 0.48, 0.56))
    const thrust = pulse(phase(p, 0.48, 0.9))
    source.pose.offset.addScaledVector(direction, (-0.22 * rear + 0.4 * thrust) * motion)
    source.pose.lift += 0.18 * rear * motion
    source.pose.scale *= 1 + 0.12 * rear + 0.08 * thrust
  })
  aura(ctx, source, { color: secondary, duration: 900, count: 26 })
  const fistPoint = ahead(source, target, 0.55, 0.6)
  const fist = fistMesh(0.42, () =>
    standard('#e8b98f', { emissive: secondary, emissiveIntensity: 0.25 }),
  )
  const holder = new THREE.Group()
  holder.add(fist)
  const fistAt = new THREE.Vector3()
  fx(ctx, 80, 900, holder, (p, now) => {
    const windup = easeOut(phase(p, 0, 0.45))
    const thrust = phase(p, 0.47, 0.55)
    fistAt
      .copy(fistPoint())
      .addScaledVector(direction, -0.35 * windup * (1 - thrust) + 0.2 * easeOut(thrust))
    holder.position.copy(fistAt)
    holder.position.y += 0.02 * Math.sin(now * 0.08) * windup
    holder.lookAt(fistAt.x + direction.x, fistAt.y, fistAt.z + direction.z)
    holder.scale.setScalar(0.6 + 0.4 * easeOut(phase(p, 0, 0.2)) - phase(p, 0.85, 1) + 0.001)
  })
  // The quake bubble: a pale sphere that swallows the fist, then a wireframe shell that shudders before the punch.
  chargeOrb(ctx, fistPoint, {
    color: '#e0f2fe',
    core: '#ffffff',
    size: 0.62,
    count: 30,
    delay: 80,
    duration: charge - 60,
  })
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.66, 2),
    new THREE.MeshBasicMaterial({
      color: secondary,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  fx(ctx, 160, charge - 140, shell, (p, now) => {
    shell.position.copy(fistPoint())
    const jitter = 1 + 0.07 * Math.sin(now * 0.09) * p
    shell.scale.set(jitter * easeOut(p), (2 - jitter) * easeOut(p), jitter * easeOut(p))
    shell.rotation.set(now * 0.003, now * 0.004, 0)
    ;(shell.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.5 * p
  })
  cameraPunch(ctx, fistPoint, 0.8, charge - 40)
  airCracks(ctx, fistPoint, {
    color: '#ffffff',
    delay: impact,
    duration: 1100,
    radius: 2.4,
    rays: 11,
    width: 0.06,
    grow: 0.12,
  })
  airCracks(ctx, fistPoint, {
    color: secondary,
    delay: impact + 50,
    duration: 1000,
    radius: 3.4,
    rays: 7,
    width: 0.04,
    grow: 0.18,
  })
  groundCracks(ctx, ground(source), {
    color: '#cbd5e1',
    count: 8,
    length: 3.4,
    width: 0.09,
    delay: impact + 40,
    duration: 1400,
  })
  shockwave(ctx, ground(source), {
    color: primary,
    delay: impact,
    radius: 6.5,
    duration: 850,
    thickness: 0.45,
  })
  shockwave(ctx, ground(source), {
    color: secondary,
    delay: impact + 120,
    radius: 5,
    duration: 850,
    thickness: 0.32,
  })
  shockwave(ctx, fistPoint, {
    color: '#ffffff',
    delay: impact,
    radius: 3.2,
    duration: 420,
    thickness: 0.2,
    height: 0.7,
  })
  burst(ctx, ground(source), {
    color: '#a8a29e',
    count: 36,
    delay: impact,
    speed: 3,
    spread: 'ring',
    gravity: 0.4,
    size: 0.2,
  })
  burst(ctx, fistPoint, { color: '#ffffff', count: 30, delay: impact, speed: 3.6 })
  shake(ctx, Math.max(strength, 9), impact, 900)
  shockwave(ctx, ground(source), {
    color: secondary,
    delay: impact + 650,
    radius: 3,
    duration: 500,
  })
  shake(ctx, 5, impact + 650, 380)
  const victims = [
    target,
    ...enemiesAround(ctx, source, source, 2.9).filter((enemy) => enemy !== target),
  ].slice(0, 5)
  const delayOf = (enemy: UnitView) => impact + distance(enemy, source) * 60
  fx(ctx, impact, 900, undefined, (p) => {
    victims.forEach((victim, index) => {
      const jolt = pulse(phase(phase(p, (delayOf(victim) - impact) / 900, 1), 0, 0.5)) * motion
      victim.pose.tilt += (index % 2 === 0 ? 0.35 : -0.35) * jolt
      victim.pose.lift += 0.3 * jolt
      victim.pose.offset.addScaledVector(direction, 0.25 * jolt)
    })
  })
  hitWave(ctx, victims, delayOf, secondary)
  return delayOf(target)
}

const marcoPhoenix: Choreography = (ctx, { source, target, primary, secondary }) => {
  phoenixWings(ctx, source, { color: secondary, edge: FIRE, duration: 1500, span: 1.1 })
  leap(ctx, source, { duration: 1300, height: 0.75 * motionScale(ctx) })
  flames(ctx, ground(source), {
    color: primary,
    core: '#e0f2fe',
    count: 8,
    radius: 0.35,
    height: 0.9,
    duration: 1200,
  })
  burst(ctx, bodyAt(source, 0.8), { color: FIRE, count: 24, delay: 380, speed: 2.2, gravity: 0.3 })
  shockwave(ctx, ground(source), {
    color: primary,
    delay: 380,
    radius: 3.4,
    duration: 700,
    thickness: 0.25,
  })
  shockwave(ctx, ground(source), { color: FIRE, delay: 460, radius: 2.6, duration: 650 })
  const allies = supportGroup(ctx, source, target, 3.2, 5)
  allies.forEach((ally, index) => {
    const delay = 460 + index * 80
    flames(ctx, ground(ally), {
      color: primary,
      core: '#dbeafe',
      count: 7,
      radius: 0.32,
      height: 0.85,
      delay,
      duration: 1000,
    })
    halo(ctx, ally, { color: FIRE, delay: delay + 120, duration: 700 })
  })
  return 460
}

const saboDragonClaw: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  fx(ctx, 0, 260, undefined, (p) => {
    source.pose.scale *= 1 - 0.12 * pulse(p)
    source.pose.tilt -= 0.3 * pulse(p) * motionScale(ctx)
  })
  aura(ctx, source, { color: primary, duration: 600, count: 20 })
  flames(ctx, ground(source), {
    color: primary,
    core: secondary,
    count: 6,
    radius: 0.25,
    height: 0.9,
    duration: 650,
  })
  if (!ctx.reducedMotion) {
    dash(ctx, source, target, { delay: 260, duration: 800, hold: 0.35 })
    leap(ctx, source, { delay: 260, duration: 500, height: 0.6 })
    trail(ctx, source, { color: primary, delay: 260, duration: 520 })
  }
  dragonClaw(ctx, target, { color: primary, core: FIRE, delay: 200, duration: 1000, size: 1.25 })
  const impact = 200 + 550
  cameraPunch(ctx, at(target), 0.55, impact - 60)
  fx(ctx, impact, 420, undefined, (p) => {
    target.pose.scale *= 1 - 0.22 * pulse(p)
    target.pose.lift -= 0.12 * pulse(p)
  })
  groundCracks(ctx, ground(target), {
    color: primary,
    count: 7,
    length: 1.4,
    width: 0.08,
    delay: impact,
    duration: 1000,
  })
  flames(ctx, ground(target), {
    color: primary,
    core: FIRE,
    count: 11,
    radius: 0.8,
    height: 1.2,
    delay: impact,
    duration: 1000,
  })
  pillar(ctx, ground(target), {
    color: primary,
    delay: impact,
    duration: 600,
    height: 2.2,
    radius: 0.5,
  })
  burst(ctx, at(target), { color: FIRE, count: 34, delay: impact, speed: 2.8 })
  shockwave(ctx, ground(target), { color: secondary, delay: impact, radius: 1.8 })
  shake(ctx, Math.max(strength, 5), impact, 360)
  return impact
}

const dragonStormBringer: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const motion = motionScale(ctx)
  fx(ctx, 0, 1500, undefined, (p) => {
    const raise = easeOut(phase(p, 0, 0.2)) * (1 - phase(p, 0.85, 1))
    source.pose.lift += 0.25 * raise * motion
    source.pose.scale *= 1 + 0.1 * raise
  })
  aura(ctx, source, { color: primary, duration: 1100, count: 24 })
  burst(ctx, ground(source), {
    color: secondary,
    count: 22,
    speed: 2.4,
    spread: 'ring',
    gravity: 0,
  })
  const eye = new THREE.Vector3()
  const stormTop = () => eye.copy(target.root.position).setY(4.4)
  cloud(ctx, stormTop, {
    color: '#1e293b',
    count: 9,
    radius: 1.8,
    size: 0.7,
    rise: 0,
    opacity: 0.7,
    delay: 100,
    duration: 1700,
  })
  vortex(ctx, ground(target), {
    color: primary,
    secondary,
    height: 4.2,
    radius: 1.5,
    rings: 10,
    delay: 200,
    duration: 1500,
  })
  vortex(ctx, ground(target), {
    color: secondary,
    secondary: '#e2e8f0',
    height: 3.2,
    radius: 0.9,
    rings: 7,
    delay: 260,
    duration: 1400,
  })
  burst(ctx, ground(target), {
    color: '#94a3b8',
    count: 30,
    delay: 250,
    duration: 1200,
    speed: 1.2,
    spread: 'up',
    gravity: -1.2,
  })
  shockwave(ctx, ground(target), { color: secondary, delay: 200, radius: 2.8, duration: 900 })
  const victims = [target, ...enemiesAround(ctx, source, target, 2.9)].slice(0, 6)
  const impact = 600
  fx(ctx, 350, 1050, undefined, (p) => {
    const hoist = easeOut(phase(p, 0, 0.35)) * (1 - phase(p, 0.72, 0.86))
    victims.forEach((victim, index) => {
      victim.pose.lift += (0.8 + (index % 3) * 0.2) * hoist * motion
      victim.pose.spin += p * Math.PI * 4 * hoist * motion
    })
  })
  ;[0, 1, 2].forEach((index) => {
    const victim = victims[index % victims.length]
    lightning(ctx, victim, {
      color: index === 1 ? '#e0f2fe' : secondary,
      delay: 520 + index * 170,
      duration: 220,
      jitter: 0.5,
    })
  })
  shake(ctx, Math.max(strength, 6), impact, 700)
  cameraPunch(ctx, at(target), 0.45, 300)
  hitWave(ctx, victims, (victim) => impact + distance(victim, target) * 40, secondary)
  const drop = 350 + 1050 * 0.86
  shockwave(ctx, ground(target), { color: primary, delay: drop, radius: 3, thickness: 0.3 })
  burst(ctx, ground(target), {
    color: '#94a3b8',
    count: 26,
    delay: drop,
    speed: 2.4,
    spread: 'ring',
    gravity: 0.3,
  })
  shake(ctx, 4, drop, 300)
  return impact
}

const ivankovHormone: Choreography = (ctx, { source, target, primary, secondary }) => {
  if (!ctx.reducedMotion) spin(ctx, source, { duration: 520, turns: 1 })
  fx(ctx, 0, 700, undefined, (p) => {
    source.pose.scale *= 1 + 0.15 * pulse(phase(p, 0.3, 1))
  })
  orbit(ctx, source, {
    color: secondary,
    count: 8,
    radius: 0.55,
    turns: 1.2,
    collapse: 2,
    duration: 900,
    build: (index) =>
      new THREE.Mesh(starGeometry(4, 0.13, 0.03), glow(index % 2 === 0 ? secondary : '#fde047')),
  })
  shockwave(ctx, ground(source), { color: secondary, delay: 300, radius: 3.2, duration: 700 })
  burst(ctx, bodyAt(source, 0.7), { color: secondary, count: 20, delay: 360, speed: 2 })
  const allies = supportGroup(ctx, source, target, 3.2, 5)
  const injectAt = (index: number) => 420 + index * 70 + 180
  allies.forEach((ally, index) => {
    if (ally !== source) {
      prop(ctx, source, ally, {
        build: () => needleMesh(secondary, '#f8fafc'),
        delay: 420 + index * 70,
        duration: 180,
        arc: 0.35,
        from: bodyAt(source, 0.65),
      })
    }
    aura(ctx, ally, { color: primary, delay: injectAt(index), duration: 900, count: 18 })
    flare(ctx, at(ally, 0.6), {
      color: secondary,
      core: '#fdf4ff',
      size: 0.5,
      delay: injectAt(index),
      duration: 320,
    })
  })
  return injectAt(0)
}

const beloBettyInspiration: Choreography = (ctx, { source, target, primary, secondary }) => {
  flag(ctx, source, { color: primary, stripe: '#fef3c7', duration: 1500 })
  fx(ctx, 0, 1200, undefined, (p) => {
    source.pose.lift += 0.12 * pulse(phase(p, 0, 0.3))
    source.pose.tilt += 0.18 * Math.sin(phase(p, 0.2, 0.8) * Math.PI * 3) * motionScale(ctx)
  })
  aura(ctx, source, { color: primary, duration: 1100, count: 24 })
  shockwave(ctx, ground(source), {
    color: primary,
    delay: 340,
    radius: 5,
    duration: 800,
    thickness: 0.22,
  })
  shockwave(ctx, ground(source), {
    color: secondary,
    delay: 560,
    radius: 4,
    duration: 750,
    thickness: 0.18,
  })
  const allies = supportGroup(ctx, source, target, 5.5, 6)
  const delayOf = (ally: UnitView) => 420 + distance(ally, source) * 60
  fx(ctx, 420, 900, undefined, (p) => {
    allies.forEach((ally) => {
      const pump = pulse(phase(phase(p, (delayOf(ally) - 420) / 900, 1), 0, 0.45))
      ally.pose.scale *= 1 + 0.16 * pump
      ally.pose.lift += 0.1 * pump
    })
  })
  allies.forEach((ally) => {
    const delay = delayOf(ally)
    aura(ctx, ally, { color: primary, delay, duration: 850, count: 16, radius: 0.45 })
    burst(ctx, ground(ally), {
      color: secondary,
      count: 12,
      delay,
      speed: 1.8,
      spread: 'up',
      gravity: 0.2,
    })
  })
  return delayOf(target)
}

const koalaKarate: Choreography = (ctx, { source, target, primary, secondary }) => {
  const punch = 280
  fx(ctx, 0, 600, undefined, (p) => {
    const stance = pulse(phase(p, 0, 0.47))
    source.pose.scale *= 1 - 0.12 * stance + 0.1 * pulse(phase(p, 0.45, 0.8))
    source.pose.lift -= 0.08 * stance
  })
  chargeOrb(ctx, ahead(source, target, 0.3, 0.5), {
    color: WATER,
    core: secondary,
    size: 0.2,
    count: 16,
    duration: punch,
  })
  ;[0, 1, 2].forEach((ring) =>
    shockwave(ctx, ground(source), {
      color: ring === 1 ? primary : WATER,
      delay: punch + ring * 130,
      radius: 2.8 - ring * 0.3,
      duration: 800,
      thickness: 0.12,
    }),
  )
  burst(ctx, ground(source), {
    color: '#e0f2fe',
    count: 22,
    delay: punch,
    speed: 2,
    spread: 'up',
    gravity: 2.2,
  })
  shockwave(ctx, bodyAt(source, 0.5), {
    color: primary,
    delay: punch,
    radius: 1.2,
    duration: 380,
    height: 0.6,
  })
  const allies = supportGroup(ctx, source, target, 2.9, 5)
  const delayOf = (ally: UnitView) => punch + 100 + distance(ally, source) * 90
  allies.forEach((ally) => {
    const delay = delayOf(ally)
    halo(ctx, ally, { color: WATER, delay, duration: 650, radius: 0.55 })
    aura(ctx, ally, { color: primary, delay: delay + 100, duration: 800, count: 14 })
  })
  return delayOf(target)
}

const hackFishmanPunch: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const direction = flatDirection(source, target)
  chargeOrb(ctx, ahead(source, target, 0.35, 0.6), {
    color: WATER,
    core: secondary,
    size: 0.26,
    count: 18,
    duration: 300,
  })
  fx(ctx, 0, 620, undefined, (p) => {
    source.pose.scale *= 1 - 0.1 * pulse(phase(p, 0, 0.45))
    source.pose.offset.addScaledVector(direction, 0.3 * pulse(phase(p, 0.45, 1)) * motionScale(ctx))
  })
  palmStrike(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: 280,
    duration: 340,
    scale: 1.1,
    impact: 0.4,
  })
  const impact = 280 + 136
  cameraPunch(ctx, at(target), 0.3, impact - 40)
  burst(ctx, at(target), {
    color: WATER,
    count: 26,
    delay: impact,
    speed: 2.4,
    spread: 'up',
    gravity: 3,
  })
  burst(ctx, at(target), { color: '#f0f9ff', count: 14, delay: impact, speed: 1.6 })
  shockwave(ctx, ground(target), { color: WATER, delay: impact, radius: 1.3, duration: 500 })
  shockwave(ctx, ground(target), {
    color: primary,
    delay: impact + 120,
    radius: 0.9,
    duration: 450,
  })
  shake(ctx, strength, impact, 240)
  return impact
}

const thatchDualBlade: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  fx(ctx, 0, 240, undefined, (p) => {
    source.pose.scale *= 1 - 0.1 * pulse(p)
  })
  if (!ctx.reducedMotion) {
    dash(ctx, source, target, { delay: 200, duration: 560, through: true, hold: 0.2 })
    trail(ctx, source, { color: primary, delay: 200, duration: 360 })
  }
  const impact = 330
  slashArc(ctx, at(target), { color: primary, delay: 270, angle: -2.2, radius: 0.55, sweep: 1.2 })
  slashArc(ctx, at(target), { color: secondary, delay: 300, angle: 0.9, radius: 0.55, sweep: 1.2 })
  crossSlash(ctx, at(target), {
    color: primary,
    core: '#f0fdfa',
    delay: impact,
    duration: 620,
    length: 1.7,
  })
  flare(ctx, at(target), { color: secondary, size: 0.6, delay: impact, duration: 260 })
  burst(ctx, at(target), { color: secondary, count: 22, delay: impact + 60, speed: 2.2 })
  shake(ctx, strength, impact + 60, 220)
  return impact
}

// Diamond Defense is a self-buff: the event target is Jozu himself.
const jozuDiamond: Choreography = (ctx, { target: self, primary, secondary }) => {
  fx(ctx, 0, 1300, undefined, (p) => {
    const brace = pulse(phase(p, 0, 0.3))
    const harden = easeOut(phase(p, 0.1, 0.35)) * (1 - phase(p, 0.8, 1))
    self.pose.scale *= 1 - 0.1 * brace + 0.14 * harden
    self.pose.lift -= 0.05 * brace
  })
  chargeOrb(ctx, bodyAt(self, 0.5), {
    color: secondary,
    core: '#ffffff',
    size: 0.35,
    count: 16,
    duration: 260,
  })
  shell(ctx, self, {
    color: primary,
    edge: '#ffffff',
    radius: 0.66,
    detail: 0,
    material: 'crystal',
    delay: 120,
    duration: 1300,
  })
  spikes(ctx, ground(self), {
    color: secondary,
    count: 9,
    radius: 0.8,
    height: 0.65,
    width: 0.1,
    tilt: 0.45,
    solid: true,
    delay: 180,
    duration: 1000,
  })
  shockwave(ctx, ground(self), { color: primary, delay: 180, radius: 1.6, duration: 500 })
  burst(ctx, bodyAt(self, 0.6), {
    color: '#f0f9ff',
    count: 18,
    delay: 420,
    speed: 1.6,
    gravity: 0.2,
  })
  flare(ctx, at(self, 0.9), {
    color: secondary,
    core: '#ffffff',
    size: 0.55,
    delay: 440,
    duration: 300,
  })
  return 420
}

const vistaFlowerSword: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const colors = [primary, secondary, '#be123c']
  const petal = (index: number) => leafMesh(colors[index % colors.length], 0.12)
  rose(ctx, ground(source), { color: '#be123c', inner: secondary, duration: 1400, size: 2.6 })
  orbit(ctx, source, {
    color: primary,
    count: 14,
    radius: 0.8,
    heightFactor: 0.35,
    turns: 1.6,
    duration: 650,
    build: petal,
  })
  if (!ctx.reducedMotion) spin(ctx, source, { delay: 280, duration: 420, turns: 1 })
  ;[-2.4, -1.2, 0, 1.2, 2.4, 3.6].forEach((angle, index) =>
    slashArc(ctx, bodyAt(source, 0.55), {
      color: index % 2 === 0 ? primary : secondary,
      delay: 300 + index * 45,
      angle,
      radius: 0.95,
      width: 0.16,
      sweep: 1.3,
    }),
  )
  const impact = 560
  orbit(ctx, source, {
    color: primary,
    count: 16,
    radius: 0.7,
    heightFactor: 0.4,
    turns: 0.6,
    collapse: 3.2,
    delay: impact,
    duration: 800,
    build: petal,
  })
  shockwave(ctx, ground(source), { color: secondary, delay: impact, radius: 1.8 })
  shake(ctx, strength, impact, 260)
  const victims = [
    target,
    ...enemiesAround(ctx, source, source, 1.5).filter((enemy) => enemy !== target),
  ].slice(0, 5)
  victims.forEach((victim, index) =>
    slashArc(ctx, at(victim), {
      color: primary,
      delay: impact - 40 + index * 30,
      angle: index * 1.1,
      radius: 0.5,
      sweep: 1.6,
    }),
  )
  hitWave(ctx, victims.slice(1), () => impact + 40, secondary)
  return impact
}

export const REVOLUTION_WHITEBEARD_ULTIMATES: UltimateSet = {
  hack_v1: hackFishmanPunch,
  koala_v1: koalaKarate,
  belo_betty_v1: beloBettyInspiration,
  ivankov_v1: ivankovHormone,
  sabo_v1: saboDragonClaw,
  dragon_v1: dragonStormBringer,
  thatch_v1: thatchDualBlade,
  jozu_v1: jozuDiamond,
  vista_v1: vistaFlowerSword,
  ace_v1: aceFireFist,
  marco_v1: marcoPhoenix,
  whitebeard_v1: whitebeardQuake,
}
