import * as THREE from 'three'
import type { AbilityEffectStyle } from '../../data/animationConfig'
import type { UnitView } from '../unitView'
import {
  at,
  aura,
  beam,
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
  later,
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
  swarm,
  trail,
  vortex,
  type FxContext,
} from './primitives'
import { enemiesAround, flinch, stream } from './kit/shared'
import type { Choreography } from './types'

function nearbyEnemies(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  radius: number,
  limit = 4,
) {
  return enemiesAround(ctx, source, target, radius).slice(0, limit)
}

function pointBetween(source: UnitView, target: UnitView, t: number): () => THREE.Vector3 {
  const point = new THREE.Vector3()
  return () => point.lerpVectors(source.root.position, target.root.position, t).setY(0.08)
}

// A flower opening at the target: petals rotate from a closed bud outward.
function bloom(
  ctx: FxContext,
  target: UnitView,
  petal: string,
  heart: string,
  delay: number,
): void {
  const group = new THREE.Group()
  const petals = 8
  for (let index = 0; index < petals; index++) {
    const pivot = new THREE.Group()
    const leaf = leafMesh(petal, 0.34)
    leaf.geometry.translate(0, 0, -0.3)
    pivot.add(leaf)
    pivot.rotation.y = (index / petals) * Math.PI * 2
    group.add(pivot)
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), glow(heart))
  core.position.y = 0.08
  group.add(core)
  ctx.effects.add({
    start: ctx.now + delay,
    duration: 900,
    priority: 'ability',
    object: group,
    update: (p) => {
      group.position.copy(target.root.position).setY(0.06)
      const open = Math.min(1, p * 3)
      group.children.forEach((child, index) => {
        if (child === core) return
        child.children[0].rotation.x = (1 - open) * 1.3
        child.rotation.y = (index / petals) * Math.PI * 2 + p * 0.8
      })
      group.scale.setScalar(0.6 + open * 0.8)
      const fade = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) (child.material as THREE.Material).opacity = fade
      })
    },
  })
}

const grassBloom: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 600, count: 16 })
  sigil(ctx, ground(source), { color: primary, secondary, radius: 0.7, duration: 700 })
  const leaves = 6
  for (let index = 0; index < leaves; index++) {
    const angle = (index / leaves) * Math.PI * 2
    prop(ctx, source, target, {
      build: () => leafMesh(index % 2 ? secondary : primary, 0.15),
      delay: 120 + index * 45,
      duration: 380,
      arc: 0.5,
      offset: new THREE.Vector3(Math.cos(angle) * 0.35, Math.sin(angle) * 0.25, 0),
      tumble: 16,
      spin: 3,
    })
  }
  const impact = 480
  spikes(ctx, ground(target), {
    color: primary,
    count: 7,
    radius: 0.6,
    height: 1.1,
    width: 0.06,
    tilt: 0.5,
    delay: impact,
    duration: 800,
  })
  bloom(ctx, target, '#f9a8d4', '#fde047', impact + 60)
  burst(ctx, at(target), {
    color: '#f9a8d4',
    count: 20,
    delay: impact + 120,
    speed: 1.5,
    gravity: 0.4,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.5 })
  flinch(ctx, nearbyEnemies(ctx, source, target, 1.6, 3), impact + 80, 40)
  shake(ctx, strength, impact)
  return impact
}

