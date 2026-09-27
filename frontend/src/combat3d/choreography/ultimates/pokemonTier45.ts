import * as THREE from 'three'
import {
  cameraAxes,
  extend,
  forkedBolt,
  frostFloor,
  gradientGlow,
  groundArcs,
  iceCrystalPrison,
  legendaryWings,
  paintVertical,
  ribbonMesh,
  snowflakeGeometry,
  tailRibbons,
  writeRibbon,
} from '../kit/pokemonTier45'
import {
  alliesAround,
  bodyAt,
  bodyPoint,
  clamp01,
  easeIn,
  easeOut,
  offsetPoint,
  zap,
  coil,
  debris,
  enemiesAround,
  enemiesInLine,
  fadeInOut,
  fistMesh,
  flat,
  flames,
  flatDirection,
  flinch,
  flinchAlong,
  fx,
  groundCracks,
  heartGeometry,
  motionLines,
  motionScale,
  noteGeometry,
  phase,
  scaledCount,
  setOpacity,
  shiver,
  squash,
  standard,
  starPower,
  tube,
  zzz,
  driftMotes,
} from '../kit/shared'
import {
  at,
  aura,
  burst,
  cameraPunch,
  chargeOrb,
  cloud,
  crouch,
  dash,
  flare,
  glow,
  ground,
  leafMesh,
  lightning,
  orbit,
  pillar,
  rockMesh,
  shake,
  shockwave,
  slashArc,
  spikes,
  spin,
  starGeometry,
  trail,
  type FxContext,
} from '../primitives'
import type { Choreography, UltimateSet } from '../types'
import { easeInOut, type UnitView } from '../../unitView'

const UP = new THREE.Vector3(0, 1, 0)

function lineEnd(source: UnitView, target: UnitView, extra: number): THREE.Vector3 {
  return target.root.position.clone().addScaledVector(flatDirection(source, target), extra).setY(0)
}

const farfetchdLeafBlade: Choreography = (ctx, { source, target, shake: strength }) => {
  const direction = flatDirection(source, target)
  const end = lineEnd(source, target, 1.3)
  const victims = enemiesInLine(ctx, source, target)
  const impact = 470

  const leek = new THREE.Group()
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8),
    standard('#f0fdf4', { roughness: 0.5, flatShading: true }),
  )
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.45, 6).translate(0, 0.57, 0),
    standard('#15803d', { roughness: 0.5, flatShading: true }),
  )
  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 1.2, 4).scale(1, 1, 0.25).translate(0, 0.95, 0),
    glow('#4ade80', 0),
  )
  leek.add(stalk, leaves, blade)
  const hand = new THREE.Vector3()
  fx(ctx, 0, 900, leek, (p) => {
    source.focusPoint(hand, 0.55).add(source.pose.offset)
    hand.y += source.pose.lift
    leek.position.copy(hand).addScaledVector(direction, 0.25)
    leek.quaternion.copy(ctx.camera.quaternion)
    const raise = easeInOut(phase(p, 0, 0.3))
    const swing = easeInOut(phase(p, 0.38, 0.55))
    leek.rotateZ(0.5 - raise * 0.9 - swing * 2.6)
    ;(blade.material as THREE.MeshBasicMaterial).opacity = 0.9 * raise * (1 - phase(p, 0.75, 1))
    setOpacity(stalk, 1 - phase(p, 0.8, 1))
    setOpacity(leaves, 1 - phase(p, 0.8, 1))
  })
  aura(ctx, source, { color: '#4ade80', duration: 420, count: 16 })
  if (!ctx.reducedMotion) spin(ctx, source, { delay: 340, duration: 380, turns: 1 })

  const streak = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), glow('#bbf7d0', 0.9))
  const start = source.root.position.clone().setY(0.6)
  const length = start.distanceTo(end.clone().setY(0.6))
  fx(ctx, 360, 520, streak, (p) => {
    const grow = easeInOut(phase(p, 0, 0.3))
    streak.position.copy(start).addScaledVector(direction, (length * grow) / 2)
    streak.position.y = 0.6
    streak.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction)
    streak.rotateX(Math.PI / 2 - 0.5)
    streak.scale.set(Math.max(0.01, length * grow), 1 + p * 2, 1)
    setOpacity(streak, 1 - phase(p, 0.4, 1))
  })

  const leafCount = scaledCount(ctx, 14)
  const swirl = new THREE.Group()
  const seeds = Array.from({ length: leafCount }, (_, index) => {
    const leaf = leafMesh(index % 3 === 0 ? '#bef264' : '#22c55e', 0.08)
    swirl.add(leaf)
    return {
      t: Math.random(),
      side: (Math.random() - 0.5) * 0.8,
      rise: Math.random() * 0.9,
      spin: Math.random() * 10,
    }
  })
  const point = new THREE.Vector3()
  const side = new THREE.Vector3().crossVectors(direction, UP)
  fx(ctx, 380, 800, swirl, (p) => {
    swirl.children.forEach((leaf, index) => {
      const seed = seeds[index]
      point.copy(start).addScaledVector(direction, length * seed.t)
      point.addScaledVector(side, seed.side * (0.4 + p))
      point.y = 0.3 + seed.rise + p * 0.6
      leaf.position.copy(point)
      leaf.rotation.set(seed.spin + p * 12, seed.spin * 2 + p * 9, p * 6)
    })
    setOpacity(swirl, fadeInOut(p, 0.1, 0.4))
  })

  slashArc(ctx, at(target), {
    color: '#4ade80',
    delay: impact,
    duration: 300,
    angle: -2.2,
    radius: 1.05,
    width: 0.24,
    sweep: 1.8,
  })
  slashArc(ctx, at(target), {
    color: '#f0fdf4',
    delay: impact + 70,
    duration: 300,
    angle: 0.6,
    radius: 0.9,
    width: 0.18,
    sweep: 1.6,
  })
  burst(ctx, at(target), { color: '#86efac', count: 24, delay: impact, speed: 2.4 })
  cameraPunch(ctx, at(target), 0.5, impact - 60)
  shake(ctx, strength, impact)
  flinch(ctx, victims, impact + 60)
  return impact
}

const hitmonleeHighJumpKick: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 760
  const offset = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  fx(ctx, 0, 1150, undefined, (p) => {
    const t = p * 1150
    if (t < 260) {
      const squat = Math.sin((Math.PI * t) / 260)
      source.pose.scale *= 1 - 0.22 * squat
      source.pose.lift -= 0.12 * squat
      return
    }
    if (t < impact) {
      const air = (t - 260) / (impact - 260)
      const height =
        air < 0.55 ? Math.sin((air / 0.55) * (Math.PI / 2)) : 1 - ((air - 0.55) / 0.45) ** 2
      source.pose.lift += height * 2.4 * m
      const reach = air < 0.45 ? 0 : easeInOut((air - 0.45) / 0.55)
      source.pose.offset.addScaledVector(offset, reach * 0.8 * m)
      source.pose.scale *= 1 + 0.15 * Math.sin(Math.PI * air)
      source.pose.tilt -= air < 0.45 ? air * 2 * m : (0.9 + (air - 0.45)) * m
      return
    }
    const rebound = (t - impact) / (1150 - impact)
    source.pose.offset.addScaledVector(offset, 0.8 * m * (1 - easeInOut(rebound)))
    source.pose.lift += Math.sin(Math.PI * rebound) * 0.5 * m
    source.pose.tilt -= 1.35 * m * (1 - rebound)
  })

  const flame = new THREE.Group()
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.9, 12, 1, true).translate(0, -0.45, 0),
    glow('#fb923c', 0.75),
  )
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.6, 10, 1, true).translate(0, -0.3, 0),
    glow('#fef08a', 0.9),
  )
  const foot = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 8).scale(1, 0.7, 1.3),
    standard('#92400e', { roughness: 0.5, flatShading: true }),
  )
  flame.add(cone, core, foot)
  const kickFrom = new THREE.Vector3()
  const kickTo = new THREE.Vector3()
  fx(ctx, 480, impact - 480 + 60, flame, (p) => {
    source.focusPoint(kickFrom, 0.4).add(source.pose.offset)
    kickFrom.y += source.pose.lift
    target.focusPoint(kickTo, 0.55)
    const direction = kickTo.clone().sub(kickFrom).normalize()
    flame.position.copy(kickFrom).addScaledVector(direction, 0.35)
    flame.quaternion.setFromUnitVectors(UP, direction.negate())
    flame.scale.setScalar(0.6 + p * 0.8)
    setOpacity(flame, fadeInOut(p, 0.2, 0.15))
  })
  motionLines(ctx, source, { color: '#fed7aa', delay: 500, duration: 300, count: 10 })

  flare(ctx, at(target), { color: '#f97316', rays: 8, delay: impact, size: 0.95, duration: 320 })
  burst(ctx, at(target), { color: '#fdba74', count: 26, delay: impact, speed: 2.6 })
  shockwave(ctx, ground(target), { color: '#fb923c', delay: impact, radius: 1.8, duration: 500 })
  cameraPunch(ctx, at(target), 0.85, impact - 40)
  shake(ctx, strength * 1.2, impact, 320)
  return impact
}

