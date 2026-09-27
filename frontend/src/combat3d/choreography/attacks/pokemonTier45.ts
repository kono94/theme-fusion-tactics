import * as THREE from 'three'
import { extend } from '../kit/pokemonTier45'
import {
  bodyAt,
  fistMesh,
  flat,
  fx,
  hexagonGeometry,
  motionScale,
  phase,
  setOpacity,
  standard,
  zap,
} from '../kit/shared'
import {
  at,
  burst,
  flare,
  glow,
  ground,
  orbMesh,
  projectile,
  prop,
  rockMesh,
  shockwave,
  slashArc,
} from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'
import type { FxContext } from '../primitives'
import type { UnitView } from '../../unitView'

const STANDARD = 'standard' as const

function lungeToward(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  reach: number,
  duration: number,
): void {
  const offset = new THREE.Vector3()
  const m = motionScale(ctx)
  fx(
    ctx,
    0,
    duration,
    undefined,
    (p) => {
      offset.subVectors(target.root.position, source.root.position).setY(0)
      source.pose.offset.addScaledVector(offset, Math.sin(Math.PI * p) * reach * m)
    },
    STANDARD,
  )
}

function glove(color: string, size: number): THREE.Group {
  const holder = new THREE.Group()
  const knuckles = fistMesh(size, () => standard(color, { roughness: 0.4 }))
  knuckles.rotation.x = -Math.PI / 2
  holder.add(knuckles)
  return holder
}

const farfetchdLeekSlash: AttackChoreography = (ctx, { target }) => {
  const leek = new THREE.Group()
  leek.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.55, 6), standard('#f0fdf4')),
    new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.35, 6).translate(0, 0.44, 0),
      standard('#16a34a'),
    ),
  )
  fx(
    ctx,
    0,
    260,
    leek,
    (p) => {
      target.focusPoint(leek.position, 0.6)
      leek.quaternion.copy(ctx.camera.quaternion)
      leek.rotateZ(1.2 - phase(p, 0.1, 0.6) * 2.6)
      leek.translateY(-0.2)
      setOpacity(leek, 1 - phase(p, 0.75, 1))
    },
    STANDARD,
  )
  slashArc(ctx, at(target), {
    color: '#4ade80',
    delay: 110,
    angle: -0.4,
    radius: 0.55,
    priority: STANDARD,
  })
  return 110
}

const hitmonleeKick: AttackChoreography = (ctx, { source, target }) => {
  const foot = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8).scale(1.2, 0.7, 1.4),
    standard('#92400e'),
  )
  extend(ctx, source, target, {
    color: '#b45309',
    tip: foot,
    duration: 240,
    thickness: 0.05,
    rise: -0.25,
    priority: STANDARD,
  })
  flare(ctx, at(target, 0.45), {
    color: '#fb923c',
    rays: 6,
    delay: 110,
    size: 0.3,
    priority: STANDARD,
  })
  return 110
}

const hitmonchanJab: AttackChoreography = (ctx, { source, target }) => {
  extend(ctx, source, target, {
    color: '#c08457',
    tip: glove('#dc2626', 0.16),
    duration: 200,
    thickness: 0.05,
    side: 0.1,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color: '#fca5a5', count: 8, delay: 90, speed: 1.2, priority: STANDARD })
  return 90
}

const kangaskhanBabyCombo: AttackChoreography = (ctx, { source, target }) => {
  extend(ctx, source, target, {
    color: '#a8a29e',
    tip: glove('#d6d3d1', 0.09),
    duration: 160,
    thickness: 0.03,
    side: -0.24,
    rise: -0.22,
    priority: STANDARD,
  })
  extend(ctx, source, target, {
    color: '#78716c',
    tip: glove('#a8a29e', 0.2),
    delay: 110,
    duration: 240,
    thickness: 0.07,
    side: 0.12,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#fbcfe8',
    count: 10,
    delay: 220,
    speed: 1.4,
    priority: STANDARD,
  })
  return 220
}

const mrMimeWallShove: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => {
      const pane = new THREE.Group()
      pane.add(
        new THREE.Mesh(hexagonGeometry(0.26), flat('#e0f2fe', 0.3)),
        new THREE.Mesh(hexagonGeometry(0.26, 0.21), glow('#fbcfe8', 0.9)),
      )
      return pane
    },
    duration: 240,
    arc: 0.1,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#f5f5f4',
    count: 8,
    delay: 240,
    speed: 1.2,
    spread: 'ring',
    priority: STANDARD,
  })
  return 240
}