const fireStream: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  crouch(ctx, source, { duration: 220 })
  chargeOrb(ctx, at(source, 0.7), { color: primary, core: '#fde68a', duration: 220, size: 0.2 })
  aura(ctx, source, { color: primary, duration: 600 })
  const mouth = at(source, 0.65)
  stream(ctx, mouth, at(target), {
    color: primary,
    count: 44,
    size: 0.2,
    spread: 0.45,
    delay: 180,
    duration: 720,
    travel: 0.4,
  })
  stream(ctx, mouth, at(target), {
    color: '#fde68a',
    count: 18,
    size: 0.12,
    spread: 0.2,
    delay: 200,
    duration: 680,
    travel: 0.4,
  })
  projectile(ctx, source, target, {
    color: secondary,
    core: '#fde68a',
    delay: 180,
    duration: 280,
    size: 0.16,
    arc: 0.1,
  })
  const impact = 460
  flare(ctx, at(target), {
    color: primary,
    core: '#fef3c7',
    size: 0.7,
    rays: 8,
    delay: impact,
    duration: 300,
  })
  pillar(ctx, ground(target), {
    color: primary,
    delay: impact + 200,
    duration: 700,
    height: 2.4,
    radius: 0.45,
  })
  burst(ctx, at(target), { color: '#fbbf24', count: 26, delay: impact + 200, speed: 2.4 })
  burst(ctx, at(target, 0.3), {
    color: '#f97316',
    count: 14,
    delay: impact + 300,
    speed: 0.8,
    spread: 'up',
    gravity: -0.8,
  })
  cloud(ctx, at(target, 0.9), {
    color: '#292524',
    count: 5,
    radius: 0.4,
    delay: impact + 450,
    duration: 900,
    rise: 0.8,
  })
  shockwave(ctx, ground(target), { color: secondary, delay: impact + 200, radius: 1.3 })
  shake(ctx, strength, impact + 200)
  return impact
}

const electricStorm: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  const charge = new THREE.Vector3()
  chargeOrb(ctx, () => source.focusPoint(charge, 1.3), {
    color: primary,
    core: '#fefce8',
    duration: 240,
    size: 0.22,
  })
  aura(ctx, source, { color: primary, duration: 450, count: 16 })
  const victims = [target, ...nearbyEnemies(ctx, source, target, 2.6, 3)]
  victims.forEach((victim, index) => {
    const delay = 240 + index * 110
    lightning(ctx, victim, { color: index === 0 ? primary : secondary, delay, duration: 320 })
    flare(ctx, at(victim), { color: primary, core: '#ffffff', size: 0.5, rays: 6, delay })
    burst(ctx, at(victim), { color: primary, count: 14, delay, speed: 2.2 })
    shockwave(ctx, ground(victim), { color: primary, delay, radius: 0.9, duration: 350 })
    if (index > 0) later(ctx, delay, () => victim.onHit(ctx.now + delay))
  })
  shake(ctx, strength, 240)
  return 240
}

const waterCannon: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 240 })
  chargeOrb(ctx, at(source, 0.6), { color: secondary, core: '#e0f2fe', duration: 250, size: 0.24 })
  leap(ctx, source, { delay: 200, duration: 300, height: 0.2 })
  beam(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: 240,
    duration: 650,
    width: 0.2,
  })
  for (let index = 0; index < 6; index++) {
    projectile(ctx, source, target, {
      color: secondary,
      delay: 260 + index * 70,
      duration: 240,
      size: 0.07,
      arc: 0,
      offset: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, 0),
    })
  }
  const impact = 320
  pushBack(ctx, target, () => source.root.position, {
    delay: impact,
    duration: 700,
    distance: 0.45,
  })
  burst(ctx, at(target), {
    color: secondary,
    count: 28,
    delay: impact + 100,
    speed: 2.4,
    spread: 'up',
    gravity: 3,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact + 100, radius: 1.5 })
  cloud(ctx, at(target, 0.5), {
    color: '#e0f2fe',
    count: 5,
    radius: 0.5,
    opacity: 0.35,
    delay: impact + 300,
    duration: 700,
  })
  shake(ctx, strength, impact + 100)
  return impact
}

const psychicWave: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  sigil(ctx, ground(source), { color: primary, secondary, radius: 0.8, points: 8, duration: 1000 })
  flare(ctx, at(source, 0.75), {
    color: secondary,
    core: '#ffffff',
    size: 0.3,
    rays: 8,
    delay: 100,
    duration: 260,
  })
  aura(ctx, source, { color: secondary, duration: 900, count: 22 })
  for (let ring = 0; ring < 3; ring++) {
    shockwave(ctx, ground(source), {
      color: ring === 1 ? secondary : primary,
      delay: 150 + ring * 140,
      radius: 3.4,
      duration: 700,
      height: 0.4 + ring * 0.25,
    })
  }
  const lift = 520
  levitate(ctx, target, { delay: 250, duration: 750, height: 0.6, wobble: 0.25 })
  vortex(ctx, ground(target), {
    color: primary,
    secondary,
    height: 1.3,
    radius: 0.55,
    delay: 260,
    duration: 700,
  })
  flare(ctx, at(target), {
    color: primary,
    core: secondary,
    size: 0.6,
    rays: 8,
    delay: lift,
    duration: 300,
  })
  burst(ctx, at(target), { color: secondary, count: 24, delay: lift, speed: 1.8, gravity: -0.4 })
  shake(ctx, strength, lift)
  return lift
}

