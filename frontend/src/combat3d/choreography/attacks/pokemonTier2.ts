import * as THREE from 'three'
import {
  at,
  burst,
  flare,
  glow,
  ground,
  prop,
  shockwave,
  slashArc,
  starGeometry,
} from '../primitives'
import { billboard, debris, fadeInOut, fangs, fx, heartGeometry, zap } from '../kit/shared'
import { flameMesh } from '../kit/pokemonTier2'
import type { AttackChoreography, AttackSet } from '../types'

const cheekSpark =
  (bolts: number): AttackChoreography =>
  (ctx, { source, target, color, secondary }) => {
    for (let index = 0; index < bolts; index++) {
      zap(ctx, at(source, 0.55), at(target), {
        color: index === 0 ? color : secondary,
        delay: index * 30,
        duration: 160,
        segments: 6,
        jitter: 0.25 + index * 0.1,
        priority: 'standard',
      })
    }
    flare(ctx, at(target), { color, size: 0.3 + bolts * 0.1, delay: 50, priority: 'standard' })
    burst(ctx, at(target), { color: secondary, count: 6, delay: 50, priority: 'standard' })
    return 50
  }

const clawScratch =
  (color: string, radius: number): AttackChoreography =>
  (ctx, { target }) => {
    ;[0, 1, 2].forEach((index) =>
      slashArc(ctx, at(target), {
        color: index === 1 ? '#ffffff' : color,
        delay: 60 + index * 25,
        angle: -2.1,
        sweep: 0.9,
        radius: radius + index * 0.07,
        width: 0.05,
        duration: 180,
        priority: 'standard',
      }),
    )
    burst(ctx, at(target), { color, count: 6, delay: 110, priority: 'standard' })
    return 110
  }