const pinsirHornPinch: AttackChoreography = (ctx, { target }) => {
  const pincers = new THREE.Group()
  const horns = [1, -1].map((mirror) => {
    const horn = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.045, 6, 16, Math.PI * 0.7),
      standard('#d6d3d1', { flatShading: true }),
    )
    horn.scale.x = mirror
    pincers.add(horn)
    return horn
  })
  fx(
    ctx,
    0,
    300,
    pincers,
    (p) => {
      target.focusPoint(pincers.position, 0.6)
      pincers.quaternion.copy(ctx.camera.quaternion)
      const close = phase(p, 0.2, 0.5)
      horns.forEach((horn, index) => {
        const mirror = index === 0 ? 1 : -1
        horn.rotation.z = mirror * (0.9 - close * 0.9) - (index === 0 ? 0.3 : Math.PI - 0.3)
      })
      setOpacity(pincers, 1 - phase(p, 0.75, 1))
    },
    STANDARD,
  )
  burst(ctx, at(target), { color: '#bef264', count: 8, delay: 150, speed: 1.3, priority: STANDARD })
  return 150
}

const laprasWaterPulse: AttackChoreography = (ctx, { source, target }) => {
  projectile(ctx, source, target, {
    color: '#38bdf8',
    core: '#e0f2fe',
    duration: 260,
    arc: 0.2,
    size: 0.12,
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color: '#7dd3fc',
    delay: 260,
    radius: 0.8,
    duration: 320,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color: '#bae6fd', count: 8, delay: 260, speed: 1.2, priority: STANDARD })
  return 260
}

const taurosRam: AttackChoreography = (ctx, { source, target }) => {
  lungeToward(ctx, source, target, 0.45, 300)
  burst(ctx, ground(target), {
    color: '#a8a29e',
    count: 10,
    delay: 130,
    speed: 1,
    spread: 'up',
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color: '#fbbf24',
    delay: 130,
    radius: 0.8,
    duration: 300,
    priority: STANDARD,
  })
  return 130
}

const dittoGooSlap: AttackChoreography = (ctx, { source, target }) => {
  const goo = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8).scale(1.3, 0.8, 1),
    standard('#c084fc', { roughness: 0.2 }),
  )
  extend(ctx, source, target, {
    color: '#c084fc',
    tip: goo,
    duration: 260,
    thickness: 0.09,
    material: standard('#d8b4fe', { roughness: 0.2, opacity: 0.85 }),
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#e9d5ff',
    count: 10,
    delay: 120,
    speed: 1.1,
    gravity: 2.4,
    priority: STANDARD,
  })
  return 120
}

const porygonDataCube: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () =>
      new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.2, 0.2, 0.2)),
        new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true }),
      ),
    duration: 240,
    arc: 0.25,
    spin: Math.PI * 3,
    tumble: Math.PI * 2,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#f472b6',
    count: 10,
    delay: 240,
    speed: 1.3,
    priority: STANDARD,
  })
  return 240
}

const lickitungLick: AttackChoreography = (ctx, { source, target }) => {
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8).scale(1.3, 0.5, 1),
    standard('#f472b6'),
  )
  extend(ctx, source, target, {
    color: '#ec4899',
    tip,
    duration: 260,
    thickness: 0.055,
    rise: -0.12,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#f9a8d4',
    count: 8,
    delay: 120,
    speed: 1,
    gravity: 2.2,
    priority: STANDARD,
  })
  return 120
}

const jynxDoubleSlap: AttackChoreography = (ctx, { target }) => {
  slashArc(ctx, at(target), {
    color: '#f472b6',
    delay: 60,
    angle: -1.8,
    radius: 0.45,
    sweep: 1.6,
    priority: STANDARD,
  })
  slashArc(ctx, at(target), {
    color: '#fbcfe8',
    delay: 150,
    angle: 1.2,
    radius: 0.45,
    sweep: -1.6,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#e0f2fe',
    count: 10,
    delay: 150,
    speed: 1,
    gravity: 0.6,
    priority: STANDARD,
  })
  return 150
}

