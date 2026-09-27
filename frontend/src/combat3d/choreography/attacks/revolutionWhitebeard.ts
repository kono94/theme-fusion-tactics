import * as THREE from 'three'
import {
  at,
  burst,
  crescentMesh,
  flare,
  ground,
  leafMesh,
  orbit,
  projectile,
  prop,
  ringMesh,
  shockwave,
  slashArc,
  vortex,
} from '../primitives'
import { airCracks, palmStrike } from '../kit/revolutionWhitebeard'
import { flames, spear, standard, swing } from '../kit/shared'
import type { AttackChoreography, AttackSet } from '../types'

const WATER = '#38bdf8'

const hackWaterJab: AttackChoreography = (ctx, { source, target, color }) => {
  palmStrike(ctx, source, target, {
    color,
    core: '#e0f2fe',
    duration: 240,
    scale: 0.55,
    impact: 0.45,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: WATER,
    count: 10,
    delay: 108,
    speed: 1.6,
    spread: 'up',
    gravity: 2.4,
    priority: 'standard',
  })
  return 108
}

const koalaKarateChop: AttackChoreography = (ctx, { target, color }) => {
  flare(ctx, at(target), { color, core: '#fff1f2', size: 0.32, delay: 90, priority: 'standard' })
  shockwave(ctx, at(target), {
    color: WATER,
    delay: 90,
    radius: 0.7,
    duration: 280,
    height: 0.6,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: WATER,
    count: 8,
    delay: 90,
    speed: 1.4,
    gravity: 2,
    priority: 'standard',
  })
  return 90
}

const bettyRallyShot: AttackChoreography = (ctx, { source, target, color }) => {
  projectile(ctx, source, target, {
    color,
    core: '#fda4af',
    duration: 260,
    shape: 'bolt',
    arc: 0.15,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#fda4af',
    count: 10,
    delay: 260,
    speed: 1.6,
    spread: 'ring',
    gravity: 0,
    priority: 'standard',
  })
  return 260
}

// Death Wink: the wink itself is an expanding ring of compressed air.
const ivankovDeathWink: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => ringMesh(color, 0.16, 0.05),
    duration: 240,
    arc: 0,
    grow: 1.6,
    priority: 'standard',
  })
  flare(ctx, at(target), { color: '#f0abfc', size: 0.35, delay: 240, priority: 'standard' })
  burst(ctx, at(target), { color, count: 8, delay: 240, speed: 1.6, priority: 'standard' })
  return 240
}

const saboPipeStrike: AttackChoreography = (ctx, { source, target, color }) => {
  swing(ctx, source, target, spear(0.95, '#57534e', '#57534e', 0), {
    from: -0.9,
    to: 1.5,
    windup: 0.35,
    duration: 300,
    roll: 0.3,
    priority: 'standard',
  })
  burst(ctx, at(target), { color, count: 10, delay: 150, speed: 1.8, priority: 'standard' })
  flames(ctx, ground(target), {
    color,
    core: '#fef3c7',
    count: 3,
    radius: 0.15,
    height: 0.4,
    delay: 150,
    duration: 300,
    priority: 'standard',
  })
  return 150
}

const dragonGust: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => crescentMesh('#a7f3d0', 0.35),
    duration: 240,
    arc: 0.1,
    spin: 3,
    grow: 0.6,
    priority: 'standard',
  })
  vortex(ctx, ground(target), {
    color,
    secondary: '#a7f3d0',
    height: 1.1,
    radius: 0.35,
    rings: 4,
    delay: 200,
    duration: 380,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#d1fae5',
    count: 8,
    delay: 240,
    speed: 1.8,
    spread: 'ring',
    gravity: 0,
    priority: 'standard',
  })
  return 240
}

const thatchTwinCut: AttackChoreography = (ctx, { target, color }) => {
  slashArc(ctx, at(target), {
    color,
    delay: 60,
    angle: -2.2,
    radius: 0.45,
    sweep: 1.3,
    priority: 'standard',
  })
  slashArc(ctx, at(target), {
    color: '#5eead4',
    delay: 110,
    angle: 0.9,
    radius: 0.45,
    sweep: 1.3,
    priority: 'standard',
  })
  flare(ctx, at(target), { color, size: 0.3, delay: 110, priority: 'standard' })
  return 110
}