// fistMesh faces +z; extend() aims the tip's +y at the target, so the knuckles are turned to lead.
function fist(color: string, halo: string, size = 0.15): THREE.Group {
  const group = new THREE.Group()
  const knuckles = fistMesh(size * 1.5, () => standard(color, { roughness: 0.4 }))
  knuckles.rotation.x = -Math.PI / 2
  group.add(
    knuckles,
    new THREE.Mesh(new THREE.SphereGeometry(size * 1.8, 14, 10), glow(halo, 0.55)),
  )
  return group
}

function iceSpikes(
  ctx: FxContext,
  view: UnitView,
  delay: number,
  duration: number,
  count = 6,
): void {
  spikes(ctx, ground(view), {
    color: '#a5f3fc',
    solid: true,
    count,
    radius: 0.42,
    height: 0.85,
    width: 0.09,
    tilt: 0.45,
    delay,
    duration,
  })
}

const hitmonchanElementalPunches: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const offset = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  const punches = [
    { at: 180, fist: '#dc2626', halo: '#fb923c', side: 0.14 },
    { at: 420, fist: '#dc2626', halo: '#67e8f9', side: -0.14 },
    { at: 660, fist: '#dc2626', halo: '#fde047', side: 0.05 },
  ]
  fx(ctx, 60, 760, undefined, (p) => {
    const t = 60 + p * 760
    const pulse = punches.reduce(
      (sum, punch) => sum + Math.max(0, 1 - Math.abs(t - punch.at) / 120),
      0,
    )
    source.pose.offset.addScaledVector(offset, 0.28 * pulse * m)
  })
  punches.forEach((punch) => {
    extend(ctx, source, target, {
      color: '#c08457',
      tip: fist(punch.fist, punch.halo),
      delay: punch.at - 110,
      duration: 260,
      thickness: 0.06,
      side: punch.side,
    })
    shake(ctx, strength * 0.6, punch.at, 160)
  })
  burst(ctx, at(target), { color: '#f97316', count: 20, delay: 180, speed: 1.8, spread: 'up' })
  pillar(ctx, ground(target), {
    color: '#fb923c',
    delay: 180,
    duration: 420,
    height: 1.3,
    radius: 0.35,
  })
  iceSpikes(ctx, target, 420, 700)
  burst(ctx, at(target), { color: '#e0f2fe', count: 16, delay: 420, speed: 1.6 })
  lightning(ctx, target, { color: '#fde047', delay: 640, duration: 260 })
  flare(ctx, at(target), { color: '#facc15', rays: 8, delay: 660, size: 0.8 })
  shockwave(ctx, ground(target), { color: '#fde047', delay: 680, radius: 1.8, duration: 480 })
  cameraPunch(ctx, at(target), 0.6, 620)
  shake(ctx, strength, 660, 280)
  flinch(ctx, enemiesAround(ctx, source, target, 1.6), 700)
  return 660
}

const kangaskhanDizzyPunch: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 560
  const offset = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  ;[
    { delay: 90, side: -0.22 },
    { delay: 220, side: -0.3 },
  ].forEach((jab) => {
    extend(ctx, source, target, {
      color: '#a8a29e',
      tip: fist('#d6d3d1', '#fbcfe8', 0.08),
      delay: jab.delay,
      duration: 180,
      thickness: 0.035,
      side: jab.side,
      rise: -0.2,
    })
    burst(ctx, at(target), { color: '#fbcfe8', count: 8, delay: jab.delay + 80, speed: 1 })
  })
  fx(ctx, 280, 480, undefined, (p) => {
    const windUp = Math.sin(Math.PI * phase(p, 0, 0.5))
    source.pose.scale *= 1 + 0.12 * windUp
    source.pose.offset.addScaledVector(
      offset,
      (-0.12 * windUp + 0.35 * Math.sin(Math.PI * phase(p, 0.45, 1))) * m,
    )
  })
  extend(ctx, source, target, {
    color: '#78716c',
    tip: fist('#a8a29e', '#f9a8d4', 0.2),
    delay: impact - 120,
    duration: 300,
    thickness: 0.09,
    side: 0.12,
  })
  flare(ctx, at(target), { color: '#f472b6', rays: 8, delay: impact, size: 0.85 })
  shockwave(ctx, ground(target), { color: '#f9a8d4', delay: impact, radius: 1.3, duration: 420 })
  shake(ctx, strength, impact)

  const spiralPoints: THREE.Vector3[] = []
  for (let index = 0; index <= 60; index++) {
    const t = index / 60
    const angle = t * Math.PI * 6
    spiralPoints.push(new THREE.Vector3(Math.cos(angle) * t * 0.3, 0, Math.sin(angle) * t * 0.3))
  }
  const spiral = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(spiralPoints),
    new THREE.LineBasicMaterial({ color: '#fde047', transparent: true, depthWrite: false }),
  )
  fx(ctx, impact + 40, 1000, spiral, (p, now) => {
    spiral.position.copy(target.root.position).setY(target.height + 0.2)
    spiral.rotation.y = -now * 0.012
    setOpacity(spiral, fadeInOut(p, 0.1, 0.3))
    target.pose.tilt += Math.sin(p * Math.PI * 5) * 0.22 * (1 - p) * m
    target.pose.offset.x += Math.sin(p * Math.PI * 4) * 0.05 * (1 - p) * m
  })
  orbit(ctx, target, {
    color: '#facc15',
    build: () => new THREE.Mesh(starGeometry(5, 0.08, 0.035), flat('#facc15')),
    count: 3,
    delay: impact + 60,
    duration: 1000,
    radius: 0.32,
    heightFactor: 1.27,
    turns: 2.5,
  })
  return impact
}

function hornArc(color: string): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.045, 6, 18, Math.PI * 0.75),
    standard(color, { roughness: 0.5, flatShading: true }),
  )
}

const pinsirXScissor: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 520
  const victims = enemiesInLine(ctx, source, target)

  const horns = new THREE.Group()
  const left = hornArc('#d6d3d1')
  const right = hornArc('#d6d3d1')
  right.scale.x = -1
  horns.add(left, right)
  fx(ctx, 0, 480, horns, (p) => {
    horns.position
      .copy(source.root.position)
      .add(source.pose.offset)
      .setY(source.height + 0.15 + source.pose.lift)
    horns.quaternion.copy(ctx.camera.quaternion)
    const open = Math.sin(Math.PI * phase(p, 0, 0.6)) * 0.6
    const snap = phase(p, 0.6, 0.75) * 0.5
    left.rotation.z = 0.2 + open - snap
    right.rotation.z = -0.2 - open + snap
    setOpacity(horns, fadeInOut(p, 0.1, 0.2))
  })
  if (!ctx.reducedMotion) {
    dash(ctx, source, target, { delay: 360, duration: 560, through: true, hold: 0.3 })
    trail(ctx, source, { color: '#bef264', delay: 360, duration: 420 })
  }

  const cross = new THREE.Group()
  const strokes = [0.78, -0.78].map((angle) => {
    const stroke = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.14), glow('#a3e635', 0.95))
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), glow('#ffffff', 1))
    edge.position.z = 0.01
    stroke.add(edge)
    stroke.rotation.z = angle
    cross.add(stroke)
    return stroke
  })
  const center = new THREE.Vector3()
  const end = lineEnd(source, target, 1.8).setY(target.height * 0.55)
  fx(ctx, impact - 60, 620, cross, (p) => {
    const travel = easeInOut(phase(p, 0.45, 1))
    target.focusPoint(center, 0.55)
    cross.position.lerpVectors(center, end, travel)
    cross.quaternion.copy(ctx.camera.quaternion)
    strokes.forEach((stroke, index) => {
      const draw = easeInOut(phase(p, index * 0.1, 0.1 + index * 0.1))
      stroke.scale.set(Math.max(0.01, draw), 1, 1)
    })
    cross.scale.setScalar(1 + Math.sin(Math.PI * phase(p, 0.2, 0.45)) * 0.35)
    setOpacity(cross, 1 - phase(p, 0.7, 1))
  })
  burst(ctx, at(target), { color: '#d9f99d', count: 24, delay: impact, speed: 2.3 })
  shockwave(ctx, ground(target), { color: '#84cc16', delay: impact, radius: 1.4, duration: 420 })
  cameraPunch(ctx, at(target), 0.55, impact - 50)
  shake(ctx, strength, impact)
  flinchAlong(ctx, target, victims, impact + 120, 90)
  return impact
}

