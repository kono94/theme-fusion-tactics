import * as THREE from 'three'
import { bullHorns, carry, frill, kanabo, lollipop, skullDome, sun } from '../kit/beastsBigMom'
import {
  blade,
  bodyAt,
  fistMesh,
  fx,
  phase,
  pulse,
  setOpacity,
  spear,
  standard,
  swing,
} from '../kit/shared'
import {
  at,
  beam,
  burst,
  flare,
  glow,
  ground,
  lightning,
  prop,
  shockwave,
  slashArc,
  stretchLimb,
} from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const priority = 'standard' as const
const DUST = '#a8a29e'

// Strike time of `swing` for a given duration and windup: the strike phase spans windup..windup + 0.2.
const strikeAt = (duration: number, windup: number) => Math.round(duration * (windup + 0.2))

const gifterHornRam: AttackChoreography = (ctx, { source, target, secondary }) => {
  carry(ctx, source, target, bullHorns(), {
    duration: 280,
    forward: (p) => 0.25 + 0.45 * pulse(phase(p, 0.15, 0.85)),
    height: 0.62,
    priority,
  })
  burst(ctx, at(target), {
    color: secondary,
    count: 8,
    delay: 130,
    speed: 1.4,
    duration: 420,
    priority,
  })
  burst(ctx, ground(target), {
    color: DUST,
    count: 6,
    delay: 130,
    spread: 'ring',
    speed: 0.8,
    gravity: 0,
    duration: 420,
    priority,
  })
  return 130
}

const headlinerHammerFist: AttackChoreography = (ctx, { source, target, color, secondary }) => {
  const impact = 180
  prop(ctx, source, target, {
    build: () => fistMesh(0.22, () => standard('#7f1d1d', { roughness: 0.6 })),
    from: bodyAt(source, 1.45),
    to: at(target, 0.45),
    duration: impact,
    arc: 0.25,
    priority,
  })
  shockwave(ctx, ground(target), { color, delay: impact, radius: 0.8, duration: 280, priority })
  burst(ctx, at(target, 0.4), {
    color: secondary,
    count: 8,
    delay: impact,
    duration: 420,
    priority,
  })
  return impact
}

const ultiHeadbutt: AttackChoreography = (ctx, { source, target, color }) => {
  carry(ctx, source, target, skullDome(color, '#f9a8d4'), {
    duration: 260,
    forward: (p) => 0.2 + 0.5 * pulse(phase(p, 0.1, 0.9)),
    height: 0.66,
    priority,
  })
  flare(ctx, at(target), { color: '#f9a8d4', size: 0.4, rays: 5, delay: 120, priority })
  burst(ctx, at(target), { color, count: 8, delay: 120, speed: 1.5, duration: 420, priority })
  return 120
}

const pageOneTailWhip: AttackChoreography = (ctx, { source, target, color }) => {
  const tail = new THREE.Group()
  tail.add(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 1, 8).translate(0, 0.5, 0),
      standard(color, { roughness: 0.5 }),
    ),
  )
  for (let index = 0; index < 3; index++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), standard('#c4b5fd'))
    spine.position.set(0, 0.2 + index * 0.22, 0.06)
    spine.rotation.x = 0.6
    tail.add(spine)
  }
  const duration = 300
  const windup = 0.35
  swing(ctx, source, target, tail, {
    from: -0.9,
    to: Math.PI / 2 + 0.5,
    roll: Math.PI / 2,
    height: 0.35,
    duration,
    windup,
    priority,
  })
  const impact = strikeAt(duration, windup)
  burst(ctx, at(target, 0.4), {
    color: '#c4b5fd',
    count: 8,
    delay: impact,
    duration: 420,
    priority,
  })
  return impact
}

const sasakiFrillBash: AttackChoreography = (ctx, { source, target, color }) => {
  carry(ctx, source, target, frill(color, '#86efac'), {
    duration: 300,
    forward: (p) => 0.3 + 0.4 * pulse(phase(p, 0.15, 0.8)),
    height: 0.6,
    priority,
    animate: (p, model) => {
      model.rotation.z = p * 14
      model.scale.setScalar(0.7)
    },
  })
  burst(ctx, at(target), {
    color: '#86efac',
    count: 8,
    delay: 150,
    speed: 1.6,
    duration: 420,
    priority,
  })
  burst(ctx, ground(target), {
    color: DUST,
    count: 6,
    delay: 150,
    spread: 'ring',
    speed: 0.8,
    gravity: 0,
    duration: 420,
    priority,
  })
  return 150
}

