import * as THREE from 'three'
import {
  SKIN,
  bandageWrap,
  climaTact,
  jollyRogerEmblem,
  katanaMesh,
  medicalCross,
  radialSlashes,
  rubberArm,
  rumbleBallMesh,
  sproutArms,
  soulGhost,
  soulWisps,
  rapier,
  stunSparks,
  waterDrill,
} from '../kit/strawHats'
import {
  alliesAround,
  ahead,
  beyond,
  bodyAt,
  enemiesAround,
  enemiesInLine,
  flag,
  flames,
  flinch,
  groundCracks,
  rayBeam,
  shiver,
  squash,
  statArrows,
  starPower,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  crouch,
  dash,
  flare,
  ground,
  halo,
  leap,
  lightning,
  orbit,
  pillar,
  projectile,
  prop,
  pushBack,
  shake,
  shockwave,
  sigil,
  slashArc,
  spikes,
  spin,
  swarm,
  trail,
  vortex,
  orbMesh,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'
import type { UnitView } from '../../unitView'

const withTarget = (target: UnitView, others: UnitView[], limit: number): UnitView[] =>
  [target, ...others.filter((other) => other !== target)].slice(0, limit)

// Gum Gum Pistol: the arm stretches far behind Luffy, then snaps a huge fist into the target.
const luffyPistol: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const power = starPower(source)
  crouch(ctx, source, { duration: 460 })
  burst(ctx, ground(source), {
    color: '#d6d3d1',
    count: 10,
    delay: 80,
    speed: 0.9,
    spread: 'ring',
    gravity: 0,
  })
  const impact = rubberArm(ctx, source, target, {
    fist: SKIN,
    duration: 1000,
    windUp: 0.46,
    windBack: 1.7,
    fistSize: 0.2 * power,
    thickness: 0.075,
    recoil: true,
  })
  trail(ctx, source, { color: primary, delay: impact - 150, duration: 260 })
  cameraPunch(ctx, at(target), 0.6, impact - 110)
  flare(ctx, at(target), {
    color: primary,
    core: secondary,
    size: 1.0 * power,
    rays: 8,
    delay: impact,
    duration: 320,
  })
  burst(ctx, at(target), { color: secondary, count: 26, delay: impact, speed: 2.6 })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.7 })
  shockwave(ctx, ground(target), {
    color: '#ffffff',
    delay: impact + 70,
    radius: 1.0,
    duration: 450,
  })
  pushBack(ctx, target, ground(source), { delay: impact, duration: 520, distance: 0.6, lift: 0.15 })
  cloud(ctx, ground(target), {
    color: '#a8a29e',
    delay: impact + 40,
    radius: 0.5,
    rise: 0.3,
    opacity: 0.45,
  })
  shake(ctx, strength, impact, 340)
  return impact
}

// 360 Pound Cannon: three swords whirl around Zoro, then a spinning slash cannon blasts out in every direction.
const zoroCannon: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 260 })
  orbit(ctx, source, {
    color: primary,
    count: 3,
    radius: 0.52,
    heightFactor: 0.5,
    turns: 3,
    build: (index) => katanaMesh(index, primary),
    duration: 720,
  })
  if (!ctx.reducedMotion) spin(ctx, source, { delay: 200, duration: 620, turns: 2 })
  vortex(ctx, ground(source), {
    color: primary,
    secondary,
    height: 1.8,
    radius: 0.9,
    delay: 240,
    duration: 820,
  })
  aura(ctx, source, { color: primary, duration: 640 })
  cameraPunch(ctx, at(source), 0.45, 480)
  const release = 640
  radialSlashes(ctx, at(source, 0.5), {
    color: primary,
    core: secondary,
    count: 6,
    radius: 2.3,
    delay: release,
    duration: 460,
    twist: 2.6,
  })
  radialSlashes(ctx, at(source, 0.5), {
    color: secondary,
    core: primary,
    count: 3,
    radius: 1.6,
    delay: release + 80,
    duration: 400,
    twist: -2,
  })
  shockwave(ctx, ground(source), { color: primary, delay: release, radius: 2.1 })
  groundCracks(ctx, ground(source), { color: primary, count: 6, length: 1.3, delay: release })
  const impact = release + 140
  const victims = withTarget(target, enemiesAround(ctx, source, source, 1.6), 4)
  victims.forEach((victim, index) => {
    slashArc(ctx, at(victim), {
      color: secondary,
      delay: impact,
      radius: 0.6,
      angle: -1.2 + index * 0.9,
    })
    burst(ctx, at(victim), { color: primary, count: 14, delay: impact, speed: 2 })
  })
  flinch(ctx, victims.slice(1), impact)
  shake(ctx, strength, impact, 320)
  return impact
}