const laprasPerishSong: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 820
  const victims = [target, ...enemiesAround(ctx, source, target, 2.2).slice(0, 3)]
  fx(ctx, 0, 1000, undefined, (p) => {
    source.pose.tilt += Math.sin(p * Math.PI * 3) * 0.15 * m
    source.pose.lift += Math.sin(Math.PI * p) * 0.2 * m
  })
  ;[120, 320, 520].forEach((delay, index) =>
    shockwave(ctx, at(source, 0.7), {
      color: index % 2 ? '#5eead4' : '#a78bfa',
      delay,
      radius: 3,
      duration: 700,
      height: 0.75,
      thickness: 0.08,
    }),
  )

  const notes = new THREE.Group()
  const noteCount = scaledCount(ctx, 8)
  for (let index = 0; index < noteCount; index++) {
    notes.add(new THREE.Mesh(noteGeometry(0.09), flat(index % 2 ? '#7c3aed' : '#312e81', 0.95)))
  }
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  fx(ctx, 150, impact - 150, notes, (p) => {
    source.focusPoint(from, 0.9)
    notes.children.forEach((note, index) => {
      const victim = victims[index % victims.length]
      const local = phase(p, (index / noteCount) * 0.35, 0.65 + (index / noteCount) * 0.35)
      victim.focusPoint(to, 1.25)
      note.position.lerpVectors(from, to, easeInOut(local))
      note.position.y += Math.sin(Math.PI * local) * 0.9 + Math.sin(local * 14 + index) * 0.08
      note.quaternion.copy(ctx.camera.quaternion)
      note.rotateZ(Math.sin(local * 10 + index) * 0.4)
    })
    setOpacity(notes, fadeInOut(p, 0.1, 0.1))
  })

  victims.forEach((victim, index) => {
    orbit(ctx, victim, {
      color: '#a78bfa',
      build: (item) =>
        new THREE.Mesh(noteGeometry(0.07), flat(item % 2 ? '#a78bfa' : '#4c1d95', 0.95)),
      count: 3,
      delay: impact + index * 40,
      duration: 1100,
      radius: 0.36,
      heightFactor: 1.18,
      turns: 1.2,
    })
    burst(ctx, at(victim, 0.8), {
      color: '#6d28d9',
      count: 12,
      delay: impact + index * 40,
      speed: 1.2,
    })
  })
  shake(ctx, strength * 0.5, impact)
  flinch(ctx, victims.slice(1), impact + 40)
  return impact
}

const taurosHeadCharge: Choreography = (ctx, { source, target, shake: strength }) => {
  const impact = 440
  const direction = flatDirection(source, target)
  const behind = () => source.root.position.clone().addScaledVector(direction, -0.3).setY(0.1)
  crouch(ctx, source, { duration: 300 })
  burst(ctx, behind, { color: '#a8a29e', count: 10, delay: 60, speed: 0.9, spread: 'up' })
  burst(ctx, behind, { color: '#78716c', count: 10, delay: 200, speed: 0.9, spread: 'up' })
  shake(ctx, strength * 0.3, 60, 120)

  const horns = new THREE.Group()
  const left = hornArc('#e7e5e4')
  const right = hornArc('#e7e5e4')
  left.position.x = -0.18
  right.position.x = 0.18
  right.scale.x = -1
  left.rotation.set(-Math.PI / 2, 0, 0.9)
  right.rotation.set(-Math.PI / 2, 0, -0.9)
  const ram = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.1, 18, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.1),
    glow('#fef3c7', 0.35),
  )
  horns.add(left, right, ram)
  fx(ctx, 120, 700, horns, (p) => {
    horns.position
      .copy(source.root.position)
      .add(source.pose.offset)
      .addScaledVector(direction, 0.35)
    horns.position.y = 0.85 + source.pose.lift
    horns.lookAt(horns.position.clone().add(direction))
    ;(ram.material as THREE.MeshBasicMaterial).opacity =
      0.4 * Math.sin(Math.PI * phase(p, 0.25, 0.7))
    setOpacity(left, fadeInOut(p, 0.15, 0.2))
    setOpacity(right, fadeInOut(p, 0.15, 0.2))
  })
  if (!ctx.reducedMotion) {
    dash(ctx, source, target, { delay: 300, duration: 460, through: true, hold: 0.15 })
    motionLines(ctx, source, { color: '#fde68a', delay: 300, duration: 300 })
  }
  trail(ctx, source, { color: '#a8a29e', delay: 300, duration: 500 })
  flare(ctx, at(target), { color: '#f59e0b', rays: 8, delay: impact, size: 0.9 })
  debris(ctx, ground(target), { color: '#78716c', delay: impact, count: 8, speed: 1.8 })
  shockwave(ctx, ground(target), { color: '#fbbf24', delay: impact, radius: 1.6, duration: 450 })
  cameraPunch(ctx, at(target), 0.75, impact - 50)
  shake(ctx, strength * 1.1, impact, 320)
  flinch(ctx, enemiesInLine(ctx, source, target, { overshoot: 1.2 }), impact + 80)
  return impact
}

const dittoTransform: Choreography = (ctx, { source }) => {
  const m = motionScale(ctx)
  const pop = 650
  fx(ctx, 0, 1100, undefined, (p) => {
    const decay = 1 - p
    const jelly = Math.sin(p * Math.PI * 9) * decay
    source.pose.scale *= 1 + 0.14 * jelly * m
    source.pose.tilt += Math.sin(p * Math.PI * 6) * 0.2 * decay * m
    source.pose.lift += Math.sin(Math.PI * phase(p, 0.4, 0.7)) * 0.35 * m
  })

  const blob = new THREE.Group()
  const geometry = new THREE.IcosahedronGeometry(0.55, 3)
  const base = Float32Array.from(geometry.attributes.position.array)
  const goo = new THREE.Mesh(
    geometry,
    standard('#c084fc', { roughness: 0.25, flatShading: true, opacity: 0.7 }),
  )
  const eyes = new THREE.Group()
  const eyeGeometry = (x: number) => new THREE.CircleGeometry(0.035, 10).translate(x, 0.08, 0.56)
  const smile = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.125, 16, 1, Math.PI * 1.15, Math.PI * 0.7).translate(
      0,
      0.02,
      0.56,
    ),
    flat('#1e1b4b'),
  )
  eyes.add(
    new THREE.Mesh(eyeGeometry(-0.12), flat('#1e1b4b')),
    new THREE.Mesh(eyeGeometry(0.12), flat('#1e1b4b')),
    smile,
  )
  blob.add(goo, eyes)
  const positions = geometry.attributes.position
  fx(ctx, 0, 1150, blob, (p, now) => {
    blob.position.copy(source.root.position).setY(0.6 + source.pose.lift)
    eyes.quaternion.copy(ctx.camera.quaternion)
    const wobble = 0.12 * (1 - phase(p, 0.6, 1)) + 0.03
    for (let index = 0; index < positions.count; index++) {
      const x = base[index * 3]
      const y = base[index * 3 + 1]
      const z = base[index * 3 + 2]
      const n = 1 + wobble * Math.sin(now * 0.012 + x * 6 + y * 5) * Math.cos(now * 0.009 + z * 7)
      positions.setXYZ(index, x * n, y * n, z * n)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    const stretch = Math.sin(Math.PI * phase(p, 0.35, 0.56))
    const envelop = easeInOut(phase(p, 0, 0.25))
    const after = phase(p, 0.56, 1)
    blob.scale.set(
      envelop * (1 - stretch * 0.4),
      envelop * (1 + stretch * 0.9),
      envelop * (1 - stretch * 0.4),
    )
    setOpacity(blob, p < 0.56 ? 1 : 0.6 * (1 - after))
  })
  burst(ctx, at(source, 0.8), { color: '#f0abfc', count: 28, delay: pop, speed: 2.2 })
  shockwave(ctx, ground(source), { color: '#c084fc', delay: pop, radius: 2.2, duration: 600 })
  alliesAround(ctx, source, 4.2, 5).forEach((ally, index) => {
    aura(ctx, ally, {
      color: index === 0 ? '#e879f9' : '#c084fc',
      delay: pop + 60 + index * 50,
      duration: 800,
      count: 16,
    })
  })
  return pop
}

