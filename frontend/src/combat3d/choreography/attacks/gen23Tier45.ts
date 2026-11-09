import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import {
  caltrop,
  clawMarks,
  crescentSlash,
  darkCrescent,
  eggMesh,
  gemMesh,
  heracrossHorn,
  mawileJaw,
  scizorPincer,
  sickleBlade,
  stoneBlade,
} from '../kit/gen23Tier45'
import {
  extend,
  fangs,
  flameMesh,
  flat,
  forkedBolt,
  fx,
  motionScale,
  phase,
  setOpacity,
  standard,
  stream,
} from '../kit/shared'
import {
  at,
  burst,
  flare,
  type FxContext,
  glow,
  ground,
  orbMesh,
  prop,
  ringMesh,
  rockMesh,
  shockwave,
  slashArc,
} from '../primitives'
import type { AttackChoreography, AttackSet } from '../types'

const STANDARD = 'standard' as const

function lunge(
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

interface ClawSpec {
  color: string
  edge: string
  count?: number
  angle?: number
  spark: string
}

// Melee rake: a short lunge, claw marks on the target and a spray of sparks.
const clawAttack =
  (spec: ClawSpec): AttackChoreography =>
  (ctx, { source, target }) => {
    lunge(ctx, source, target, 0.25, 260)
    clawMarks(ctx, at(target), {
      color: spec.color,
      edge: spec.edge,
      count: spec.count ?? 3,
      length: 0.55,
      angle: spec.angle ?? -0.7,
      delay: 110,
      duration: 300,
      priority: STANDARD,
    })
    burst(ctx, at(target), {
      color: spec.spark,
      count: 8,
      delay: 130,
      speed: 1.3,
      priority: STANDARD,
    })
    return 130
  }

interface ThrowSpec {
  build: () => THREE.Object3D
  hit: string
  core: string
  duration?: number
  arc?: number
  spin?: number
  tumble?: number
}

// Ranged throw: a custom prop flies to the target and pops in a small glint.
const throwAttack =
  (spec: ThrowSpec): AttackChoreography =>
  (ctx, { source, target }) => {
    const duration = spec.duration ?? 280
    prop(ctx, source, target, {
      build: spec.build,
      duration,
      arc: spec.arc ?? 0.3,
      spin: spec.spin ?? 0,
      tumble: spec.tumble ?? 0,
      priority: STANDARD,
    })
    flare(ctx, at(target), {
      color: spec.hit,
      core: spec.core,
      rays: 4,
      size: 0.3,
      delay: duration,
      priority: STANDARD,
    })
    burst(ctx, at(target), {
      color: spec.hit,
      count: 8,
      delay: duration,
      speed: 1.2,
      priority: STANDARD,
    })
    return duration
  }

interface JabSpec {
  arm: string
  tip: () => THREE.Object3D
  hit: string
  core: string
  thickness?: number
}

// Melee extension: an arm, horn or tail shoots out with a custom tip.
const jabAttack =
  (spec: JabSpec): AttackChoreography =>
  (ctx, { source, target }) => {
    extend(ctx, source, target, {
      color: spec.arm,
      tip: spec.tip(),
      duration: 220,
      thickness: spec.thickness ?? 0.04,
      priority: STANDARD,
    })
    flare(ctx, at(target), {
      color: spec.hit,
      core: spec.core,
      rays: 6,
      size: 0.3,
      delay: 100,
      priority: STANDARD,
    })
    burst(ctx, at(target), {
      color: spec.hit,
      count: 8,
      delay: 100,
      speed: 1.3,
      priority: STANDARD,
    })
    return 100
  }

const scizorMetalClaw = jabAttack({
  arm: '#991b1b',
  tip: () => {
    const { group, open } = scizorPincer(0.14)
    open(0.4)
    return group
  },
  hit: '#ef4444',
  core: '#e2e8f0',
})

const heracrossHornJab = jabAttack({
  arm: '#1e3a8a',
  tip: () => {
    const holder = new THREE.Group()
    const horn = heracrossHorn(0.3)
    horn.rotation.x = -Math.PI / 2
    holder.add(horn)
    return holder
  },
  hit: '#60a5fa',
  core: '#bfdbfe',
  thickness: 0.05,
})

const skarmorySteelWing: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.22, 260)
  slashArc(ctx, at(target), {
    color: '#94a3b8',
    delay: 100,
    angle: -0.5,
    radius: 0.55,
    priority: STANDARD,
  })
  slashArc(ctx, at(target, 0.45), {
    color: '#b91c1c',
    delay: 140,
    angle: -0.4,
    radius: 0.42,
    width: 0.06,
    priority: STANDARD,
  })
  prop(ctx, source, target, {
    build: () => caltrop(0.06),
    duration: 140,
    arc: 0.1,
    tumble: 8,
    priority: STANDARD,
  })
  return 120
}