const poisonBurst: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 260 })
  cloud(ctx, at(source, 0.3), {
    color: primary,
    count: 4,
    radius: 0.3,
    size: 0.2,
    duration: 500,
    opacity: 0.4,
  })
  const flight = 420
  prop(ctx, source, target, {
    build: () => {
      const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.2, 1),
        new THREE.MeshStandardMaterial({
          color: primary,
          roughness: 0.3,
          emissive: primary,
          emissiveIntensity: 0.4,
        }),
      )
      blob.scale.set(1, 0.8, 1.2)
      return blob
    },
    delay: 180,
    duration: flight,
    arc: 1.3,
    tumble: 5,
  })
  const impact = 180 + flight
  flare(ctx, at(target, 0.4), {
    color: primary,
    core: secondary,
    size: 0.6,
    rays: 7,
    delay: impact,
  })
  cloud(ctx, at(target, 0.35), {
    color: primary,
    count: 9,
    radius: 0.9,
    size: 0.4,
    delay: impact,
    duration: 1100,
  })
  cloud(ctx, at(target, 0.5), {
    color: secondary,
    count: 5,
    radius: 0.5,
    size: 0.25,
    opacity: 0.4,
    delay: impact + 120,
    duration: 900,
  })
  burst(ctx, at(target, 0.3), {
    color: secondary,
    count: 18,
    delay: impact,
    speed: 1.6,
    spread: 'up',
    gravity: 2.6,
  })
  burst(ctx, at(target, 0.4), {
    color: primary,
    count: 12,
    delay: impact + 200,
    speed: 0.6,
    spread: 'up',
    gravity: -0.6,
    size: 0.14,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.4, thickness: 0.5 })
  const splashed = nearbyEnemies(ctx, source, target, 1.6, 3)
  splashed.forEach((victim, index) =>
    burst(ctx, at(victim, 0.4), {
      color: primary,
      count: 8,
      delay: impact + 100 + index * 40,
      speed: 0.5,
      spread: 'up',
      gravity: -0.6,
    }),
  )
  flinch(ctx, splashed, impact + 100, 40)
  shake(ctx, strength, impact)
  return impact
}

const earthSpikes: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 200 })
  leap(ctx, source, {
    delay: 180,
    duration: 380,
    height: ctx.reducedMotion ? 0.2 : 0.9,
    slam: true,
  })
  const slam = 520
  shockwave(ctx, ground(source), { color: primary, delay: slam, radius: 1.4, thickness: 0.3 })
  const steps = 3
  for (let step = 1; step <= steps; step++) {
    spikes(ctx, pointBetween(source, target, step / (steps + 1)), {
      color: primary,
      solid: true,
      count: 3,
      radius: 0.25,
      height: 0.45 + step * 0.12,
      width: 0.11,
      delay: slam + step * 70,
      duration: 600,
    })
  }
  const impact = slam + (steps + 1) * 70
  spikes(ctx, ground(target), {
    color: primary,
    solid: true,
    count: 7,
    radius: 0.55,
    height: 1.4,
    width: 0.16,
    tilt: 0.45,
    delay: impact,
    duration: 900,
  })
  levitate(ctx, target, { delay: impact, duration: 500, height: 0.45, wobble: 0.3 })
  burst(ctx, at(target, 0.3), {
    color: secondary,
    count: 22,
    delay: impact,
    speed: 2,
    spread: 'up',
    gravity: 4,
  })
  cloud(ctx, ground(target), {
    color: '#a8a29e',
    count: 7,
    radius: 0.9,
    delay: impact + 60,
    duration: 900,
    opacity: 0.45,
  })
  cameraPunch(ctx, at(target), 0.3, impact - 60)
  flinch(ctx, nearbyEnemies(ctx, source, target, 1.5, 3), impact + 60, 40)
  shake(ctx, Math.max(strength, 4), impact, 420)
  return impact
}