// Diable Jambe: Sanji spins until his leg ignites, then leaps in with a blazing kick that erupts into flame.
const sanjiDiableJambe: Choreography = (ctx, { source, target, shake: strength }) => {
  const foot = bodyAt(source, 0)
  const leg = new THREE.Vector3()
  flames(ctx, () => leg.copy(foot()).setY(foot().y + 0.05), {
    color: '#f97316',
    core: '#fde047',
    count: 6,
    radius: 0.16,
    height: 0.65,
    duration: 1180,
  })
  if (!ctx.reducedMotion) spin(ctx, source, { duration: 620, turns: 3 })
  pillar(ctx, ground(source), {
    color: '#f97316',
    delay: 100,
    duration: 600,
    height: 1.4,
    radius: 0.3,
  })
  burst(ctx, at(source, 0.2), {
    color: '#fb923c',
    count: 18,
    spread: 'up',
    speed: 1.6,
    delay: 200,
    duration: 700,
  })
  if (!ctx.reducedMotion) {
    dash(ctx, source, target, { delay: 620, duration: 700, hold: 0.3 })
    leap(ctx, source, { delay: 620, duration: 700, height: 0.7 })
  }
  trail(ctx, source, { color: '#f97316', delay: 620, duration: 480 })
  const impact = 760
  slashArc(ctx, at(target), {
    color: '#f97316',
    delay: impact,
    angle: -2.2,
    radius: 0.75,
    width: 0.2,
    sweep: 1.8,
  })
  slashArc(ctx, at(target), {
    color: '#fde047',
    delay: impact + 70,
    angle: 0.9,
    radius: 0.9,
    width: 0.16,
    sweep: 1.6,
  })
  flare(ctx, at(target), { color: '#f97316', core: '#fde047', size: 0.85, rays: 6, delay: impact })
  spikes(ctx, ground(target), {
    color: '#f97316',
    count: 10,
    radius: 1.1,
    height: 0.9,
    width: 0.12,
    tilt: 0.45,
    delay: impact + 20,
    duration: 650,
  })
  shockwave(ctx, ground(target), { color: '#fbbf24', delay: impact, radius: 1.8 })
  burst(ctx, at(target), { color: '#fde047', count: 24, delay: impact, speed: 2.4 })
  const neighbors = enemiesAround(ctx, source, target, 1.6).slice(0, 3)
  neighbors.forEach((enemy) =>
    burst(ctx, at(enemy), { color: '#f97316', count: 10, delay: impact + 60, speed: 1.6 }),
  )
  flinch(ctx, neighbors, impact + 60)
  cloud(ctx, ground(target), {
    color: '#44403c',
    delay: impact + 150,
    radius: 0.6,
    rise: 0.6,
    opacity: 0.4,
    duration: 650,
  })
  cameraPunch(ctx, at(target), 0.5, impact - 60)
  shake(ctx, strength, impact, 300)
  return impact
}

