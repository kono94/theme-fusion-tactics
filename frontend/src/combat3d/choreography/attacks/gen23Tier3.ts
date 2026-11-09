import * as THREE from 'three'
import { clawMarks, psyBlade, starMesh } from '../kit/gen23Tier3'
import { zap } from '../kit/shared'
import { at, burst, glow, projectile, prop, slashArc, type ColorInput } from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const orbShot =
  (color: ColorInput, core: ColorInput, spark: ColorInput): AttackChoreography =>
  (ctx, { source, target }) => {
    projectile(ctx, source, target, {
      color,
      core,
      duration: 240,
      size: 0.09,
      priority: 'standard',
    })
    burst(ctx, at(target), { color: spark, count: 8, delay: 240, speed: 1.2, priority: 'standard' })
    return 240
  }

const clawRake =
  (color: ColorInput, spark: ColorInput): AttackChoreography =>
  (ctx, { target }) => {
    clawMarks(ctx, at(target), { color, size: 0.4, delay: 40, duration: 240, priority: 'standard' })
    burst(ctx, at(target), { color: spark, count: 8, delay: 120, speed: 1.3, priority: 'standard' })
    return 120
  }

const thrown =
  (build: () => THREE.Object3D, spark: ColorInput): AttackChoreography =>
  (ctx, { source, target }) => {
    prop(ctx, source, target, { build, duration: 240, arc: 0.25, spin: 8, priority: 'standard' })
    burst(ctx, at(target), { color: spark, count: 8, delay: 240, speed: 1.2, priority: 'standard' })
    return 240
  }

const sparkJolt: AttackChoreography = (ctx, { source, target }) => {
  zap(ctx, at(source, 0.6), at(target), {
    color: '#facc15',
    core: '#fef9c3',
    delay: 40,
    duration: 220,
    priority: 'standard',
  })
  burst(ctx, at(target), {
    color: '#fde047',
    count: 8,
    delay: 120,
    speed: 1.4,
    priority: 'standard',
  })
  return 120
}

const bladeCut =
  (color: ColorInput, edge: ColorInput): AttackChoreography =>
  (ctx, { target }) => {
    slashArc(ctx, at(target), {
      color,
      delay: 50,
      duration: 220,
      angle: -0.7,
      radius: 0.5,
      priority: 'standard',
    })
    slashArc(ctx, at(target), {
      color: edge,
      delay: 110,
      duration: 200,
      angle: 0.7,
      radius: 0.45,
      priority: 'standard',
    })
    burst(ctx, at(target), { color, count: 8, delay: 120, speed: 1.3, priority: 'standard' })
    return 120
  }

export const GEN23_TIER3_ATTACKS: AttackSet = {
  vaporeon: orbShot('#38bdf8', '#e0f2fe', '#7dd3fc'),
  jolteon: sparkJolt,
  flareon: orbShot('#f97316', '#fde68a', '#fb923c'),
  espeon: thrown(() => psyBlade('#c084fc', '#f0abfc', 0.18), '#e9d5ff'),
  umbreon: orbShot('#1f2937', '#facc15', '#fde047'),
  leafeon: bladeCut('#22c55e', '#bef264'),
  glaceon: thrown(
    () => new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), glow('#7dd3fc', 0.85)),
    '#e0f2fe',
  ),
  gardevoir: orbShot('#f472b6', '#bbf7d0', '#f9a8d4'),
  gallade: bladeCut('#4ade80', '#f0abfc'),
  tyranitar: clawRake('#a8a29e', '#78716c'),
  salamence: clawRake('#ef4444', '#60a5fa'),
  metagross: clawRake('#93c5fd', '#cbd5e1'),
  flygon: clawRake('#a3e635', '#d6b97a'),
  gliscor: bladeCut('#7e22ce', '#c084fc'),
  mismagius: orbShot('#a21caf', '#f5d0fe', '#e879f9'),
  dusknoir: orbShot('#374151', '#9ca3af', '#6b7280'),
  sharpedo: clawRake('#f8fafc', '#dc2626'),
  altaria: thrown(() => starMesh('#bae6fd', 0.1), '#f8fafc'),
  milotic: orbShot('#7dd3fc', '#fef3c7', '#f9a8d4'),
  slaking: clawRake('#fdba74', '#78350f'),
}