const porygonConversion: Choreography = (ctx, { source }) => {
  const m = motionScale(ctx)
  const apply = 620
  let step = -1
  const jump = new THREE.Vector3()
  fx(ctx, 0, 950, undefined, (p) => {
    const current = Math.floor(p * 16)
    if (current !== step) {
      step = current
      jump.set((Math.random() - 0.5) * 0.18, 0, (Math.random() - 0.5) * 0.18)
      if (Math.random() < 0.4) jump.set(0, 0, 0)
    }
    source.pose.offset.addScaledVector(jump, m)
    source.pose.scale *= 1 + (step % 3 === 0 ? 0.06 : 0) * m
  })

  const shells = new THREE.Group()
  const shapes = [
    new THREE.IcosahedronGeometry(0.62, 0),
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.BoxGeometry(0.55, 0.55, 0.55),
  ]
  shapes.forEach((shape, index) => {
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(shape),
      new THREE.LineBasicMaterial({
        color: index === 1 ? '#22d3ee' : '#f472b6',
        transparent: true,
        depthWrite: false,
      }),
    )
    shape.dispose()
    shells.add(lines)
  })
  fx(ctx, 0, 1100, shells, (p, now) => {
    shells.position.copy(source.root.position).setY(0.65)
    shells.children.forEach((shell, index) => {
      shell.rotation.set(now * 0.002 * (index + 1), now * 0.003 * (2 - index), 0)
      shell.scale.setScalar((0.6 + easeInOut(phase(p, 0, 0.3)) * 0.6) * (1 + index * 0.18))
    })
    const flicker = Math.floor(p * 40) % 5 === 0 ? 0.2 : 1
    setOpacity(shells, flicker * fadeInOut(p, 0.1, 0.3))
  })

  const pixelCount = scaledCount(ctx, 18)
  const pixels = new THREE.Group()
  const palette = ['#f472b6', '#22d3ee', '#f8fafc']
  for (let index = 0; index < pixelCount; index++) {
    pixels.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), glow(palette[index % 3], 0.95)),
    )
  }
  let pixelStep = -1
  fx(ctx, 80, 900, pixels, (p) => {
    const current = Math.floor(p * 12)
    if (current !== pixelStep) {
      pixelStep = current
      pixels.children.forEach((pixel) => {
        const angle = Math.random() * Math.PI * 2
        const radius = 0.3 + Math.random() * 0.8
        pixel.position.set(
          source.root.position.x + Math.cos(angle) * radius,
          Math.random() * 1.5,
          source.root.position.z + Math.sin(angle) * radius,
        )
        pixel.visible = Math.random() > 0.25
      })
    }
    setOpacity(pixels, 1 - phase(p, 0.7, 1))
  })

  const grid = new THREE.GridHelper(2.2, 11, '#67e8f9', '#22d3ee')
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
  gridMaterials.forEach((material) => {
    material.transparent = true
    material.depthWrite = false
  })
  fx(ctx, 200, 520, grid, (p) => {
    grid.position.copy(source.root.position).setY(0.05 + easeInOut(p) * 1.6)
    setOpacity(grid, Math.sin(Math.PI * p) * 0.8)
  })

  alliesAround(ctx, source, 4.2, 5).forEach((ally, index) => {
    const delay = apply + index * 60
    const cube = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.85, 1.15, 0.85)),
      new THREE.LineBasicMaterial({
        color: index % 2 ? '#f472b6' : '#22d3ee',
        transparent: true,
        depthWrite: false,
      }),
    )
    const glitch = new THREE.Vector3()
    fx(ctx, delay, 900, cube, (p) => {
      if (Math.floor(p * 30) % 4 === 0)
        glitch.set((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12)
      else glitch.set(0, 0, 0)
      cube.position.copy(ally.root.position).add(glitch).setY(0.62)
      const snap = 1 + (1 - easeInOut(phase(p, 0, 0.2))) * 0.8
      cube.scale.setScalar(snap)
      setOpacity(
        cube,
        (p < 0.2 && Math.floor(p * 50) % 2 === 0 ? 0.3 : 1) * (1 - phase(p, 0.65, 1)),
      )
    })
  })
  return apply
}

const lickitungWrap: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const bind = 380
  fx(ctx, 0, 1300, undefined, (p) => {
    source.pose.tilt -= Math.sin(Math.PI * phase(p, 0, 0.3)) * 0.25 * m
    source.pose.scale *= 1 + 0.08 * Math.sin(Math.PI * phase(p, 0, 0.25))
  })
  const mouth = new THREE.Vector3()
  const tongueEnd = new THREE.Vector3()
  const side = new THREE.Vector3()
  tube(ctx, {
    material: standard('#ec4899', { roughness: 0.3 }),
    controlPoints: 8,
    tubularSegments: 28,
    radius: 0.075,
    taper: true,
    delay: 80,
    duration: 1250,
    path: (p, points) => {
      const reach = p < 0.2 ? 1 - (1 - p / 0.2) ** 3 : p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15
      source.focusPoint(mouth, 0.45).add(source.pose.offset)
      target.focusPoint(tongueEnd, 0.5)
      tongueEnd.lerpVectors(mouth, tongueEnd, Math.max(0.02, reach))
      side.subVectors(tongueEnd, mouth).cross(UP).normalize()
      points.forEach((point, index) => {
        const t = index / (points.length - 1)
        point.lerpVectors(mouth, tongueEnd, t)
        // A lazy S-curve that stiffens once the tongue is latched on.
        const slack =
          0.18 * Math.sin(t * Math.PI * 2 + p * 8) * Math.sin(Math.PI * t) * (1 - reach * 0.6)
        point.addScaledVector(side, slack)
        point.y += Math.sin(Math.PI * t) * 0.15 * reach
      })
    },
  })
  coil(ctx, target, {
    color: '#f472b6',
    delay: bind - 80,
    duration: 1000,
    turns: 3,
    thickness: 0.06,
  })
  squash(ctx, target, { delay: bind, duration: 900, amount: 0.08 })
  burst(ctx, at(target), { color: '#f9a8d4', count: 16, delay: bind, speed: 1.4 })
  burst(ctx, at(target, 0.9), { color: '#fdf2f8', count: 8, delay: bind + 300, speed: 0.8 })
  shake(ctx, strength * 0.6, bind)
  return bind
}

const jynxLovelyKiss: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 780
  fx(ctx, 0, 560, undefined, (p) => {
    source.pose.offset.x += Math.sin(p * Math.PI * 4) * 0.08 * m
    source.pose.tilt += Math.sin(p * Math.PI * 4) * 0.18 * m
  })
  const heart = new THREE.Group()
  const outer = new THREE.Mesh(heartGeometry(0.3), glow('#f472b6', 0.9))
  const inner = new THREE.Mesh(heartGeometry(0.17), glow('#fdf2f8', 0.9))
  inner.position.z = 0.01
  heart.add(outer, inner)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  fx(ctx, 150, impact - 150, heart, (p) => {
    source.focusPoint(from, 0.7)
    target.focusPoint(to, 0.6)
    const travel = easeInOut(phase(p, 0.35, 1))
    heart.position.lerpVectors(from, to, travel)
    heart.position.y += Math.sin(Math.PI * travel) * 0.5
    heart.position.x += Math.sin(travel * Math.PI * 3) * 0.12
    heart.quaternion.copy(ctx.camera.quaternion)
    const form = easeInOut(phase(p, 0, 0.35))
    const beat = 1 + 0.12 * Math.max(0, Math.sin(p * Math.PI * 8))
    heart.scale.setScalar(Math.max(0.01, form * beat * (1 + travel * 0.3)))
  })

  const hearts = new THREE.Group()
  const heartCount = scaledCount(ctx, 9)
  const velocities = Array.from({ length: heartCount }, (_, index) => {
    hearts.add(new THREE.Mesh(heartGeometry(0.07), flat(index % 2 ? '#f9a8d4' : '#ec4899', 0.95)))
    const angle = (index / heartCount) * Math.PI * 2
    return new THREE.Vector2(Math.cos(angle), Math.sin(angle))
  })
  const origin = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  fx(ctx, impact, 700, hearts, (p) => {
    target.focusPoint(origin, 0.6)
    right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
    up.set(0, 1, 0).applyQuaternion(ctx.camera.quaternion)
    const spread = 1 - (1 - p) ** 2
    hearts.children.forEach((item, index) => {
      const velocity = velocities[index]
      item.position
        .copy(origin)
        .addScaledVector(right, velocity.x * spread * 0.8)
        .addScaledVector(up, velocity.y * spread * 0.8 + p * 0.3)
      item.quaternion.copy(ctx.camera.quaternion)
    })
    setOpacity(hearts, 1 - p)
  })
  shockwave(ctx, ground(target), { color: '#f9a8d4', delay: impact, radius: 1.9, duration: 550 })
  shake(ctx, strength * 0.5, impact)

  const sleepers = [target, ...enemiesAround(ctx, source, target, 1.9).slice(0, 3)]
  sleepers.forEach((sleeper, index) => {
    const delay = impact + 80 + index * 50
    zzz(ctx, sleeper, { color: '#e0e7ff', delay, duration: 1200 })
    fx(ctx, delay, 1200, undefined, (p) => {
      sleeper.pose.tilt += Math.sin(Math.PI * phase(p, 0, 0.3)) * 0.25 * m * (1 - phase(p, 0.7, 1))
    })
  })
  flinch(ctx, sleepers.slice(1), impact + 60)
  return impact
}