const steelixRockHeadbutt: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.35, 300)
  shockwave(ctx, ground(target), {
    color: '#a1a1aa',
    delay: 140,
    radius: 0.8,
    duration: 320,
    priority: STANDARD,
  })
  burst(ctx, at(target, 0.3), {
    color: '#78716c',
    count: 10,
    delay: 140,
    speed: 1.5,
    gravity: 2.5,
    priority: STANDARD,
  })
  flare(ctx, at(target), {
    color: '#94a3b8',
    core: '#e2e8f0',
    rays: 4,
    size: 0.28,
    delay: 140,
    priority: STANDARD,
  })
  return 140
}

const blisseyEggToss = throwAttack({
  build: () => eggMesh(0.09),
  hit: '#f9a8d4',
  core: '#fdf2f8',
  duration: 300,
  arc: 0.7,
  spin: 6,
})

const wobbuffetMirrorShove: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.2, 260)
  const pane = new THREE.Group()
  pane.add(
    new THREE.Mesh(new THREE.CircleGeometry(0.24, 6), flat('#1d4ed8', 0.35)),
    new THREE.Mesh(new THREE.RingGeometry(0.19, 0.24, 6), glow('#93c5fd', 0.8)),
  )
  fx(
    ctx,
    60,
    280,
    pane,
    (p) => {
      target.focusPoint(pane.position, 0.55)
      pane.quaternion.copy(ctx.camera.quaternion)
      pane.scale.setScalar(0.5 + 0.7 * p)
      setOpacity(pane, 1 - phase(p, 0.5, 1))
    },
    STANDARD,
  )
  burst(ctx, at(target), {
    color: '#60a5fa',
    count: 8,
    delay: 120,
    speed: 1.2,
    spread: 'ring',
    priority: STANDARD,
  })
  return 120
}

const miltankRollout: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.4, 300)
  const m = motionScale(ctx)
  fx(ctx, 0, 300, undefined, (p) => (source.pose.spin += p * Math.PI * 2 * m), STANDARD)
  burst(ctx, at(target, 0.35), {
    color: '#f9a8d4',
    count: 10,
    delay: 150,
    speed: 1.4,
    priority: STANDARD,
  })
  shockwave(ctx, ground(target), {
    color: '#fbcfe8',
    delay: 150,
    radius: 0.7,
    duration: 300,
    priority: STANDARD,
  })
  return 150
}

const absolThrow = throwAttack({
  build: () => {
    const blade = darkCrescent(0.2)
    blade.rotation.z = Math.PI / 2
    return blade
  },
  hit: '#7c3aed',
  core: '#c4b5fd',
  duration: 240,
  arc: 0.1,
})

const absolDarkCrescent: AttackChoreography = (ctx, input) => {
  const impact = absolThrow(ctx, input)
  crescentSlash(ctx, at(input.target), {
    size: 0.3,
    angle: 0.6,
    delay: impact,
    duration: 260,
    priority: STANDARD,
  })
  return impact
}

const sableyeGemShard = throwAttack({
  build: () => gemMesh('#22d3ee', 0.07),
  hit: '#a855f7',
  core: '#cffafe',
  duration: 260,
  arc: 0.35,
  tumble: 10,
})