const whosWhoClaws: AttackChoreography = (ctx, { target, color }) => {
  const claws = new THREE.Group()
  for (let index = 0; index < 3; index++) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.75).translate(0, -0.375, 0),
      glow(index === 1 ? '#fecaca' : color),
    )
    mark.position.set((index - 1) * 0.16, 0.36, 0)
    claws.add(mark)
  }
  fx(
    ctx,
    60,
    300,
    claws,
    (p) => {
      target.focusPoint(claws.position, 0.55)
      claws.quaternion.copy(ctx.camera.quaternion)
      claws.rotateZ(0.5)
      claws.children.forEach((mark, index) =>
        mark.scale.set(1, 0.01 + phase(p, index * 0.08, index * 0.08 + 0.25), 1),
      )
      setOpacity(claws, 1 - phase(p, 0.5, 1))
    },
    priority,
  )
  burst(ctx, at(target), { color, count: 8, delay: 100, speed: 1.5, duration: 420, priority })
  return 100
}

const queenLaser: AttackChoreography = (ctx, { source, target, color }) => {
  const muzzle = new THREE.Vector3()
  beam(ctx, source, target, {
    color,
    core: '#f5d0fe',
    width: 0.035,
    duration: 200,
    from: () => source.focusPoint(muzzle, 0.62).add(source.pose.offset),
    priority,
  })
  flare(ctx, at(target), { color: '#84cc16', core: '#f7fee7', size: 0.32, delay: 60, priority })
  burst(ctx, at(target), {
    color: '#84cc16',
    count: 6,
    delay: 60,
    speed: 1.2,
    duration: 420,
    priority,
  })
  return 60
}

const kingFlameSword: AttackChoreography = (ctx, { source, target }) => {
  const duration = 280
  const windup = 0.35
  swing(ctx, source, target, blade(0.8, '#1f2937', '#fb923c', 0.08), {
    from: -0.6,
    to: Math.PI / 2 + 0.6,
    roll: 0.9,
    height: 0.7,
    duration,
    windup,
    priority,
  })
  const impact = strikeAt(duration, windup)
  slashArc(ctx, at(target), {
    color: '#f97316',
    delay: impact,
    angle: -2.2,
    radius: 0.6,
    sweep: 1.8,
    priority,
  })
  burst(ctx, at(target), {
    color: '#fbbf24',
    count: 8,
    delay: impact,
    spread: 'up',
    speed: 1.2,
    gravity: 0,
    duration: 420,
    priority,
  })
  return impact
}

const kaidoKanaboSwing: AttackChoreography = (ctx, { source, target }) => {
  const duration = 320
  const windup = 0.4
  swing(ctx, source, target, kanabo(1.1, '#1f2937', '#e5e7eb'), {
    from: -0.7,
    to: Math.PI / 2 + 0.3,
    height: 0.8,
    duration,
    windup,
    priority,
  })
  const impact = strikeAt(duration, windup)
  shockwave(ctx, ground(target), {
    color: '#a78bfa',
    delay: impact,
    radius: 0.9,
    duration: 300,
    priority,
  })
  burst(ctx, at(target, 0.4), {
    color: '#ef4444',
    count: 10,
    delay: impact,
    speed: 1.8,
    duration: 420,
    priority,
  })
  return impact
}

const chessSpearThrust: AttackChoreography = (ctx, { source, target, color }) => {
  const pike = new THREE.Group()
  const model = spear(0.8, '#78350f', '#e5e7eb')
  model.rotation.x = Math.PI / 2
  model.position.z = -0.4
  pike.add(model)
  carry(ctx, source, target, pike, {
    duration: 260,
    forward: (p) => -0.1 + 0.6 * pulse(phase(p, 0.1, 0.9)),
    height: 0.55,
    side: 0.15,
    priority,
  })
  flare(ctx, at(target), { color, core: '#ffffff', size: 0.28, delay: 120, priority })
  burst(ctx, at(target), { color: '#fca5a5', count: 6, delay: 120, duration: 420, priority })
  return 120
}

const prometheusSunball: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = 240
  prop(ctx, source, target, {
    build: () => sun('#fef08a', color, 0.1),
    duration: impact,
    arc: 0.35,
    spin: 6,
    priority,
  })
  burst(ctx, at(target), {
    color: '#fde047',
    count: 8,
    delay: impact,
    speed: 1.4,
    duration: 420,
    priority,
  })
  shockwave(ctx, ground(target), { color, delay: impact, radius: 0.6, duration: 260, priority })
  return impact
}

const perosperoLollipop: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = 260
  prop(ctx, source, target, {
    build: () => lollipop(color, '#fef3c7'),
    duration: impact,
    arc: 0.5,
    spin: 10,
    priority,
  })
  burst(ctx, at(target), {
    color: '#f9a8d4',
    count: 8,
    delay: impact,
    speed: 1.3,
    duration: 420,
    priority,
  })
  burst(ctx, at(target), {
    color: '#86efac',
    count: 5,
    delay: impact,
    speed: 1,
    duration: 420,
    priority,
  })
  return impact
}