const snorlaxHeavySlam: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const scale = starPower(source)
  const impact = 880
  const offset = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  const landing = offset.length() > 0.01 ? Math.max(0, 1 - 0.7 / offset.length()) : 0
  fx(ctx, 0, 1250, undefined, (p) => {
    const t = p * 1250
    if (t < 300) {
      const squat = Math.sin((Math.PI * t) / 300)
      source.pose.scale *= 1 - 0.2 * squat
      source.pose.lift -= 0.1 * squat
      return
    }
    if (t < impact) {
      const air = (t - 300) / (impact - 300)
      const height =
        air < 0.6 ? Math.sin((air / 0.6) * (Math.PI / 2)) : 1 - ((air - 0.6) / 0.4) ** 3
      source.pose.lift += height * 2.8 * m
      source.pose.offset.addScaledVector(offset, easeInOut(air) * landing * m)
      source.pose.scale *= 1 + 0.35 * Math.sin(Math.PI * Math.min(1, air * 1.1))
      return
    }
    const settle = (t - impact) / (1250 - impact)
    source.pose.offset.addScaledVector(offset, landing * m * (1 - easeInOut(settle)))
    source.pose.scale *= 1 - 0.18 * Math.sin(Math.PI * Math.min(1, settle * 2)) * (1 - settle)
    source.pose.lift += Math.abs(Math.sin(settle * Math.PI * 2)) * 0.15 * (1 - settle) * m
  })

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), flat('#000000', 0.45))
  shadow.rotation.x = -Math.PI / 2
  fx(ctx, 300, impact - 300, shadow, (p) => {
    shadow.position.copy(target.root.position).setY(0.06)
    shadow.scale.setScalar(0.3 + p * p * scale)
    setOpacity(shadow, 0.3 + p * 0.7)
  })

  const crater = new THREE.Mesh(new THREE.CircleGeometry(1.3 * scale, 40), flat('#3f2a1d', 0.8))
  crater.rotation.x = -Math.PI / 2
  fx(ctx, impact, 1000, crater, (p) => {
    crater.position.copy(target.root.position).setY(0.07)
    crater.scale.setScalar(0.6 + easeInOut(phase(p, 0, 0.15)) * 0.4)
    setOpacity(crater, 1 - phase(p, 0.6, 1))
  })
  groundCracks(ctx, ground(target), {
    color: '#fbbf24',
    count: 10,
    length: 1.3 * scale,
    delay: impact,
    duration: 1000,
  })
  shockwave(ctx, ground(target), {
    color: '#f5f5f4',
    delay: impact,
    radius: 3 * scale,
    thickness: 0.35,
    duration: 650,
  })
  shockwave(ctx, ground(target), {
    color: '#a16207',
    delay: impact + 90,
    radius: 2.1 * scale,
    duration: 600,
  })
  debris(ctx, ground(target), {
    color: '#78716c',
    delay: impact,
    count: 14,
    speed: 2.8,
    size: 0.11,
  })
  burst(ctx, ground(target), {
    color: '#d6d3d1',
    count: 30,
    delay: impact,
    speed: 2.6,
    spread: 'ring',
    gravity: 0,
  })
  cameraPunch(ctx, ground(target), 1, impact - 60)
  shake(ctx, strength * 1.5, impact, 460)
  flinch(ctx, enemiesAround(ctx, source, target, 1.9 * scale), impact + 30, 25)
  return impact
}

const aerodactylStoneEdge: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const direction = flatDirection(source, target)
  const side = new THREE.Vector3().crossVectors(direction, UP)
  const origin = source.root.position.clone().setY(0)
  const distance = origin.distanceTo(target.root.position.clone().setY(0))
  const length = distance + 1.4
  const first = 280
  const perUnit = 90
  fx(ctx, 0, 1200, undefined, (p) => {
    source.pose.lift +=
      (Math.sin(Math.PI * phase(p, 0, 0.3)) * 0.35 + 0.3 * phase(p, 0, 0.2)) *
      m *
      (1 - phase(p, 0.8, 1))
    source.pose.scale *= 1 + 0.06 * Math.sin(p * Math.PI * 10)
  })
  orbit(ctx, source, {
    color: '#a8a29e',
    build: () => rockMesh('#a8a29e', 0.09),
    count: 4,
    delay: 0,
    duration: 380,
    radius: 0.5,
    heightFactor: 0.64,
    turns: 1.2,
  })

  const ridge = new THREE.Group()
  const specs: { mesh: THREE.Group; at: number; height: number }[] = []
  const stepSize = 0.45
  for (let travel = 0.5; travel <= length; travel += stepSize) {
    const nearTarget = Math.abs(travel - distance) < stepSize * 0.75
    const cluster = nearTarget ? 3 : 1
    for (let index = 0; index < cluster; index++) {
      const height = (nearTarget ? 1.25 : 0.6 + travel * 0.08) * (0.8 + Math.random() * 0.4)
      const radius = height * 0.22
      const spike = new THREE.Group()
      const rock = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 5).translate(0, height / 2, 0),
        standard('#78716c', { roughness: 0.95, flatShading: true }),
      )
      const sheen = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 1.15, height * 1.05, 5).translate(0, height / 2, 0),
        glow('#bae6fd', 0.22),
      )
      spike.add(rock, sheen)
      const lateral = (Math.random() - 0.5) * 0.35 + (cluster > 1 ? (index - 1) * 0.3 : 0)
      spike.position.copy(origin).addScaledVector(direction, travel).addScaledVector(side, lateral)
      spike.rotation.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.5,
      )
      ridge.add(spike)
      specs.push({ mesh: spike, at: first + travel * perUnit, height })
    }
  }
  const total = first + length * perUnit + 700
  fx(ctx, 0, total, ridge, (p) => {
    const t = p * total
    specs.forEach((spec) => {
      const local = (t - spec.at) / 160
      const grow =
        local <= 0 ? 0 : local < 1 ? 1 + Math.sin(local * Math.PI) * 0.25 - (1 - local) ** 2 : 1
      spec.mesh.scale.set(1, Math.max(0.001, grow), 1)
      spec.mesh.visible = local > 0
    })
    setOpacity(ridge, 1 - phase(p, 0.82, 1))
  })

  const impact = Math.round(first + distance * perUnit + 60)
  const dustAt = (travel: number) => () =>
    origin.clone().addScaledVector(direction, travel).setY(0.1)
  burst(ctx, dustAt(distance * 0.4), {
    color: '#a8a29e',
    count: 12,
    delay: first + distance * 0.4 * perUnit,
    speed: 1.2,
    spread: 'up',
  })
  debris(ctx, ground(target), { color: '#57534e', delay: impact, count: 10, speed: 1.6 })
  burst(ctx, at(target), { color: '#e0f2fe', count: 20, delay: impact, speed: 2.2 })
  cameraPunch(ctx, at(target), 0.7, impact - 60)
  shake(ctx, strength * 1.2, impact, 360)
  enemiesInLine(ctx, source, target, { overshoot: 1.4, width: 0.55 }).forEach((victim) => {
    const along = victim.root.position.clone().setY(0).sub(origin).dot(direction)
    flinch(ctx, [victim], Math.round(first + along * perUnit + 60))
  })
  return impact
}

function birdHalo(
  ctx: FxContext,
  view: UnitView,
  color: string,
  core: string,
  duration: number,
): void {
  const group = new THREE.Group()
  const outer = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), glow(color, 0.1))
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.012, 6, 48), glow(core, 0.5))
  group.add(outer, rim)
  const center = new THREE.Vector3()
  fx(ctx, 0, duration, group, (p, now) => {
    group.position.copy(bodyPoint(view, 0.58, center))
    const breathe = 1 + 0.06 * Math.sin(now * 0.006)
    rim.quaternion.copy(ctx.camera.quaternion)
    group.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.2)) * breathe))
    setOpacity(group, fadeInOut(p, 0.1, 0.25))
  })
}