const mawileJawChomp: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.2, 280)
  const { group, bite } = mawileJaw(0.22)
  const holder = new THREE.Group()
  holder.add(group)
  fx(
    ctx,
    0,
    300,
    holder,
    (p) => {
      target.focusPoint(holder.position, 0.6)
      holder.quaternion.copy(ctx.camera.quaternion)
      holder.rotateY(Math.PI / 2)
      bite(p < 0.4 ? p / 0.4 : 1 - phase(p, 0.4, 0.55))
      setOpacity(holder, 1 - phase(p, 0.75, 1))
    },
    STANDARD,
  )
  burst(ctx, at(target), { color: '#cbd5e1', count: 8, delay: 150, speed: 1.2, priority: STANDARD })
  return 150
}

const torkoalSmokeEmber: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.15, 240)
  stream(ctx, at(source, 0.6), at(target), {
    color: '#f97316',
    count: 18,
    size: 0.1,
    spread: 0.3,
    duration: 260,
    travel: 0.6,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#57534e',
    count: 8,
    delay: 150,
    speed: 0.8,
    spread: 'up',
    gravity: -0.4,
    priority: STANDARD,
  })
  return 150
}

const castformRainOrb = throwAttack({
  build: () => {
    const orb = new THREE.Group()
    orb.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 10),
        standard('#0ea5e9', {
          opacity: 0.85,
          roughness: 0.05,
          emissive: '#0369a1',
          emissiveIntensity: 0.4,
        }),
      ),
      new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), glow('#7dd3fc', 0.3)),
    )
    return orb
  },
  hit: '#38bdf8',
  core: '#bae6fd',
  duration: 300,
  arc: 0.5,
})

const zangooseClawRake = clawAttack({
  color: '#b91c1c',
  edge: '#fca5a5',
  spark: '#fecaca',
  angle: -0.8,
})

const seviperTailLash: AttackChoreography = (ctx, { source, target }) => {
  extend(ctx, source, target, {
    color: '#1f1f2e',
    tip: (() => {
      const holder = new THREE.Group()
      const blade = sickleBlade(0.14)
      blade.rotation.x = -Math.PI / 2
      holder.add(blade)
      return holder
    })(),
    duration: 240,
    thickness: 0.05,
    rise: -0.2,
    priority: STANDARD,
  })
  slashArc(ctx, at(target), {
    color: '#a855f7',
    delay: 110,
    angle: 0.4,
    radius: 0.5,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color: '#c084fc', count: 8, delay: 110, speed: 1.2, priority: STANDARD })
  return 110
}

const lugiaWingGust: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.15, 260)
  stream(ctx, at(source, 0.7), at(target), {
    color: '#bfdbfe',
    count: 18,
    size: 0.08,
    spread: 0.4,
    duration: 260,
    travel: 0.6,
    wobble: 0.05,
    priority: STANDARD,
  })
  slashArc(ctx, at(target), {
    color: '#a5b4fc',
    delay: 130,
    angle: -0.3,
    radius: 0.55,
    priority: STANDARD,
  })
  return 130
}

const hoOhSacredEmber = throwAttack({
  build: () => flameMesh('#f97316', '#fde68a', 0.18),
  hit: '#facc15',
  core: '#fef3c7',
  duration: 300,
  arc: 0.4,
})

const raikouSpark: AttackChoreography = (ctx, { source, target }) => {
  forkedBolt(ctx, at(source, 0.7), at(target, 0.5), {
    color: '#facc15',
    width: 0.07,
    segments: 9,
    branches: 2,
    jitter: 0.25,
    reveal: 0.3,
    duration: 260,
    priority: STANDARD,
  })
  flare(ctx, at(target), {
    color: '#facc15',
    core: '#fef9c3',
    rays: 6,
    size: 0.3,
    delay: 80,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color: '#fde047', count: 8, delay: 80, speed: 1.4, priority: STANDARD })
  return 80
}

const enteiFireFang: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.3, 280)
  fangs(ctx, target, {
    color: '#fef3c7',
    glowColor: '#f97316',
    size: 0.3,
    teeth: 2,
    duration: 300,
    priority: STANDARD,
  })
  burst(ctx, at(target), {
    color: '#fb923c',
    count: 10,
    delay: 140,
    speed: 1.4,
    spread: 'up',
    priority: STANDARD,
  })
  return 140
}