const jozuDiamondJab: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () =>
      new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        standard('#bae6fd', {
          emissive: color,
          emissiveIntensity: 0.5,
          metalness: 0.3,
          roughness: 0.1,
          flatShading: true,
        }),
      ),
    duration: 130,
    arc: 0,
    tumble: 4,
    priority: 'standard',
  })
  flare(ctx, at(target), {
    color: '#e0f2fe',
    core: '#ffffff',
    size: 0.38,
    delay: 130,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#f0f9ff',
    count: 8,
    delay: 130,
    speed: 1.5,
    priority: 'standard',
  })
  return 130
}

const vistaRoseCut: AttackChoreography = (ctx, { target, color }) => {
  slashArc(ctx, at(target), {
    color,
    delay: 80,
    angle: -1.4,
    radius: 0.5,
    width: 0.12,
    priority: 'standard',
  })
  orbit(ctx, target, {
    color,
    count: 5,
    radius: 0.25,
    turns: 0.5,
    collapse: 3,
    delay: 100,
    duration: 380,
    build: (index) => leafMesh(index % 2 === 0 ? '#be123c' : '#f0abfc', 0.1),
    priority: 'standard',
  })
  return 100
}

// Hiken's little sibling: finger-gun fire bullets fanned slightly apart.
const aceFireGun: AttackChoreography = (ctx, { source, target, color }) => {
  ;[-0.18, 0, 0.18].forEach((spread, index) =>
    projectile(ctx, source, target, {
      color,
      core: '#fef3c7',
      delay: index * 45,
      duration: 200,
      size: 0.07,
      arc: 0.05,
      shape: 'bolt',
      offset: new THREE.Vector3(spread, spread * 0.4, 0),
      priority: 'standard',
    }),
  )
  burst(ctx, at(target), {
    color: '#fbbf24',
    count: 10,
    delay: 200,
    speed: 1.8,
    priority: 'standard',
  })
  return 200
}

const marcoFlameKick: AttackChoreography = (ctx, { source, target, color }) => {
  prop(ctx, source, target, {
    build: () => crescentMesh(color, 0.34),
    duration: 220,
    arc: 0.25,
    spin: -1.2,
    grow: 0.5,
    priority: 'standard',
  })
  flames(ctx, ground(target), {
    color,
    core: '#fde68a',
    count: 3,
    radius: 0.18,
    height: 0.45,
    delay: 220,
    duration: 320,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#60a5fa',
    count: 8,
    delay: 220,
    speed: 1.6,
    priority: 'standard',
  })
  return 220
}

const whitebeardNaginata: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  swing(ctx, source, target, spear(1.3, '#44403c', color, 1), {
    from: -1,
    to: 1.3,
    windup: 0.35,
    duration: 340,
    height: 0.85,
    priority: 'standard',
  })
  airCracks(ctx, at(target), {
    color: secondary,
    delay: 170,
    duration: 320,
    radius: 0.55,
    rays: 6,
    width: 0.035,
    grow: 0.3,
    priority: 'standard',
  })
  shockwave(ctx, ground(target), {
    color: secondary,
    delay: 170,
    radius: 0.9,
    duration: 300,
    priority: 'standard',
  })
  return 170
}

export const REVOLUTION_WHITEBEARD_ATTACKS: AttackSet = {
  hack_v1: hackWaterJab,
  koala_v1: koalaKarateChop,
  belo_betty_v1: bettyRallyShot,
  ivankov_v1: ivankovDeathWink,
  sabo_v1: saboPipeStrike,
  dragon_v1: dragonGust,
  thatch_v1: thatchTwinCut,
  jozu_v1: jozuDiamondJab,
  vista_v1: vistaRoseCut,
  ace_v1: aceFireGun,
  marco_v1: marcoFlameKick,
  whitebeard_v1: whitebeardNaginata,
}