// Thunderbolt Tempo: Nami twirls the Clima-Tact, cool and heat bubbles build a thundercloud, lightning rakes the line.
const namiThunderboltTempo: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const victims = withTarget(
    target,
    enemiesInLine(ctx, source, target, { overshoot: 2, limit: 3 }),
    4,
  )
  const center = new THREE.Vector3()
  victims.forEach((victim) => center.add(victim.root.position))
  center.divideScalar(victims.length).setY(2.3)
  const spread = Math.max(
    ...victims.map((victim) => victim.root.position.distanceTo(target.root.position)),
  )
  const cloudPoint = () => center
  climaTact(ctx, source, { duration: 820 })
  prop(ctx, source, target, {
    build: () => orbMesh('#60a5fa', '#e0f2fe', 0.07),
    to: cloudPoint,
    arc: 0.4,
    delay: 120,
    duration: 420,
  })
  prop(ctx, source, target, {
    build: () => orbMesh('#f87171', '#fee2e2', 0.07),
    to: cloudPoint,
    arc: 0.7,
    delay: 200,
    duration: 420,
  })
  cloud(ctx, center, {
    color: '#1e293b',
    count: 8 + victims.length,
    radius: 0.8 + spread / 2,
    size: 0.42,
    rise: 0.1,
    opacity: 0.9,
    delay: 380,
    duration: 1050,
  })
  cloud(ctx, center, {
    color: '#475569',
    count: 5,
    radius: 0.5 + spread / 3,
    size: 0.3,
    rise: 0.15,
    opacity: 0.7,
    delay: 440,
    duration: 950,
  })
  const strike = 640
  lightning(ctx, victims[victims.length - 1], {
    color: primary,
    from: at(source, 0.3),
    delay: strike - 40,
    duration: 240,
    jitter: 0.3,
  })
  victims.forEach((victim, index) => {
    const delay = strike + index * 70
    const above = new THREE.Vector3(victim.root.position.x, 2.2, victim.root.position.z)
    lightning(ctx, victim, {
      color: secondary,
      from: above,
      delay,
      duration: 320,
      segments: 12,
      jitter: 0.45,
    })
    burst(ctx, at(victim), { color: '#fde047', count: 14, delay, speed: 2 })
    stunSparks(ctx, victim, { color: '#fde047', delay, duration: 950 })
  })
  flinch(ctx, victims.slice(1), strike + 70, 70)
  cameraPunch(ctx, at(target), 0.35, strike - 60)
  shake(ctx, strength, strike, 300)
  return strike
}

// I Got This!: Captain Usopp plants the Straw Hat flag and his rallying cry powers up nearby allies.
const usoppIGotThis: Choreography = (ctx, { source, primary, secondary }) => {
  leap(ctx, source, { duration: 450, height: 0.35 })
  flag(ctx, source, {
    color: '#111827',
    stripe: '#1f2937',
    emblem: jollyRogerEmblem,
    duration: 1400,
  })
  flare(ctx, at(source, 1.1), {
    color: '#fbbf24',
    core: '#fef3c7',
    size: 0.6,
    rays: 5,
    delay: 260,
    duration: 320,
  })
  shockwave(ctx, ground(source), { color: primary, delay: 280, radius: 2.3, duration: 700 })
  shockwave(ctx, ground(source), { color: secondary, delay: 400, radius: 1.5, duration: 600 })
  burst(ctx, at(source, 1), { color: '#fde047', count: 20, spread: 'up', speed: 1.8, delay: 280 })
  alliesAround(ctx, source, 2.5, 5).forEach((ally, index) => {
    const delay = 360 + index * 70
    if (ally !== source) {
      projectile(ctx, source, ally, {
        color: '#fbbf24',
        core: '#fef3c7',
        delay: delay - 200,
        duration: 220,
        arc: 0.8,
        size: 0.07,
      })
    }
    halo(ctx, ally, { color: '#fbbf24', direction: 'rise', delay, duration: 650 })
    statArrows(ctx, ally, { color: '#f59e0b', direction: 'rise', delay: delay + 80, duration: 800 })
    burst(ctx, at(ally, 0.8), { color: primary, count: 8, spread: 'up', speed: 1.2, delay })
  })
  return 300
}

// Emergency Treatment: Chopper pops a Rumble Ball, rushes to the patient and patches them up.
const chopperEmergencyTreatment: Choreography = (ctx, { source, target, primary }) => {
  const side = new THREE.Vector3()
  const hand = () => source.focusPoint(side, 0.35).add(new THREE.Vector3(0.3, 0, 0))
  prop(ctx, source, source, {
    build: rumbleBallMesh,
    from: hand,
    to: at(source, 0.62),
    arc: 0.9,
    spin: 10,
    duration: 420,
  })
  crouch(ctx, source, { delay: 380, duration: 260 })
  burst(ctx, at(source), { color: '#f472b6', count: 18, delay: 420, speed: 1.6 })
  shockwave(ctx, ground(source), { color: '#f9a8d4', delay: 420, radius: 1, duration: 400 })
  if (target !== source && !ctx.reducedMotion)
    dash(ctx, source, target, { delay: 480, duration: 700, hold: 0.35 })
  medicalCross(ctx, target, { color: primary, delay: 520, duration: 1100 })
  bandageWrap(ctx, target, { delay: 650, duration: 950 })
  aura(ctx, target, { color: '#86efac', delay: 700, duration: 900, count: 20 })
  halo(ctx, target, { color: '#4ade80', delay: 750, duration: 700 })
  burst(ctx, at(target), {
    color: '#bbf7d0',
    count: 14,
    spread: 'up',
    speed: 1.2,
    gravity: -0.2,
    delay: 900,
  })
  return 700
}