const suicuneAuroraRing = throwAttack({
  build: () => {
    const ring = ringMesh('#67e8f9', 0.14, 0.03)
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 20), glow('#c4b5fd', 0.7)))
    return ring
  },
  hit: '#67e8f9',
  core: '#cffafe',
  duration: 300,
  arc: 0.2,
  spin: 4,
})

const kyogreWaterPulse = throwAttack({
  build: () => {
    const orb = orbMesh('#0284c7', '#7dd3fc', 0.1)
    orb.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), glow('#22d3ee', 0.55)))
    return orb
  },
  hit: '#22d3ee',
  core: '#bae6fd',
  duration: 300,
  arc: 0.25,
  spin: 5,
})

const groudonStoneClaw: AttackChoreography = (ctx, { source, target }) => {
  lunge(ctx, source, target, 0.3, 300)
  clawMarks(ctx, at(target), {
    color: '#7c2d12',
    edge: '#f97316',
    count: 3,
    length: 0.6,
    angle: -1,
    delay: 140,
    duration: 320,
    priority: STANDARD,
  })
  const blade = stoneBlade(0.45, 0.12)
  fx(
    ctx,
    120,
    360,
    blade,
    (p) => {
      blade.position.copy(target.root.position).setY(0)
      blade.scale.set(1, Math.max(0.001, Math.sin(Math.PI * p)), 1)
    },
    STANDARD,
  )
  burst(ctx, ground(target), {
    color: '#a8a29e',
    count: 8,
    delay: 140,
    speed: 1.4,
    spread: 'up',
    priority: STANDARD,
  })
  return 140
}

const rayquazaTwister: AttackChoreography = (ctx, { source, target }) => {
  stream(ctx, at(source, 0.7), at(target), {
    color: '#4ade80',
    count: 22,
    size: 0.1,
    spread: 0.3,
    duration: 300,
    travel: 0.6,
    wobble: 0.12,
    priority: STANDARD,
  })
  prop(ctx, source, target, {
    build: () => rockMesh('#15803d', 0.06),
    duration: 220,
    arc: 0.1,
    spin: 10,
    priority: STANDARD,
  })
  flare(ctx, at(target), {
    color: '#22c55e',
    core: '#d9f99d',
    rays: 4,
    size: 0.3,
    delay: 220,
    priority: STANDARD,
  })
  return 220
}

const latiosMistBall: AttackChoreography = (ctx, { source, target }) => {
  prop(ctx, source, target, {
    build: () => {
      const ball = new THREE.Group()
      ball.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 14, 10),
          standard('#3b82f6', { roughness: 0.15, emissive: '#2563eb', emissiveIntensity: 0.6 }),
        ),
        new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow('#93c5fd', 0.3)),
      )
      return ball
    },
    duration: 280,
    arc: 0.2,
    priority: STANDARD,
  })
  flare(ctx, at(target), {
    color: '#60a5fa',
    core: '#dbeafe',
    rays: 6,
    size: 0.32,
    delay: 280,
    priority: STANDARD,
  })
  burst(ctx, at(target), { color: '#c7d2fe', count: 8, delay: 280, speed: 1.2, priority: STANDARD })
  return 280
}

export const GEN23_TIER45_ATTACKS: AttackSet = {
  scizor: scizorMetalClaw,
  heracross: heracrossHornJab,
  skarmory: skarmorySteelWing,
  steelix: steelixRockHeadbutt,
  blissey: blisseyEggToss,
  wobbuffet: wobbuffetMirrorShove,
  miltank: miltankRollout,
  absol: absolDarkCrescent,
  sableye: sableyeGemShard,
  mawile: mawileJawChomp,
  torkoal: torkoalSmokeEmber,
  castform: castformRainOrb,
  zangoose: zangooseClawRake,
  seviper: seviperTailLash,
  lugia: lugiaWingGust,
  ho_oh: hoOhSacredEmber,
  raikou: raikouSpark,
  entei: enteiFireFang,
  suicune: suicuneAuroraRing,
  kyogre: kyogreWaterPulse,
  groudon: groudonStoneClaw,
  rayquaza: rayquazaTwister,
  latios: latiosMistBall,
}