const snorlaxBellyBump: AttackChoreography = (ctx, { source, target }) => {
  lungeToward(ctx, source, target, 0.35, 320)
  fx(
    ctx,
    0,
    320,
    undefined,
    (p) => {
      source.pose.scale *= 1 + 0.22 * Math.sin(Math.PI * p)
    },
    STANDARD,
  )
  shockwave(ctx, ground(target), {
    color: '#e7e5e4',
    delay: 150,
    radius: 1,
    thickness: 0.25,
    duration: 320,
    priority: STANDARD,
  })
  burst(ctx, at(target, 0.4), {
    color: '#d6d3d1',
    count: 10,
    delay: 150,
    speed: 1.4,
    spread: 'ring',
    priority: STANDARD,
  })
  return 150
}

const aerodactylRockThrow: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => rockMesh('#a8a29e', 0.13),
    duration: 270,
    arc: 0.7,
    spin: Math.PI * 4,
    tumble: Math.PI * 3,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#78716c',
    count: 10,
    delay: 270,
    speed: 1.4,
    gravity: 2.4,
    priority: STANDARD,
  })
  return 270
}

const articunoIceShard: AttackChoreography = (ctx, { source, target }) => {
  projectile(ctx, source, target, {
    color: '#7dd3fc',
    core: '#f0f9ff',
    duration: 240,
    shape: 'shard',
    arc: 0.1,
    size: 0.09,
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color: '#e0f2fe',
    delay: 240,
    radius: 0.7,
    duration: 300,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#f8fafc',
    count: 10,
    delay: 240,
    speed: 1.2,
    priority: STANDARD,
  })
  return 240
}

const zapdosSpark: AttackChoreography = (ctx, { source, target }) => {
  const from = bodyAt(source, 0.7)
  const to = bodyAt(target, 0.55)
  zap(ctx, from, to, {
    color: '#fde047',
    duration: 180,
    segments: 8,
    jitter: 0.35,
    priority: STANDARD,
  })
  zap(ctx, from, to, {
    color: '#fef9c3',
    delay: 50,
    duration: 150,
    segments: 6,
    jitter: 0.5,
    priority: STANDARD,
  })
  flare(ctx, at(target), { color: '#facc15', rays: 6, delay: 60, size: 0.3, priority: STANDARD })
  return 60
}

const moltresEmber: AttackChoreography = (ctx, { source, target }) => {
  projectile(ctx, source, target, {
    color: '#f97316',
    core: '#fef08a',
    duration: 260,
    arc: 0.35,
    size: 0.12,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#fb923c',
    count: 12,
    delay: 260,
    speed: 1.2,
    spread: 'up',
    gravity: -0.4,
    priority: STANDARD,
  })
  return 260
}

const mewtwoShadowOrb: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => {
      const orb = new THREE.Group()
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), glow('#c084fc', 0.9))
      ring.rotation.x = 0.6
      orb.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), flat('#2e1065', 0.95)),
        new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), glow('#7c3aed', 0.5)),
        ring,
      )
      return orb
    },
    duration: 280,
    arc: 0.15,
    spin: Math.PI * 6,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#a855f7',
    count: 12,
    delay: 280,
    speed: 1.6,
    priority: STANDARD,
  })
  return 280
}

const mewBubble: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => orbMesh('#f9a8d4', '#fdf2f8', 0.09),
    duration: 290,
    arc: 0.8,
    grow: 0.4,
    priority: STANDARD,
  })
  flare(ctx, at(target), { color: '#f9a8d4', rays: 4, delay: 290, size: 0.3, priority: STANDARD })
  return 290
}

export const POKEMON_TIER_4_5_ATTACKS: AttackSet = {
  farfetchd: farfetchdLeekSlash,
  hitmonlee: hitmonleeKick,
  hitmonchan: hitmonchanJab,
  kangaskhan: kangaskhanBabyCombo,
  mr_mime: mrMimeWallShove,
  pinsir: pinsirHornPinch,
  lapras: laprasWaterPulse,
  tauros: taurosRam,
  ditto: dittoGooSlap,
  porygon: porygonDataCube,
  lickitung: lickitungLick,
  jynx: jynxDoubleSlap,
  snorlax: snorlaxBellyBump,
  aerodactyl: aerodactylRockThrow,
  articuno: articunoIceShard,
  zapdos: zapdosSpark,
  moltres: moltresEmber,
  mewtwo: mewtwoShadowOrb,
  mew: mewBubble,
}