const poundPop =
  (size: number, heart: boolean): AttackChoreography =>
  (ctx, { target }) => {
    const group = new THREE.Group()
    group.add(new THREE.Mesh(starGeometry(5, size, size * 0.42), glow('#fde047')))
    if (heart) {
      const love = new THREE.Mesh(heartGeometry(size * 0.45), glow('#f472b6'))
      love.position.z = 0.01
      group.add(love)
    }
    const point = at(target, 0.6)
    fx(
      ctx,
      100,
      260,
      group,
      (p) => {
        group.position.copy(point())
        billboard(ctx, group)
        group.rotateZ(p * 1.5)
        group.scale.setScalar(0.4 + Math.min(1, p * 4) * 0.8)
        group.children.forEach((child) => {
          ;((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - p
        })
      },
      'standard',
    )
    burst(ctx, at(target), { color: '#f9a8d4', count: 6, delay: 100, priority: 'standard' })
    return 100
  }

const bite =
  (glowColor: string, size: number, teeth: number, splash: string): AttackChoreography =>
  (ctx, { target }) => {
    fangs(ctx, target, { glowColor, size, teeth, duration: 240, priority: 'standard' })
    const snap = Math.round(240 * 0.55)
    burst(ctx, at(target), { color: splash, count: 8, delay: snap, priority: 'standard' })
    return snap
  }

const crossWings: AttackChoreography = (ctx, { target }) => {
  ;[-0.8, 2.3].forEach((angle, index) =>
    slashArc(ctx, at(target), {
      color: index === 0 ? '#a21caf' : '#c084fc',
      delay: 60 + index * 40,
      angle,
      sweep: 0.8,
      radius: 0.55,
      duration: 200,
      priority: 'standard',
    }),
  )
  burst(ctx, at(target), { color: '#a855f7', count: 8, delay: 110, priority: 'standard' })
  return 110
}

const chop =
  (color: string, spark: string): AttackChoreography =>
  (ctx, { target }) => {
    slashArc(ctx, at(target), {
      color,
      delay: 70,
      angle: 1.4,
      sweep: -1.1,
      radius: 0.5,
      duration: 180,
      priority: 'standard',
    })
    flare(ctx, at(target), { color: spark, size: 0.35, delay: 110, priority: 'standard' })
    burst(ctx, at(target), { color, count: 7, delay: 110, priority: 'standard' })
    return 110
  }

const fireFang =
  (size: number, ring: boolean): AttackChoreography =>
  (ctx, { target }) => {
    fangs(ctx, target, {
      glowColor: '#f97316',
      color: '#fff7ed',
      size,
      teeth: 4,
      duration: 260,
      priority: 'standard',
    })
    const snap = Math.round(260 * 0.55)
    burst(ctx, at(target), {
      color: '#fb923c',
      count: 10,
      delay: snap,
      spread: 'up',
      priority: 'standard',
    })
    if (ring) {
      shockwave(ctx, ground(target), {
        color: '#f97316',
        delay: snap,
        radius: 0.8,
        duration: 280,
        priority: 'standard',
      })
    }
    return snap
  }

const rockSmash =
  (count: number, size: number, dust: string): AttackChoreography =>
  (ctx, { target }) => {
    debris(ctx, at(target, 0.4), {
      color: '#78716c',
      count,
      size,
      speed: 1.4,
      delay: 110,
      duration: 500,
      priority: 'standard',
    })
    shockwave(ctx, ground(target), {
      color: dust,
      delay: 110,
      radius: 0.6 + size * 2,
      duration: 300,
      priority: 'standard',
    })
    burst(ctx, at(target), { color: dust, count: 6, delay: 110, priority: 'standard' })
    return 110
  }

const hoofStomp =
  (bright: boolean): AttackChoreography =>
  (ctx, { target }) => {
    burst(ctx, ground(target), {
      color: '#fb923c',
      count: 10,
      delay: 110,
      spread: 'up',
      speed: 1.6,
      priority: 'standard',
    })
    shockwave(ctx, ground(target), {
      color: '#f97316',
      delay: 110,
      radius: 0.75,
      duration: 300,
      priority: 'standard',
    })
    if (bright)
      flare(ctx, at(target), { color: '#fde047', size: 0.4, delay: 110, priority: 'standard' })
    return 110
  }

const ember =
  (flames: number): AttackChoreography =>
  (ctx, { source, target }) => {
    for (let index = 0; index < flames; index++) {
      prop(ctx, source, target, {
        build: () =>
          flameMesh(index % 2 ? '#fb923c' : '#f97316', '#fef3c7', 0.1).rotateX(-Math.PI / 2),
        delay: index * 60,
        duration: 260,
        arc: 0.35 + index * 0.15,
        priority: 'standard',
      })
    }
    const hit = 260 + (flames - 1) * 60
    burst(ctx, at(target), {
      color: '#fdba74',
      count: 8,
      delay: hit,
      spread: 'up',
      priority: 'standard',
    })
    return hit
  }

const shadowSwipe: AttackChoreography = (ctx, { target }) => {
  slashArc(ctx, at(target), {
    color: '#7e22ce',
    delay: 70,
    angle: 1.4,
    sweep: -1.2,
    radius: 0.6,
    duration: 200,
    priority: 'standard',
  })
  flare(ctx, at(target), { color: '#a855f7', size: 0.45, delay: 110, priority: 'standard' })
  burst(ctx, at(target), {
    color: '#c084fc',
    count: 8,
    delay: 110,
    spread: 'up',
    priority: 'standard',
  })
  fx(
    ctx,
    110,
    260,
    undefined,
    (p) => {
      target.pose.scale *= 1 - 0.06 * fadeInOut(p, 0.1, 0.5)
    },
    'standard',
  )
  return 110
}

export const POKEMON_TIER_2_ATTACKS: AttackSet = {
  pikachu: cheekSpark(1),
  raichu: cheekSpark(2),
  sandshrew: clawScratch('#d97706', 0.36),
  sandslash: clawScratch('#fbbf24', 0.48),
  vulpix: ember(1),
  ninetales: ember(2),
  jigglypuff: poundPop(0.16, false),
  wigglytuff: poundPop(0.22, true),
  zubat: bite('#a855f7', 0.16, 2, '#dc2626'),
  golbat: bite('#7c3aed', 0.26, 4, '#a855f7'),
  crobat: crossWings,
  mankey: chop('#fb923c', '#ffffff'),
  primeape: chop('#dc2626', '#fed7aa'),
  annihilape: shadowSwipe,
  growlithe: fireFang(0.2, false),
  arcanine: fireFang(0.3, true),
  geodude: rockSmash(4, 0.07, '#a8a29e'),
  graveler: rockSmash(5, 0.09, '#a8a29e'),
  golem: rockSmash(7, 0.11, '#d6d3d1'),
  ponyta: hoofStomp(false),
  rapidash: hoofStomp(true),
}
