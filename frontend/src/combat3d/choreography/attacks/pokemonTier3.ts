import * as THREE from 'three'
import { beakJab, lit, makeGlob, pincerSnap, vine } from '../kit/pokemonTier3'
import { ahead } from '../kit/shared'
import { at, burst, glow, prop, slashArc } from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const karateChop: AttackChoreography = (ctx, { target, color, secondary }) => {
  slashArc(ctx, at(target, 0.7), {
    color: '#fecaca',
    delay: 60,
    duration: 200,
    angle: 0.9,
    radius: 0.42,
    sweep: -1.6,
    priority: 'standard',
  })
  burst(ctx, at(target), { color, count: 8, delay: 110, speed: 1.3, priority: 'standard' })
  burst(ctx, at(target), {
    color: secondary,
    count: 4,
    delay: 110,
    speed: 0.8,
    priority: 'standard',
  })
  return 110
}

const vineLash: AttackChoreography = (ctx, { source, target }) => {
  vine(ctx, source, target, {
    color: '#16a34a',
    duration: 360,
    thickness: 0.03,
    sway: 0.2,
    overhead: 0.3,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#86efac',
    count: 8,
    delay: 180,
    speed: 1.2,
    priority: 'standard',
  })
  return 180
}

const peck =
  (heads: number): AttackChoreography =>
  (ctx, { source, target }) => {
    for (let head = 0; head < heads; head++) {
      beakJab(ctx, source, target, {
        color: '#f59e0b',
        side: (head - (heads - 1) / 2) * 0.22,
        delay: head * 70,
        duration: 180,
        size: 0.07,
        height: 0.75,
        priority: 'standard',
      })
    }
    burst(ctx, at(target, 0.6), {
      color: '#fef3c7',
      count: 8,
      delay: 90,
      speed: 1.2,
      priority: 'standard',
    })
    return 90
  }

const clawPinch =
  (size: number): AttackChoreography =>
  (ctx, { target, secondary }) => {
    pincerSnap(ctx, target, {
      color: '#ea580c',
      size,
      duration: 320,
      snapAt: 0.55,
      lift: 0.05,
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: secondary,
      count: 8,
      delay: 180,
      speed: 1.4,
      priority: 'standard',
    })
    return 180
  }

const sludgeBlob =
  (size: number): AttackChoreography =>
  (ctx, { source, target }) => {
    prop(ctx, source, target, {
      build: () => makeGlob('#6b21a8', size, 0.35),
      from: at(source, 0.65),
      to: at(target, 0.5),
      duration: 260,
      arc: 0.5,
      spin: 5,
      priority: 'standard',
    })
    burst(ctx, at(target), {
      color: '#a855f7',
      count: 10,
      delay: 260,
      speed: 1.4,
      gravity: 2.4,
      priority: 'standard',
    })
    return 260
  }

const icicleJab: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => {
      const icicle = new THREE.Group()
      icicle.add(
        new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.3, 6).rotateX(Math.PI / 2),
          lit('#bae6fd', 0.45, 0.1),
        ),
        new THREE.Mesh(
          new THREE.ConeGeometry(0.02, 0.24, 5).rotateX(Math.PI / 2),
          glow('#ffffff', 0.8),
        ),
      )
      return icicle
    },
    from: ahead(source, target, 0.2, 0.55),
    to: at(target, 0.55),
    duration: 160,
    arc: 0.03,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#e0f2fe',
    count: 8,
    delay: 160,
    speed: 1.2,
    priority: 'standard',
  })
  return 160
}

export const POKEMON_TIER_3_ATTACKS: AttackSet = {
  machop: karateChop,
  machoke: karateChop,
  machamp: karateChop,
  bellsprout: vineLash,
  weepinbell: vineLash,
  victreebel: vineLash,
  doduo: peck(2),
  dodrio: peck(3),
  krabby: clawPinch(0.14),
  kingler: clawPinch(0.2),
  grimer: sludgeBlob(0.09),
  muk: sludgeBlob(0.12),
  shellder: icicleJab,
  cloyster: icicleJab,
}