const iceCrystal: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: secondary, duration: 700, count: 18 })
  chargeOrb(ctx, at(source, 0.65), { color: primary, core: '#f0f9ff', duration: 260, size: 0.2 })
  for (let index = 0; index < 5; index++) {
    projectile(ctx, source, target, {
      color: primary,
      core: secondary,
      delay: 240 + index * 50,
      duration: 260,
      size: 0.09,
      shape: 'shard',
      arc: 0.2,
      offset: new THREE.Vector3((index - 2) * 0.14, (Math.random() - 0.5) * 0.2, 0),
    })
  }
  const encase = 500
  spikes(ctx, ground(target), {
    color: primary,
    count: 8,
    radius: 0.4,
    height: 1.2,
    width: 0.15,
    tilt: -0.3,
    delay: encase,
    duration: 700,
  })
  sigil(ctx, ground(target), {
    color: secondary,
    radius: 0.75,
    points: 6,
    delay: encase,
    duration: 800,
  })
  const shatter = encase + 480
  flare(ctx, at(target), {
    color: primary,
    core: '#ffffff',
    size: 0.8,
    rays: 6,
    delay: shatter,
    duration: 280,
  })
  burst(ctx, at(target), {
    color: '#f0f9ff',
    count: 30,
    delay: shatter,
    speed: 2.6,
    gravity: 2.4,
    size: 0.1,
  })
  cloud(ctx, ground(target), {
    color: '#e0f2fe',
    count: 6,
    radius: 0.8,
    opacity: 0.3,
    delay: shatter,
    duration: 800,
  })
  shake(ctx, strength, shatter)
  return encase
}

const dragonBeam: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  leap(ctx, source, { duration: 560, height: 0.5 })
  aura(ctx, source, { color: primary, duration: 500, count: 20 })
  chargeOrb(ctx, at(source, 0.9), {
    color: primary,
    core: secondary,
    duration: 280,
    size: 0.3,
    count: 22,
  })
  cameraPunch(ctx, at(target), 0.45, 260)
  beam(ctx, source, target, {
    color: primary,
    core: secondary,
    delay: 280,
    duration: 720,
    width: 0.26,
  })
  beam(ctx, source, target, {
    color: secondary,
    core: '#ffffff',
    delay: 320,
    duration: 640,
    width: 0.1,
  })
  const impact = 360
  flare(ctx, at(target), {
    color: primary,
    core: secondary,
    size: 0.9,
    rays: 5,
    delay: impact,
    duration: 320,
  })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.2, duration: 700 })
  burst(ctx, at(target), { color: secondary, count: 32, delay: impact + 120, speed: 2.6 })
  pushBack(ctx, target, () => source.root.position, { delay: impact, duration: 700, distance: 0.4 })
  shake(ctx, Math.max(strength, 5), impact, 500)
  return impact
}

const ghostNightmare: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  cloud(ctx, ground(target), {
    color: '#0b0414',
    count: 8,
    radius: 0.8,
    size: 0.35,
    opacity: 0.7,
    duration: 1300,
    rise: 0.2,
  })
  const orbs = 6
  for (let index = 0; index < orbs; index++) {
    const angle = (index / orbs) * Math.PI * 2
    const origin = new THREE.Vector3()
    projectile(ctx, source, target, {
      color: primary,
      core: secondary,
      delay: 200 + index * 50,
      duration: 380,
      size: 0.13,
      arc: 0.3,
      from: () =>
        target
          .focusPoint(origin)
          .add(new THREE.Vector3(Math.cos(angle) * 1.6, 0.6, Math.sin(angle) * 1.6)),
    })
  }
  const impact = 200 + orbs * 50 + 380
  levitate(ctx, target, { delay: 300, duration: impact - 200, height: 0.3, wobble: 0.35 })
  flare(ctx, at(target), {
    color: primary,
    core: secondary,
    size: 0.6,
    rays: 3,
    delay: impact,
    duration: 300,
  })
  burst(ctx, at(target), { color: secondary, count: 30, delay: impact, speed: 2, gravity: -0.6 })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.4 })
  shake(ctx, strength, impact)
  return impact
}