// Cien Fleur: Clutch: petals swirl in, arms bloom from the ground and the target's body, and clamp down.
const robinClutch: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 360 })
  aura(ctx, source, { color: secondary, duration: 700 })
  swarm(ctx, source, target, {
    color: '#f0abfc',
    count: 26,
    size: 0.1,
    travel: 0.35,
    duration: 1250,
  })
  sigil(ctx, ground(target), {
    color: primary,
    secondary,
    points: 5,
    radius: 0.85,
    delay: 150,
    duration: 1250,
  })
  const duration = 1250
  sproutArms(ctx, target, {
    petal: '#f0abfc',
    count: 6,
    radius: 0.55,
    delay: 200,
    duration,
    clutchAt: 0.33,
    cross: true,
  })
  const clutch = 200 + Math.round(duration * 0.33)
  squash(ctx, target, { delay: clutch - 40, duration: 900, amount: 0.1 })
  shiver(ctx, target, { delay: clutch, duration: 800, amount: 0.04 })
  cameraPunch(ctx, at(target), 0.5, clutch - 60)
  flare(ctx, at(target), { color: primary, core: '#fdf4ff', size: 0.7, rays: 5, delay: clutch })
  burst(ctx, at(target), { color: '#f0abfc', count: 22, delay: clutch, speed: 1.8 })
  burst(ctx, at(target, 0.3), {
    color: '#f0abfc',
    count: 18,
    delay: 1350,
    duration: 450,
    speed: 1.2,
    gravity: -0.2,
  })
  shake(ctx, strength, clutch, 220)
  return clutch
}

// Radical Beam: SUPER pose, the chest cannon charges, and a massive beam fires through the whole line.
const frankyRadicalBeam: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const victims = withTarget(
    target,
    enemiesInLine(ctx, source, target, { overshoot: 3, limit: 3 }),
    4,
  )
  const far = victims[victims.length - 1]
  const muzzle = ahead(source, target, 0.35, 0.6)
  leap(ctx, source, { duration: 360, height: 0.25 })
  flare(ctx, at(source, 0.9), {
    color: '#38bdf8',
    core: '#ffffff',
    size: 1.0,
    rays: 5,
    duration: 380,
  })
  aura(ctx, source, { color: secondary, duration: 620 })
  chargeOrb(ctx, muzzle, {
    color: primary,
    core: secondary,
    size: 0.3,
    count: 22,
    delay: 100,
    duration: 520,
  })
  shake(ctx, 1, 150, 420)
  const fire = 620
  rayBeam(ctx, muzzle, beyond(source, far, 0.8), {
    colors: [primary, secondary],
    core: '#ffffff',
    width: 0.26,
    rings: secondary,
    delay: fire,
    duration: 620,
  })
  flare(ctx, muzzle, { color: '#e0f2fe', size: 0.7, rays: 8, delay: fire })
  pushBack(ctx, source, ground(target), { delay: fire, duration: 500, distance: 0.3 })
  victims.forEach((victim, index) => {
    const delay = fire + 60 + index * 50
    burst(ctx, at(victim), { color: secondary, count: 20, delay, speed: 2.2 })
    shockwave(ctx, ground(victim), { color: primary, delay, radius: 0.9, duration: 400 })
  })
  flinch(ctx, victims.slice(1), fire + 110, 50)
  cloud(ctx, ground(target), {
    color: '#94a3b8',
    delay: fire + 400,
    radius: 0.5,
    rise: 0.5,
    opacity: 0.35,
    duration: 650,
  })
  cameraPunch(ctx, at(target), 0.55, fire - 40)
  shake(ctx, strength, fire, 450)
  return fire + 60
}