function blizzardGust(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  delay: number,
  duration: number,
): void {
  const count = scaledCount(ctx, 80)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const near = new THREE.Color('#bae6fd')
  const far = new THREE.Color('#38bdf8')
  const seeds = Array.from({ length: count }, () => ({
    offset: Math.random(),
    spread: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5),
    spin: Math.random() * Math.PI * 2,
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  points.frustumCulled = false
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const point = new THREE.Vector3()
  const color = new THREE.Color()
  fx(ctx, delay, duration, points, (p) => {
    bodyPoint(source, 0.62, from)
    target.focusPoint(to, 0.5)
    const envelope = fadeInOut(p, 0.1, 0.35)
    seeds.forEach((seed, index) => {
      const t = (seed.offset + p * 2.4) % 1
      const swirl = seed.spin + t * 7
      point
        .lerpVectors(from, to, t)
        .addScaledVector(seed.spread, t * 1.1)
        .add(scratchSwirl.set(Math.cos(swirl), Math.sin(swirl), 0).multiplyScalar(0.12 * t))
      positions.set([point.x, point.y, point.z], index * 3)
      color
        .copy(near)
        .lerp(far, t)
        .multiplyScalar(envelope * Math.sin(Math.PI * t) + 0.05)
      colors.set([color.r, color.g, color.b], index * 3)
    })
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })
}

const scratchSwirl = new THREE.Vector3()

function blizzardStorm(ctx: FxContext, target: UnitView, delay: number, duration: number): void {
  const group = new THREE.Group()
  const snowCount = scaledCount(ctx, 140)
  const snowPositions = new Float32Array(snowCount * 3)
  const snowSeeds = Array.from({ length: snowCount }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 0.25 + Math.random() * 1.8,
    height: Math.random() * 2.6,
    speed: 2 + Math.random() * 2.5,
  }))
  const snowGeometry = new THREE.BufferGeometry()
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
  const snow = new THREE.Points(
    snowGeometry,
    new THREE.PointsMaterial({
      color: '#dbeafe',
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  )
  snow.frustumCulled = false
  const flakes = Array.from({ length: 8 }, (_, index) => {
    const flake = new THREE.Mesh(
      snowflakeGeometry(0.13 + (index % 3) * 0.04),
      glow(index % 2 ? '#7dd3fc' : '#38bdf8', 0.7),
    )
    return { flake, offset: index / 8, spin: Math.random() * 6 }
  })
  const segments = 26
  const winds = Array.from({ length: 3 }, () => ribbonMesh(segments))
  const windPoints = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const windFrom = new THREE.Color('#38bdf8')
  const windTo = new THREE.Color('#a5b4fc')
  group.add(snow, ...flakes.map(({ flake }) => flake), ...winds)
  const center = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const forward = new THREE.Vector3()
  fx(ctx, delay, duration, group, (p, now) => {
    center.copy(target.root.position).setY(0)
    cameraAxes(ctx, right, up, forward)
    const whirl = easeInOut(phase(p, 0, 0.25))
    const fade = fadeInOut(p, 0.1, 0.25)
    snowSeeds.forEach((seed, index) => {
      const angle = seed.angle + p * seed.speed * 4
      const radius = seed.radius * (0.35 + whirl * 0.65) * (1 - 0.25 * Math.sin(p * Math.PI))
      snowPositions[index * 3] = center.x + Math.cos(angle) * radius
      snowPositions[index * 3 + 1] = (seed.height - p * 1.8 + 2.6 * 4) % 2.6
      snowPositions[index * 3 + 2] = center.z + Math.sin(angle) * radius
    })
    snowGeometry.attributes.position.needsUpdate = true
    flakes.forEach(({ flake, offset, spin }) => {
      const t = (offset + p * 0.9) % 1
      const angle = offset * Math.PI * 2 + p * 7
      const radius = (1.6 - t * 1.1) * whirl
      flake.position.set(
        center.x + Math.cos(angle) * radius,
        0.3 + t * 2,
        center.z + Math.sin(angle) * radius,
      )
      flake.quaternion.copy(ctx.camera.quaternion)
      flake.rotateZ(spin + now * 0.004)
      flake.scale.setScalar(Math.max(0.01, whirl * Math.sin(Math.PI * t) * 1.3))
    })
    winds.forEach((wind, index) => {
      windPoints.forEach((point, step) => {
        const t = step / segments
        const angle = t * Math.PI * 2.2 + p * 9 + (index * Math.PI * 2) / 3
        const radius = (1.7 - t * 1.1) * whirl
        point.set(
          center.x + Math.cos(angle) * radius,
          0.15 + t * 2.3 + index * 0.1,
          center.z + Math.sin(angle) * radius,
        )
      })
      writeRibbon(
        wind,
        windPoints,
        forward,
        (t) => 0.1 * Math.sin(Math.PI * t) + 0.02,
        (t, out) => {
          out
            .copy(windFrom)
            .lerp(windTo, t)
            .multiplyScalar(Math.sin(Math.PI * t) * fade * 0.6)
        },
      )
    })
    setOpacity(snow, fade)
    flakes.forEach(({ flake }) => setOpacity(flake, fade))
  })
}

const articunoBlizzard: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 760
  fx(ctx, 0, 1700, undefined, (p, now) => {
    const rise = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.82, 1)))
    source.pose.lift += (0.42 + Math.sin(now * 0.004) * 0.06) * rise * m
    source.pose.tilt += Math.sin(now * 0.003) * 0.04 * rise * m
  })
  legendaryWings(ctx, source, {
    style: 'crystal',
    color: '#0ea5e9',
    core: '#bae6fd',
    accent: '#818cf8',
    span: 1.35,
    feathers: 9,
    flapRate: 0.9,
    flapAmount: 0.16,
    thrust: [0.3, 0.46],
    duration: 1700,
  })
  tailRibbons(ctx, source, {
    from: '#bae6fd',
    to: '#6366f1',
    count: 3,
    length: 1.9,
    width: 0.15,
    spread: 0.18,
    droop: 0.55,
    delay: 60,
    duration: 1640,
  })
  birdHalo(ctx, source, '#38bdf8', '#bae6fd', 1500)
  orbit(ctx, source, {
    color: '#bae6fd',
    count: 6,
    radius: 0.62,
    turns: 1.4,
    billboard: true,
    duration: 1400,
    build: (index) =>
      new THREE.Mesh(snowflakeGeometry(0.08), glow(index % 2 ? '#bae6fd' : '#38bdf8', 0.75)),
  })
  chargeOrb(ctx, bodyAt(source, 0.62), {
    color: '#38bdf8',
    core: '#bae6fd',
    size: 0.26,
    count: 18,
    delay: 100,
    duration: 420,
  })
  blizzardGust(ctx, source, target, 440, 760)
  blizzardStorm(ctx, target, 380, 1360)
  frostFloor(ctx, ground(target), { radius: 1.9, delay: impact - 140, duration: 1150 })
  shockwave(ctx, ground(target), {
    color: '#7dd3fc',
    delay: impact,
    radius: 2.2,
    duration: 700,
    thickness: 0.2,
  })
  shockwave(ctx, ground(target), {
    color: '#818cf8',
    delay: impact + 120,
    radius: 1.5,
    duration: 600,
    thickness: 0.1,
  })

  const frozen = [target, ...enemiesAround(ctx, source, target, 2).slice(0, 3)]
  frozen.forEach((victim, index) => {
    const delay = impact + index * 70
    iceCrystalPrison(ctx, victim, {
      delay,
      duration: 900 - index * 30,
      shatterAt: 0.58,
      size: index ? 0.85 : 1,
    })
    shiver(ctx, victim, { delay, duration: 520, amount: 0.03, speed: 80 })
  })
  driftMotes(ctx, ground(target), {
    colors: ['#bae6fd', '#7dd3fc', '#a5b4fc'],
    count: 50,
    radius: 1.8,
    height: 2.2,
    cycles: -0.8,
    sway: 0.08,
    size: 0.06,
    twinkle: true,
    delay: impact,
    duration: 1000,
  })
  cloud(ctx, ground(target), {
    color: '#bfdbfe',
    count: 7,
    radius: 1.3,
    size: 0.4,
    rise: 0.3,
    opacity: 0.22,
    delay: impact + 380,
    duration: 640,
  })
  cameraPunch(ctx, at(target), 0.5, impact - 60)
  shake(ctx, strength, impact, 380)
  flinch(ctx, frozen.slice(1), impact + 60, 70)
  return impact
}

function thunderCloud(
  ctx: FxContext,
  target: UnitView,
  height: number,
  strikes: number[],
  delay: number,
  duration: number,
): void {
  const cloud = new THREE.Group()
  const puffs = Array.from({ length: 16 }, (_, index) => {
    const lower = index < 9
    const angle = (index / (lower ? 9 : 7)) * Math.PI * 2 + (lower ? 0 : 0.4)
    const radius = index === 0 || index === 9 ? 0 : lower ? 0.8 + (index % 3) * 0.35 : 0.6
    const material = standard(lower ? '#1e293b' : '#475569', {
      roughness: 1,
      flatShading: true,
      emissive: '#facc15',
      emissiveIntensity: 0,
      opacity: 0.94,
    })
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.3, 1),
      material,
    )
    const base = new THREE.Vector3(
      Math.cos(angle) * radius,
      lower ? (Math.random() - 0.5) * 0.2 : 0.35 + Math.random() * 0.2,
      Math.sin(angle) * radius,
    )
    puff.scale.y = 0.62
    cloud.add(puff)
    return { puff, material, base, seed: Math.random() * 10, size: 1 }
  })
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 16, 10).scale(1.8, 0.45, 1.8),
    glow('#fde047', 0),
  )
  inner.position.y = -0.2
  cloud.add(inner)
  let lastSheet = -1
  fx(ctx, delay, duration, cloud, (p, now) => {
    cloud.position.copy(target.root.position).setY(height)
    cloud.rotation.y = now * 0.0006
    cloud.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.25))))
    const t = delay + p * duration
    const lit = strikes.some((strike) => t >= strike - 20 && t < strike + 80)
    const sheet = now - lastSheet > 110
    if (sheet) lastSheet = now
    puffs.forEach(({ puff, material, base, seed }) => {
      const boil = 1 + 0.12 * Math.sin(now * 0.004 + seed) + 0.05 * Math.sin(now * 0.011 + seed)
      puff.position.set(base.x, base.y + Math.sin(now * 0.003 + seed) * 0.06, base.z)
      puff.scale.set(boil, 0.62 * boil, boil)
      if (sheet) material.emissiveIntensity = lit ? 0.7 : Math.random() < 0.12 ? 0.35 : 0
    })
    const fade = 1 - phase(p, 0.8, 1)
    ;(inner.material as THREE.MeshBasicMaterial).opacity =
      (lit ? 0.35 : 0.05 + 0.03 * Math.sin(now * 0.02)) * fade
    puffs.forEach(({ material }) => (material.opacity = 0.94 * fade))
  })
}

