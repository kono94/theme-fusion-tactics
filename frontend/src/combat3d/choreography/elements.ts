import * as THREE from 'three'
import type { AbilityEffectStyle } from '../../data/animationConfig'
import {
  at,
  aura,
  beam,
  burst,
  cameraPunch,
  ground,
  later,
  leap,
  lightning,
  pillar,
  projectile,
  shake,
  shockwave,
} from './primitives'
import type { Choreography } from './types'

const fireStream: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 500 })
  const flames = 14
  for (let index = 0; index < flames; index++) {
    projectile(ctx, source, target, {
      color: index % 3 === 0 ? secondary : primary,
      core: '#fde68a',
      delay: 160 + index * 32,
      duration: 300,
      size: 0.08 + Math.random() * 0.08,
      arc: 0.1,
      offset: new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, 0),
    })
  }
  const impact = 460
  pillar(ctx, ground(target), { color: primary, delay: impact + 200, duration: 700, height: 2.4, radius: 0.45 })
  burst(ctx, at(target), { color: '#fbbf24', count: 26, delay: impact + 200, speed: 2.4 })
  shake(ctx, strength, impact + 200)
  return impact
}

const electricStorm: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  aura(ctx, source, { color: primary, duration: 450, count: 16 })
  const victims = [target, ...ctx.enemiesOf(source).filter((enemy) => enemy !== target).slice(0, 3)]
  victims.forEach((victim, index) => {
    const delay = 220 + index * 110
    lightning(ctx, victim, { color: index === 0 ? primary : secondary, delay, duration: 300 })
    burst(ctx, at(victim), { color: primary, count: 14, delay, speed: 2 })
    shockwave(ctx, ground(victim), { color: primary, delay, radius: 0.9, duration: 350 })
    if (index > 0) later(ctx, delay, () => victim.onHit(ctx.now + delay))
  })
  ctx.flash('#fef9c3', 220, 110)
  shake(ctx, strength, 220)
  return 220
}

const waterCannon: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  leap(ctx, source, { duration: 300, height: 0.25 })
  beam(ctx, source, target, { color: primary, core: secondary, delay: 200, duration: 650, width: 0.18 })
  for (let index = 0; index < 8; index++) {
    projectile(ctx, source, target, {
      color: secondary,
      delay: 220 + index * 60,
      duration: 260,
      size: 0.07,
      arc: 0,
      offset: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, 0),
    })
  }
  burst(ctx, at(target), { color: secondary, count: 28, delay: 420, speed: 2.4, spread: 'up', gravity: 3 })
  shockwave(ctx, ground(target), { color: primary, delay: 420, radius: 1.5 })
  shake(ctx, strength, 420)
  return 300
}

const psychicWave: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
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
  ctx.effects.add({
    start: ctx.now + 250,
    duration: 700,
    priority: 'ability',
    update: (p) => {
      target.pose.lift += Math.sin(Math.PI * p) * 0.6
      target.pose.tilt += Math.sin(p * Math.PI * 4) * 0.25
    },
  })
  burst(ctx, at(target), { color: secondary, count: 24, delay: lift, speed: 1.8, gravity: -0.4 })
  shake(ctx, strength, lift)
  return lift
}

const dragonBeam: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  leap(ctx, source, { duration: 500, height: 0.5 })
  aura(ctx, source, { color: primary, duration: 500, count: 20 })
  cameraPunch(ctx, at(target), 0.45, 240)
  beam(ctx, source, target, { color: primary, core: secondary, delay: 260, duration: 720, width: 0.26 })
  const impact = 340
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 2.2, duration: 700 })
  burst(ctx, at(target), { color: secondary, count: 32, delay: impact + 120, speed: 2.6 })
  shake(ctx, Math.max(strength, 5), impact, 500)
  return impact
}

const ghostNightmare: Choreography = (ctx, { source, target, primary, secondary, shake: strength }) => {
  ctx.flash('#1e0b3a', 0, 420)
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
        target.focusPoint(origin).add(new THREE.Vector3(Math.cos(angle) * 1.6, 0.6, Math.sin(angle) * 1.6)),
    })
  }
  const impact = 200 + orbs * 50 + 380
  burst(ctx, at(target), { color: secondary, count: 30, delay: impact, speed: 2, gravity: -0.6 })
  shockwave(ctx, ground(target), { color: primary, delay: impact, radius: 1.4 })
  shake(ctx, strength, impact)
  return impact
}

export const ELEMENT_ULTIMATES: Partial<Record<AbilityEffectStyle, Choreography>> = {
  POKEMON_FIRE_STREAM: fireStream,
  POKEMON_ELECTRIC_STORM: electricStorm,
  POKEMON_WATER_CANNON: waterCannon,
  POKEMON_PSYCHIC_WAVE: psychicWave,
  POKEMON_DRAGON_BEAM: dragonBeam,
  POKEMON_GHOST_NIGHTMARE: ghostNightmare,
}