// Soul Solid: Brook's soul chills his blade, he glides through, and at the sheathe click everything nearby freezes.
const brookSoulSolid: Choreography = (ctx, { source, target, shake: strength }) => {
  soulWisps(ctx, source, { color: '#67e8f9', count: 5, duration: 1300 })
  soulGhost(ctx, source, { color: '#e0f2fe', duration: 1100 })
  aura(ctx, source, { color: '#a5f3fc', duration: 800 })
  rapier(ctx, source, target, { glow: '#22d3ee', mode: 'draw', delay: 100, duration: 450 })
  if (!ctx.reducedMotion)
    dash(ctx, source, target, { delay: 500, duration: 520, through: true, hold: 0.35 })
  trail(ctx, source, { color: '#a5f3fc', delay: 500, duration: 380 })
  slashArc(ctx, at(target), {
    color: '#e0f2fe',
    delay: 560,
    radius: 0.8,
    width: 0.06,
    angle: -0.4,
    sweep: 0.6,
    duration: 200,
  })
  const click = 900
  slashArc(ctx, at(target), {
    color: '#22d3ee',
    delay: click,
    duration: 380,
    radius: 1.1,
    width: 0.22,
    angle: -0.3,
    sweep: 0.5,
  })
  shockwave(ctx, ground(source), { color: '#a5f3fc', delay: click, radius: 1.9, duration: 700 })
  const victims = withTarget(target, enemiesAround(ctx, source, source, 1.6), 4)
  victims.forEach((victim, index) => {
    spikes(ctx, ground(victim), {
      color: '#bae6fd',
      solid: true,
      count: 6,
      radius: 0.45,
      height: 0.8,
      width: 0.1,
      delay: click + index * 40,
      duration: 850,
    })
    burst(ctx, at(victim), { color: '#e0f2fe', count: 14, delay: click, speed: 1.4, gravity: 0.5 })
  })
  flinch(ctx, victims.slice(1), click, 40)
  cameraPunch(ctx, at(target), 0.45, click - 80)
  shake(ctx, strength + 1, click, 300)
  return click
}

// Vagabond Drill: Jinbei gathers a whirlpool, then drives a spiralling water drill through the target.
const jinbeiVagabondDrill: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  vortex(ctx, ground(source), {
    color: primary,
    secondary,
    height: 1.3,
    radius: 0.6,
    rings: 5,
    duration: 650,
  })
  crouch(ctx, source, { duration: 400 })
  burst(ctx, at(source, 0.3), { color: secondary, count: 14, spread: 'up', speed: 1.3, delay: 100 })
  if (!ctx.reducedMotion) dash(ctx, source, target, { delay: 420, duration: 620, hold: 0.3 })
  const drillDelay = 380
  const drillDuration = 700
  waterDrill(ctx, source, target, {
    color: '#2563eb',
    core: '#a5f3fc',
    delay: drillDelay,
    duration: drillDuration,
  })
  const impact = drillDelay + drillDuration * 0.4
  flare(ctx, at(target), { color: '#38bdf8', core: '#ffffff', size: 0.9, rays: 6, delay: impact })
  burst(ctx, at(target), {
    color: secondary,
    count: 30,
    spread: 'up',
    speed: 2.4,
    gravity: 3,
    delay: impact,
  })
  shockwave(ctx, ground(target), { color: '#38bdf8', delay: impact, radius: 2 })
  shockwave(ctx, ground(target), { color: '#e0f2fe', delay: impact + 90, radius: 1.4 })
  pillar(ctx, ground(target), {
    color: '#3b82f6',
    delay: impact,
    duration: 600,
    height: 2.2,
    radius: 0.4,
  })
  pushBack(ctx, target, ground(source), { delay: impact, duration: 600, distance: 0.7, lift: 0.2 })
  const neighbors = enemiesAround(ctx, source, target, 1.6).slice(0, 3)
  neighbors.forEach((enemy) => {
    pushBack(ctx, enemy, ground(target), { delay: impact + 80, duration: 500, distance: 0.45 })
    burst(ctx, at(enemy), {
      color: secondary,
      count: 10,
      spread: 'up',
      speed: 1.6,
      delay: impact + 80,
    })
  })
  flinch(ctx, neighbors, impact + 80)
  cameraPunch(ctx, at(target), 0.55, impact - 80)
  shake(ctx, strength, impact, 380)
  return impact
}

export const STRAW_HATS_ULTIMATES: UltimateSet = {
  luffy_v1: luffyPistol,
  zoro_v1: zoroCannon,
  sanji_v1: sanjiDiableJambe,
  nami_v1: namiThunderboltTempo,
  usopp_v1: usoppIGotThis,
  chopper_v1: chopperEmergencyTreatment,
  robin_v1: robinClutch,
  franky_v1: frankyRadicalBeam,
  brook_v1: brookSoulSolid,
  jinbei_v1: jinbeiVagabondDrill,
}
