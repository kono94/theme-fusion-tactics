import * as THREE from 'three'
import { easeInOut } from '../../unitView'
import { SKIN, rapier, rocketFist, rubberArm, slingshot, sproutSlap } from '../kit/strawHats'
import { flatDirection, fx } from '../kit/shared'
import {
  at,
  burst,
  flare,
  ground,
  orbMesh,
  projectile,
  prop,
  shockwave,
  slashArc,
} from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const luffyRubberPunch: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  const impact = rubberArm(ctx, source, target, {
    fist: SKIN,
    duration: 250,
    fistSize: 0.075,
    priority: 'standard',
  })
  flare(ctx, at(target), {
    color,
    core: secondary,
    size: 0.32,
    rays: 6,
    delay: impact,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: secondary,
    count: 8,
    delay: impact,
    duration: 360,
    priority: 'standard',
  })
  return impact
}

const zoroThreeSwordSlash: AttackChoreography = (ctx, { target, color, secondary }) => {
  ;[-2.0, -0.4, 1.0].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index === 1 ? secondary : color,
      delay: 50 + index * 40,
      duration: 200,
      angle,
      radius: 0.5 + index * 0.05,
      width: 0.1,
      sweep: 1.8,
      priority: 'standard',
    }),
  )
  return 90
}

const namiClimaSpark: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  const travel = 200
  prop(ctx, source, target, {
    build: () => orbMesh(color, secondary, 0.07),
    duration: travel,
    arc: 0.3,
    priority: 'standard',
  })
  flare(ctx, at(target), {
    color: secondary,
    core: '#ffffff',
    size: 0.4,
    rays: 4,
    delay: travel,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color,
    count: 8,
    delay: travel,
    speed: 1.8,
    gravity: 0,
    duration: 260,
    priority: 'standard',
  })
  return travel
}

const usoppSlingshot: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  const release = slingshot(ctx, source, target, { duration: 220 })
  const travel = 170
  projectile(ctx, source, target, {
    color,
    core: secondary,
    delay: release,
    duration: travel,
    size: 0.055,
    arc: 0.15,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color,
    count: 8,
    delay: release + travel,
    speed: 1.4,
    duration: 240,
    priority: 'standard',
  })
  return release + travel
}

const sanjiFlameKick: AttackChoreography = (ctx, { target, color, secondary }) => {
  slashArc(ctx, at(target, 0.35), {
    color,
    delay: 60,
    duration: 220,
    angle: -2.6,
    radius: 0.55,
    width: 0.16,
    sweep: 2.0,
    priority: 'standard',
  })
  flare(ctx, at(target), {
    color: secondary,
    core: '#fef9c3',
    size: 0.38,
    rays: 6,
    delay: 110,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color,
    count: 8,
    delay: 110,
    speed: 1.4,
    spread: 'up',
    duration: 360,
    priority: 'standard',
  })
  return 110
}

// Chopper hops in on his little legs and lands a hoof punch.
const chopperHoofPunch: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = 150
  const direction = flatDirection(source, target)
  const reach = ctx.reducedMotion
    ? 0.1
    : Math.max(0, source.root.position.distanceTo(target.root.position) - 0.7)
  fx(
    ctx,
    0,
    340,
    undefined,
    (p) => {
      const out = p < 0.45 ? easeInOut(p / 0.45) : 1 - easeInOut((p - 0.45) / 0.55)
      source.pose.offset.addScaledVector(direction, out * reach)
      source.pose.lift += Math.sin(Math.PI * Math.min(1, p / 0.45)) * 0.18
    },
    'standard',
  )
  flare(ctx, at(target), {
    color,
    core: '#fdf2f8',
    size: 0.34,
    rays: 5,
    delay: impact,
    priority: 'standard',
  })
  shockwave(ctx, ground(target), {
    color,
    delay: impact,
    radius: 0.6,
    duration: 260,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#fbcfe8',
    count: 7,
    delay: impact,
    speed: 1.3,
    duration: 360,
    priority: 'standard',
  })
  return impact
}

const robinArmSlap: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = sproutSlap(ctx, source, target, {
    petal: '#f0abfc',
    duration: 340,
    priority: 'standard',
  })
  flare(ctx, at(target, 0.6), {
    color,
    core: '#fdf4ff',
    size: 0.3,
    rays: 5,
    delay: impact,
    priority: 'standard',
  })
  burst(ctx, at(target, 0.2), {
    color: '#f0abfc',
    count: 8,
    delay: 0,
    speed: 0.9,
    spread: 'up',
    duration: 360,
    priority: 'standard',
  })
  return impact
}

const frankyStrongRight: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = rocketFist(ctx, source, target, { color, duration: 300, priority: 'standard' })
  flare(ctx, at(target), {
    color,
    core: '#ffffff',
    size: 0.36,
    rays: 5,
    delay: impact,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#fb923c',
    count: 7,
    delay: impact,
    speed: 1.5,
    duration: 360,
    priority: 'standard',
  })
  return impact
}

const brookRapierThrust: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = rapier(ctx, source, target, {
    glow: color,
    mode: 'thrust',
    duration: 240,
    priority: 'standard',
  })
  flare(ctx, at(target), {
    color,
    core: '#f0f9ff',
    size: 0.3,
    rays: 4,
    delay: impact,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#e0f2fe',
    count: 7,
    delay: impact,
    speed: 1.1,
    gravity: 0.4,
    duration: 360,
    priority: 'standard',
  })
  return impact
}

const jinbeiWaterPalm: AttackChoreography = (ctx, { target, color, secondary }) => {
  const impact = 120
  const splash = new THREE.Vector3()
  flare(ctx, at(target), {
    color: secondary,
    core: '#ffffff',
    size: 0.42,
    rays: 6,
    delay: impact,
    priority: 'standard',
  })
  shockwave(ctx, () => target.focusPoint(splash, 0), {
    color,
    delay: impact,
    radius: 0.8,
    duration: 300,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: secondary,
    count: 10,
    delay: impact,
    speed: 1.8,
    spread: 'up',
    gravity: 2.5,
    duration: 360,
    priority: 'standard',
  })
  return impact
}

export const STRAW_HATS_ATTACKS: AttackSet = {
  luffy_v1: luffyRubberPunch,
  zoro_v1: zoroThreeSwordSlash,
  nami_v1: namiClimaSpark,
  usopp_v1: usoppSlingshot,
  sanji_v1: sanjiFlameKick,
  chopper_v1: chopperHoofPunch,
  robin_v1: robinArmSlap,
  franky_v1: frankyStrongRight,
  brook_v1: brookRapierThrust,
  jinbei_v1: jinbeiWaterPalm,
}