function stormRain(
  ctx: FxContext,
  target: UnitView,
  height: number,
  delay: number,
  duration: number,
): void {
  const count = scaledCount(ctx, 44)
  const positions = new Float32Array(count * 6)
  const seeds = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 2.8,
    z: (Math.random() - 0.5) * 2.8,
    offset: Math.random(),
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const rain = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#94a3b8',
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  )
  rain.frustumCulled = false
  fx(ctx, delay, duration, rain, (p) => {
    const base = target.root.position
    seeds.forEach((seed, index) => {
      const y = height - 0.2 - ((seed.offset + p * 5) % 1) * (height - 0.2)
      positions.set(
        [base.x + seed.x, y, base.z + seed.z, base.x + seed.x - 0.05, y - 0.3, base.z + seed.z],
        index * 6,
      )
    })
    geometry.attributes.position.needsUpdate = true
    setOpacity(rain, fadeInOut(p, 0.15, 0.3))
  })
}

const zapdosThunderstorm: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 620
  const cloudHeight = 3.2
  fx(ctx, 0, 1500, undefined, (p, now) => {
    const rise = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.82, 1)))
    source.pose.lift += (0.4 + Math.sin(now * 0.006) * 0.05) * rise * m
    source.pose.offset.x += (Math.random() - 0.5) * 0.035 * m * rise
  })
  legendaryWings(ctx, source, {
    style: 'spike',
    color: '#facc15',
    core: '#fef9c3',
    accent: '#f59e0b',
    span: 1.3,
    feathers: 8,
    flapRate: 1.8,
    flapAmount: 0.12,
    thrust: [0.28, 0.4],
    duration: 1500,
  })
  aura(ctx, source, { color: '#fde047', duration: 700, count: 22, radius: 0.5 })
  zap(
    ctx,
    offsetPoint(bodyAt(source, 0.85), new THREE.Vector3(-0.55, 0.15, 0)),
    offsetPoint(bodyAt(source, 0.45), new THREE.Vector3(0.5, -0.1, 0)),
    { color: '#facc15', core: '#fef9c3', delay: 140, duration: 460, jitter: 0.22 },
  )
  zap(
    ctx,
    offsetPoint(bodyAt(source, 0.8), new THREE.Vector3(0.6, 0.2, 0)),
    offsetPoint(bodyAt(source, 0.4), new THREE.Vector3(-0.45, -0.15, 0)),
    { color: '#fde047', core: '#fef9c3', delay: 240, duration: 420, jitter: 0.22 },
  )
  chargeOrb(ctx, bodyAt(source, 0.7), {
    color: '#facc15',
    core: '#fef08a',
    size: 0.24,
    count: 18,
    delay: 100,
    duration: 360,
  })
  const cloudBase = new THREE.Vector3()
  const fromCloud = (dx: number, dz: number) => () =>
    cloudBase.set(target.root.position.x + dx, cloudHeight - 0.35, target.root.position.z + dz)
  forkedBolt(ctx, bodyAt(source, 0.8), fromCloud(0, 0), {
    color: '#facc15',
    width: 0.1,
    branches: 2,
    segments: 12,
    reveal: 0.2,
    delay: 420,
    duration: 260,
  })
  const victims = [target, ...enemiesAround(ctx, source, target, 2).slice(0, 3)]
  const strikes = victims.map((_, index) => impact + index * 110)
  strikes.push(impact + 420)
  thunderCloud(ctx, target, cloudHeight, strikes, 160, 1460)
  stormRain(ctx, target, cloudHeight, 360, 1180)

  victims.forEach((victim, index) => {
    const delay = strikes[index]
    const main = index === 0
    forkedBolt(ctx, fromCloud((index % 2 ? 0.3 : -0.3) * index, 0.2 * index), at(victim, 0.45), {
      color: '#facc15',
      width: main ? 0.22 : 0.15,
      branches: main ? 4 : 3,
      segments: 12,
      jitter: 0.45,
      delay,
      duration: 340,
    })
    groundArcs(ctx, ground(victim), {
      color: '#facc15',
      radius: main ? 0.85 : 0.55,
      arcs: main ? 6 : 4,
      delay,
      duration: 800,
    })
    burst(ctx, at(victim), { color: '#fde047', count: 12, delay, speed: 2 })
    if (!main) {
      forkedBolt(ctx, at(target, 0.4), at(victim, 0.4), {
        color: '#fde047',
        width: 0.07,
        segments: 8,
        branches: 1,
        jitter: 0.25,
        reveal: 0.25,
        delay: delay + 40,
        duration: 260,
      })
      flinch(ctx, [victim], delay)
    }
  })
  forkedBolt(ctx, fromCloud(0.15, -0.1), at(target, 0.45), {
    color: '#fde047',
    width: 0.17,
    branches: 3,
    segments: 12,
    jitter: 0.4,
    delay: strikes[strikes.length - 1],
    duration: 300,
  })
  shockwave(ctx, ground(target), { color: '#fde047', delay: impact, radius: 2, duration: 520 })
  cameraPunch(ctx, at(target), 0.5, impact - 40)
  shake(ctx, strength, impact, 480)
  return impact
}

function fireWave(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  delay: number,
  duration: number,
): void {
  const segments = 28
  const mesh = ribbonMesh(segments)
  const points = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const side = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const hot = new THREE.Color('#fde047')
  const deep = new THREE.Color('#dc2626')
  fx(ctx, delay, duration, mesh, (p) => {
    bodyPoint(source, 0.6, from)
    target.focusPoint(to, 0.35)
    cameraAxes(ctx, right, up, forward)
    side.subVectors(to, from).setY(0).cross(UP).normalize()
    const head = easeOut(phase(p, 0, 0.4))
    const tail = easeIn(phase(p, 0.25, 0.9))
    points.forEach((point, index) => {
      const u = tail + (head - tail) * (index / segments)
      point
        .lerpVectors(from, to, u)
        .addScaledVector(side, Math.sin(Math.PI * u) * 0.9)
        .addScaledVector(UP, Math.sin(Math.PI * u) * 0.55)
    })
    writeRibbon(
      mesh,
      points,
      forward,
      (t) => 0.55 * Math.sin(Math.PI * t) + 0.04,
      (t, out) => {
        out
          .copy(deep)
          .lerp(hot, t)
          .multiplyScalar(0.2 + 0.5 * Math.sin(Math.PI * t))
      },
    )
  })
}

function fireSweep(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  radius: number,
  delay: number,
  duration: number,
): void {
  const sweep = Math.PI * 1.7
  const toward = flatDirection(target, source)
  const startAngle = Math.atan2(-toward.z, toward.x) - sweep / 2
  const group = new THREE.Group()
  const bandSegments = 48
  const bands = [
    new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.25, radius + 0.25, bandSegments, 1, startAngle, sweep),
      glow('#ea580c', 0.45),
    ),
    new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.08, radius + 0.08, bandSegments, 1, startAngle, sweep),
      glow('#fbbf24', 0.55),
    ),
  ]
  const floor = new THREE.Group()
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.07
  floor.add(...bands)
  group.add(floor)
  const tongueCount = Math.max(8, Math.round(16 * Math.max(0.5, ctx.particleScale)))
  const tongues = Array.from({ length: tongueCount }, (_, index) => {
    const t = index / (tongueCount - 1)
    const angle = startAngle + sweep * t
    const tongue = new THREE.Group()
    const height = 0.7 + Math.random() * 0.5
    tongue.add(
      new THREE.Mesh(
        paintVertical(
          new THREE.ConeGeometry(0.16, 1, 7, 4, true).translate(0, 0.5, 0),
          '#f97316',
          '#dc2626',
          1,
        ),
        gradientGlow(0.7),
      ),
      new THREE.Mesh(
        paintVertical(
          new THREE.ConeGeometry(0.07, 0.65, 6, 3, true).translate(0, 0.325, 0),
          '#fbbf24',
          '#f97316',
          0.65,
        ),
        gradientGlow(0.7),
      ),
    )
    tongue.position.set(Math.cos(angle) * radius, 0, -Math.sin(angle) * radius)
    group.add(tongue)
    return { tongue, birth: 0.3 * t, height, seed: Math.random() * 10 }
  })
  const headOrb = new THREE.Group()
  headOrb.add(
    new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), glow('#fbbf24', 0.7)),
    new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), glow('#ea580c', 0.3)),
  )
  group.add(headOrb)
  fx(ctx, delay, duration, group, (p, now) => {
    group.position.copy(target.root.position).setY(0)
    const head = clamp01(p / 0.3)
    bands.forEach((band) => band.geometry.setDrawRange(0, 6 * Math.ceil(bandSegments * head)))
    const headAngle = startAngle + sweep * head
    headOrb.position.set(Math.cos(headAngle) * radius, 0.25, -Math.sin(headAngle) * radius)
    headOrb.visible = head < 1
    const fade = 1 - phase(p, 0.7, 1)
    tongues.forEach(({ tongue, birth, height, seed }) => {
      const life = easeOut(clamp01((p - birth) / 0.12)) * fade
      const flicker = 0.75 + 0.25 * Math.sin(now * 0.035 + seed) + 0.1 * Math.sin(now * 0.08 + seed)
      tongue.scale.set(0.8 + 0.3 * life, Math.max(0.001, height * life * flicker), 0.8 + 0.3 * life)
    })
    setOpacity(floor, fade)
  })
}