const normalRally: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 260 })
  for (let index = 0; index < 3; index++) {
    prop(ctx, source, target, {
      build: () => ringMesh(index === 1 ? secondary : primary, 0.18, 0.03),
      delay: 60 + index * 70,
      duration: 260,
      arc: 0,
      grow: 1.8,
      fadeOut: 0.3,
    })
  }
  dash(ctx, source, target, { delay: 300, duration: 520, hold: 0.2 })
  trail(ctx, source, { color: secondary, delay: 300, duration: 420 })
  const impact = 460
  flare(ctx, at(target), {
    color: primary,
    core: '#ffffff',
    size: 0.75,
    rays: 8,
    delay: impact,
    duration: 260,
  })
  burst(ctx, at(target), { color: secondary, count: 20, delay: impact, speed: 2.2, spread: 'ring' })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.4 })
  pushBack(ctx, target, () => source.root.position, {
    delay: impact,
    duration: 500,
    distance: 0.5,
    lift: 0.2,
  })
  orbit(ctx, target, {
    color: '#fde047',
    count: 3,
    radius: 0.3,
    heightFactor: 1.15,
    delay: impact + 100,
    duration: 700,
  })
  shake(ctx, strength, impact)
  return impact
}

const bugSwarm: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 500, count: 14 })
  swarm(ctx, source, target, { color: primary, count: 26, duration: 1000, travel: 0.4 })
  swarm(ctx, source, target, {
    color: secondary,
    count: 12,
    delay: 80,
    duration: 950,
    travel: 0.42,
    size: 0.07,
  })
  const impact = 440
  for (let index = 0; index < 4; index++) {
    const delay = impact + index * 110
    flare(ctx, at(target, 0.4 + (index % 2) * 0.3), {
      color: primary,
      core: secondary,
      size: 0.26,
      delay,
      duration: 160,
    })
  }
  burst(ctx, at(target), { color: primary, count: 18, delay: impact + 450, speed: 1.6 })
  flinch(ctx, nearbyEnemies(ctx, source, target, 1.4, 2), impact + 200, 80)
  shake(ctx, strength * 0.6, impact)
  return impact
}

const fightingCombo: Choreography = (
  ctx,
  { source, target, primary, secondary, shake: strength },
) => {
  crouch(ctx, source, { duration: 200 })
  dash(ctx, source, target, { delay: 180, duration: 900, hold: 0.5 })
  trail(ctx, source, { color: primary, delay: 180, duration: 300 })
  const first = 340
  for (let index = 0; index < 3; index++) {
    const delay = first + index * 90
    flare(ctx, at(target, 0.45 + (index % 2) * 0.2), {
      color: primary,
      core: secondary,
      size: 0.35,
      rays: 6,
      delay,
      duration: 160,
    })
    burst(ctx, at(target), { color: secondary, count: 6, delay, speed: 1.3 })
  }
  const kick = first + 270
  slashArc(ctx, at(target, 0.3), {
    color: primary,
    delay: kick,
    duration: 220,
    angle: -0.4,
    sweep: 2.2,
    radius: 0.6,
    width: 0.2,
  })
  const uppercut = kick + 140
  levitate(ctx, target, { delay: uppercut, duration: 600, height: 0.8, wobble: 0.2 })
  flare(ctx, at(target, 0.8), {
    color: primary,
    core: '#ffffff',
    size: 0.8,
    rays: 8,
    delay: uppercut,
    duration: 280,
  })
  burst(ctx, at(target), {
    color: primary,
    count: 24,
    delay: uppercut,
    speed: 2.4,
    spread: 'up',
    gravity: 2,
  })
  shockwave(ctx, ground(target), { color: secondary, delay: uppercut, radius: 1.3 })
  cameraPunch(ctx, at(target), 0.35, uppercut - 40)
  shake(ctx, Math.max(strength, 4), uppercut)
  return first
}