const daifukuGenieFist: AttackChoreography = (ctx, { source, target, color }) => {
  const impact = 200
  prop(ctx, source, target, {
    build: () => fistMesh(0.2, () => glow('#60a5fa', 0.7)),
    from: bodyAt(source, 1.36),
    duration: impact,
    arc: 0.1,
    grow: 0.4,
    fadeOut: 0.2,
    priority,
  })
  burst(ctx, at(target), {
    color: '#bfdbfe',
    count: 8,
    delay: impact,
    speed: 1.6,
    duration: 420,
    priority,
  })
  shockwave(ctx, ground(target), { color, delay: impact, radius: 0.7, duration: 260, priority })
  return impact
}

const crackerBiscuitBlade: AttackChoreography = (ctx, { source, target }) => {
  const duration = 280
  const windup = 0.35
  swing(ctx, source, target, blade(0.7, '#d9a45b', '#fbbf24', 0.09), {
    from: -0.6,
    to: Math.PI / 2 + 0.5,
    roll: -0.7,
    height: 0.65,
    duration,
    windup,
    priority,
  })
  const impact = strikeAt(duration, windup)
  burst(ctx, at(target), {
    color: '#d9a45b',
    count: 9,
    delay: impact,
    speed: 1.2,
    gravity: 2.6,
    size: 0.13,
    duration: 420,
    priority,
  })
  return impact
}

const smoothieJuiceSlash: AttackChoreography = (ctx, { source, target, color }) => {
  const duration = 260
  const windup = 0.3
  swing(ctx, source, target, blade(0.9, '#e5e7eb', '#f9a8d4', 0.05), {
    from: -0.5,
    to: Math.PI / 2 + 0.4,
    roll: 1.3,
    height: 0.65,
    duration,
    windup,
    priority,
  })
  const impact = strikeAt(duration, windup)
  slashArc(ctx, at(target), {
    color,
    delay: impact,
    angle: -1,
    radius: 0.6,
    width: 0.12,
    sweep: 2,
    priority,
  })
  burst(ctx, at(target), {
    color: '#f472b6',
    count: 10,
    delay: impact,
    speed: 1,
    gravity: 2.8,
    size: 0.1,
    duration: 420,
    priority,
  })
  return impact
}

const katakuriMochiPunch: AttackChoreography = (ctx, { source, target, color }) => {
  stretchLimb(ctx, source, target, {
    color: '#f5efe6',
    fist: '#f5efe6',
    duration: 260,
    thickness: 0.11,
    priority,
  })
  flare(ctx, at(target), { color, core: '#fdf4ff', size: 0.36, delay: 115, priority })
  burst(ctx, at(target), {
    color: '#f0abfc',
    count: 8,
    delay: 115,
    speed: 1.6,
    duration: 420,
    priority,
  })
  return 115
}

const bigMomNapoleonSlash: AttackChoreography = (ctx, { source, target, color }) => {
  const duration = 300
  const windup = 0.35
  swing(ctx, source, target, blade(1, '#fde68a', color, 0.12), {
    from: -0.7,
    to: Math.PI / 2 + 0.6,
    roll: -0.5,
    height: 0.75,
    duration,
    windup,
    priority,
  })
  const impact = strikeAt(duration, windup)
  slashArc(ctx, at(target), {
    color,
    delay: impact,
    angle: 1.2,
    radius: 0.7,
    width: 0.16,
    sweep: -1.8,
    priority,
  })
  lightning(ctx, target, {
    color: '#fde047',
    delay: impact - 20,
    duration: 160,
    segments: 6,
    jitter: 0.3,
    priority,
  })
  return impact
}

export const BEASTS_BIG_MOM_ATTACKS: AttackSet = {
  gifter_v1: gifterHornRam,
  headliner_v1: headlinerHammerFist,
  ulti_v1: ultiHeadbutt,
  page_one_v1: pageOneTailWhip,
  sasaki_v1: sasakiFrillBash,
  whos_who_v1: whosWhoClaws,
  queen_v1: queenLaser,
  king_v1: kingFlameSword,
  kaido_v1: kaidoKanaboSwing,
  chess_soldiers_v1: chessSpearThrust,
  prometheus_v1: prometheusSunball,
  perospero_v1: perosperoLollipop,
  daifuku_v1: daifukuGenieFist,
  cracker_v1: crackerBiscuitBlade,
  smoothie_v1: smoothieJuiceSlash,
  katakuri_v1: katakuriMochiPunch,
  big_mom_v1: bigMomNapoleonSlash,
}