function flamePillar(
  ctx: FxContext,
  victim: UnitView,
  height: number,
  delay: number,
  duration: number,
): void {
  const group = new THREE.Group()
  const column = new THREE.Mesh(
    paintVertical(
      new THREE.CylinderGeometry(0.3, 0.42, height, 18, 8, true).translate(0, height / 2, 0),
      '#f97316',
      '#b91c1c',
      height,
    ),
    gradientGlow(0.6),
  )
  const core = new THREE.Mesh(
    paintVertical(
      new THREE.CylinderGeometry(0.12, 0.2, height * 0.8, 12, 6, true).translate(
        0,
        height * 0.4,
        0,
      ),
      '#fbbf24',
      '#ea580c',
      height * 0.8,
    ),
    gradientGlow(0.65),
  )
  const tongues = Array.from({ length: 5 }, (_, index) => {
    const angle = (index / 5) * Math.PI * 2
    const tongue = new THREE.Mesh(
      paintVertical(
        new THREE.ConeGeometry(0.12, 0.8, 6, 3, true).translate(0, 0.4, 0),
        '#fb923c',
        '#dc2626',
        0.8,
      ),
      gradientGlow(0.7),
    )
    tongue.position.set(Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38)
    tongue.rotation.set(Math.sin(angle) * 0.35, 0, -Math.cos(angle) * 0.35)
    return { tongue, seed: Math.random() * 10 }
  })
  group.add(column, core, ...tongues.map(({ tongue }) => tongue))
  fx(ctx, delay, duration, group, (p, now) => {
    group.position.copy(victim.root.position).setY(0.02)
    const grow = easeOut(phase(p, 0, 0.2))
    const shrink = 1 - easeInOut(phase(p, 0.65, 1))
    const flicker = 1 + 0.08 * Math.sin(now * 0.04)
    column.scale.set(
      shrink * flicker,
      Math.max(0.001, grow * (0.6 + 0.4 * shrink)),
      shrink * flicker,
    )
    core.scale.set(shrink, Math.max(0.001, grow), shrink)
    column.rotation.y = now * 0.006
    tongues.forEach(({ tongue, seed }) => {
      tongue.scale.y = Math.max(0.001, grow * shrink * (0.8 + 0.3 * Math.sin(now * 0.04 + seed)))
    })
  })
}

function scorchMark(ctx: FxContext, center: UnitView, delay: number, duration: number): void {
  const group = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), flat('#1c1917', 0.45))
  const rim = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.55, 56), glow('#f97316', 0.55))
  const inner = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), glow('#fb923c', 0.35))
  rim.position.z = 0.004
  inner.position.z = 0.004
  group.add(disc, rim, inner)
  group.rotation.x = -Math.PI / 2
  fx(ctx, delay, duration, group, (p, now) => {
    group.position.copy(center.root.position).setY(0.065)
    group.scale.setScalar(Math.max(0.01, easeOut(phase(p, 0, 0.2))))
    setOpacity(group, fadeInOut(p, 0.05, 0.35))
    ;(rim.material as THREE.MeshBasicMaterial).opacity *= 0.75 + 0.25 * Math.sin(now * 0.02)
  })
}

function heatHaze(ctx: FxContext, center: UnitView, delay: number, duration: number): void {
  const group = new THREE.Group()
  const sheets = Array.from({ length: 3 }, (_, index) => {
    const geometry = paintVertical(
      new THREE.PlaneGeometry(1.1, 2, 1, 16).translate(0, 1, 0),
      '#fb923c',
      '#7c2d12',
      2,
    )
    const rest = Float32Array.from(geometry.attributes.position.array)
    const sheet = new THREE.Mesh(geometry, gradientGlow(0.16))
    group.add(sheet)
    return { sheet, rest, offset: (index - 1) * 0.8, seed: index * 2.1 }
  })
  fx(ctx, delay, duration, group, (p, now) => {
    const base = center.root.position
    sheets.forEach(({ sheet, rest, offset, seed }) => {
      sheet.position.set(base.x, 0.05, base.z)
      sheet.quaternion.copy(ctx.camera.quaternion)
      sheet.translateX(offset)
      const position = sheet.geometry.attributes.position as THREE.BufferAttribute
      for (let index = 0; index < position.count; index++) {
        const y = rest[index * 3 + 1]
        position.setX(index, rest[index * 3] + Math.sin(y * 5 + now * 0.012 + seed) * 0.07 * y)
      }
      position.needsUpdate = true
    })
    setOpacity(group, fadeInOut(p, 0.2, 0.4))
  })
}

const moltresInfernoWing: Choreography = (ctx, { source, target, shake: strength }) => {
  const m = motionScale(ctx)
  const impact = 700
  fx(ctx, 0, 1600, undefined, (p, now) => {
    const rise = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.82, 1)))
    const rear = Math.sin(Math.PI * phase(p, 0.15, 0.34)) - Math.sin(Math.PI * phase(p, 0.34, 0.5))
    source.pose.lift += (0.45 + Math.sin(now * 0.005) * 0.05) * rise * m
    source.pose.tilt += rear * 0.12 * m
    source.pose.scale *= 1 + 0.06 * Math.sin(Math.PI * phase(p, 0.3, 0.5))
  })
  legendaryWings(ctx, source, {
    style: 'flame',
    color: '#ea580c',
    core: '#fbbf24',
    accent: '#dc2626',
    span: 1.45,
    feathers: 9,
    flapRate: 1.1,
    flapAmount: 0.2,
    thrust: [0.34, 0.5],
    duration: 1600,
  })
  tailRibbons(ctx, source, {
    from: '#fde047',
    to: '#dc2626',
    count: 4,
    length: 1.7,
    width: 0.17,
    spread: 0.9,
    droop: 0.35,
    heightFactor: 0.6,
    delay: 80,
    duration: 1500,
  })
  flames(ctx, bodyAt(source, 0.3), {
    color: '#f97316',
    core: '#fde047',
    count: 6,
    radius: 0.3,
    height: 0.55,
    duration: 1300,
  })
  burst(ctx, at(source, 0.8), { color: '#fdba74', count: 16, delay: 120, speed: 1.2, spread: 'up' })
  fireWave(ctx, source, target, impact - 200, 520)
  slashArc(ctx, at(target), {
    color: '#f97316',
    delay: impact - 40,
    duration: 340,
    angle: -2.4,
    radius: 1.3,
    width: 0.35,
    sweep: 1.4,
  })
  fireSweep(ctx, source, target, 1.5, impact - 40, 1020)
  scorchMark(ctx, target, impact, 1050)
  shockwave(ctx, ground(target), { color: '#fb923c', delay: impact, radius: 2.1, duration: 620 })
  burst(ctx, at(target), { color: '#fdba74', count: 26, delay: impact, speed: 2.2, spread: 'up' })

  const victims = [target, ...enemiesAround(ctx, source, target, 2).slice(0, 3)]
  victims.forEach((victim, index) => {
    const delay = impact + 100 + index * 90
    flamePillar(ctx, victim, index ? 1.8 : 2.4, delay, 820 - index * 40)
    flames(ctx, ground(victim), {
      color: '#f97316',
      core: '#fde047',
      count: 6,
      radius: 0.4,
      height: 0.6,
      delay,
      duration: 760 - index * 40,
    })
    if (index) flinch(ctx, [victim], delay)
  })
  driftMotes(ctx, ground(target), {
    colors: ['#fb923c', '#fde047', '#ef4444'],
    count: 60,
    radius: 1.8,
    height: 2.6,
    cycles: 1.3,
    sway: 0.18,
    size: 0.08,
    twinkle: true,
    delay: impact,
    duration: 1050,
  })
  heatHaze(ctx, target, impact + 100, 950)
  cameraPunch(ctx, at(target), 0.55, impact - 60)
  shake(ctx, strength, impact, 380)
  return impact
}

export const POKEMON_TIER_4_5_ULTIMATES: UltimateSet = {
  farfetchd: farfetchdLeafBlade,
  hitmonlee: hitmonleeHighJumpKick,
  hitmonchan: hitmonchanElementalPunches,
  kangaskhan: kangaskhanDizzyPunch,
  pinsir: pinsirXScissor,
  lapras: laprasPerishSong,
  tauros: taurosHeadCharge,
  ditto: dittoTransform,
  porygon: porygonConversion,
  lickitung: lickitungWrap,
  jynx: jynxLovelyKiss,
  snorlax: snorlaxHeavySlam,
  aerodactyl: aerodactylStoneEdge,
  articuno: articunoBlizzard,
  zapdos: zapdosThunderstorm,
  moltres: moltresInfernoWing,
}