const flyingGust: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  leap(ctx, source, { duration: 700, height: ctx.reducedMotion ? 0.2 : 0.9 })
  burst(ctx, ground(source), {
    color: secondary,
    count: 12,
    speed: 1.6,
    spread: 'ring',
    gravity: 0,
  })
  for (let index = 0; index < 3; index++) {
    prop(ctx, source, target, {
      build: () => crescentMesh(index === 1 ? primary : secondary, 0.34),
      delay: 200 + index * 80,
      duration: 280,
      arc: 0.1,
      offset: new THREE.Vector3((index - 1) * 0.25, 0.3, 0),
      spin: (index % 2 ? 1 : -1) * Math.PI * 4,
    })
  }
  const impact = 480
  vortex(ctx, ground(target), {
    color: secondary,
    secondary: primary,
    height: 2.2,
    radius: 0.75,
    delay: impact - 60,
    duration: 900,
  })
  levitate(ctx, target, { delay: impact, duration: 750, height: 0.9, spins: 1, wobble: 0.1 })
  cloud(ctx, ground(target), {
    color: '#cbd5e1',
    count: 6,
    radius: 0.8,
    opacity: 0.35,
    delay: impact,
    duration: 800,
  })
  burst(ctx, at(target), {
    color: '#f8fafc',
    count: 18,
    delay: impact + 200,
    speed: 1.8,
    gravity: 0.6,
  })
  flinch(ctx, nearbyEnemies(ctx, source, target, 1.4, 3), impact + 150, 40)
  shake(ctx, strength, impact)
  return impact
}

function steelBlade(color: string): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.36, 0.14),
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.95,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.2,
    }),
  )
}

const steelField: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  flare(ctx, at(source, 0.7), {
    color: '#ffffff',
    core: '#ffffff',
    size: 0.45,
    rays: 4,
    duration: 260,
  })
  sigil(ctx, ground(target), {
    color: primary,
    secondary,
    radius: 1,
    points: 6,
    delay: 100,
    duration: 1000,
  })
  orbit(ctx, target, {
    color: primary,
    count: 6,
    radius: 1.1,
    turns: 1.2,
    collapse: 0.2,
    build: () => steelBlade(secondary),
    delay: 150,
    duration: 520,
  })
  const impact = 640
  spikes(ctx, ground(target), {
    color: secondary,
    solid: true,
    count: 6,
    radius: 0.5,
    height: 1,
    width: 0.1,
    tilt: 0.3,
    delay: impact,
    duration: 700,
  })
  flare(ctx, at(target), {
    color: primary,
    core: '#ffffff',
    size: 0.7,
    rays: 4,
    delay: impact,
    duration: 240,
  })
  burst(ctx, at(target), {
    color: '#fcd34d',
    count: 22,
    delay: impact,
    speed: 2.4,
    gravity: 3,
    size: 0.08,
  })
  shockwave(ctx, ground(target), { color: secondary, delay: impact, radius: 1.6 })
  flinch(ctx, nearbyEnemies(ctx, source, target, 1.5, 3), impact + 60, 40)
  shake(ctx, strength, impact)
  return impact
}

export const ELEMENT_ULTIMATES: Partial<Record<AbilityEffectStyle, Choreography>> = {
  POKEMON_GRASS_BLOOM: grassBloom,
  POKEMON_FIRE_STREAM: fireStream,
  POKEMON_WATER_CANNON: waterCannon,
  POKEMON_ELECTRIC_STORM: electricStorm,
  POKEMON_PSYCHIC_WAVE: psychicWave,
  POKEMON_POISON_BURST: poisonBurst,
  POKEMON_EARTH_SPIKES: earthSpikes,
  POKEMON_ICE_CRYSTAL: iceCrystal,
  POKEMON_DRAGON_BEAM: dragonBeam,
  POKEMON_GHOST_NIGHTMARE: ghostNightmare,
  POKEMON_NORMAL_RALLY: normalRally,
  POKEMON_BUG_SWARM: bugSwarm,
  POKEMON_FIGHTING_COMBO: fightingCombo,
  POKEMON_FLYING_GUST: flyingGust,
  POKEMON_STEEL_FIELD: steelField,
}
