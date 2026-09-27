import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, starGeometry, type ColorInput, type FxContext } from '../primitives'
import {
  bodyAt,
  cameraYaw,
  easeOut,
  fistMesh,
  flatDirection,
  fx,
  phase,
  pulse,
  resolvePoint,
  setOpacity,
  type PointSource,
  standard,
} from './shared'

export const SKIN = '#f1c27d'

const UP = new THREE.Vector3(0, 1, 0)
const TAU = Math.PI * 2

// Unit cylinder (height 1, centered) stretched between two points.
function stretchBetween(
  mesh: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  width = 1,
): void {
  const length = Math.max(0.001, from.distanceTo(to))
  mesh.position.lerpVectors(from, to, 0.5)
  mesh.quaternion.setFromUnitVectors(UP, to.clone().sub(from).divideScalar(length))
  mesh.scale.set(width, length, width)
}

function cameraRight(ctx: FxContext, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(1, 0, 0).applyAxisAngle(UP, cameraYaw(ctx))
}

export interface RubberArmOptions {
  fist: ColorInput
  delay?: number
  duration?: number
  windBack?: number
  windUp?: number
  fistSize?: number
  thickness?: number
  side?: number
  recoil?: boolean
  priority?: RenderEffectPriority
}

// Rubber arm: optionally stretches far behind the caster first, then snaps the fist into the target.
// Returns the ms at which the fist lands.
export function rubberArm(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: RubberArmOptions,
): number {
  const duration = options.duration ?? 260
  const windUp = options.windUp ?? 0
  const snapEnd = windUp + (1 - windUp) * 0.28
  const holdEnd = snapEnd + (1 - windUp) * 0.16
  const thickness = options.thickness ?? 0.07
  const fistSize = options.fistSize ?? thickness * 2.4
  const windBack = options.windBack ?? 0
  const group = new THREE.Group()
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness, thickness, 1, 10, 1, true),
    standard(SKIN),
  )
  const fist = fistMesh(1.3, () => standard(options.fist, { roughness: 0.5 }))
  group.add(arm, fist)
  const shoulder = new THREE.Vector3()
  const aim = new THREE.Vector3()
  const back = new THREE.Vector3()
  const tip = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const side = new THREE.Vector3()
  const look = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p, now) => {
      source.focusPoint(shoulder, 0.6)
      target.focusPoint(aim, 0.55)
      direction.subVectors(aim, shoulder).normalize()
      side
        .crossVectors(direction, UP)
        .normalize()
        .multiplyScalar(options.side ?? 0)
      shoulder.add(side)
      back
        .copy(shoulder)
        .addScaledVector(direction, -windBack)
        .addScaledVector(UP, windBack * 0.3)
      let scale = 1
      let recoil = 0
      if (p < windUp) {
        const t = easeInOut(p / windUp)
        tip.lerpVectors(shoulder, back, t)
        tip.y += Math.sin(now * 0.05) * 0.03 * t
        scale = 0.55 + 0.3 * t
        recoil = -0.18 * t
      } else if (p < snapEnd) {
        const t = ((p - windUp) / (snapEnd - windUp)) ** 2
        tip.lerpVectors(windUp > 0 ? back : shoulder, aim, t)
        scale = 0.85 + 0.3 * t
        recoil = 0.22 * t
      } else if (p < holdEnd) {
        tip
          .copy(aim)
          .addScaledVector(
            direction,
            -0.08 * Math.sin(((p - snapEnd) / (holdEnd - snapEnd)) * Math.PI),
          )
        scale = 1.15
        recoil = 0.22
      } else {
        const t = easeInOut((p - holdEnd) / (1 - holdEnd))
        tip.lerpVectors(aim, shoulder, t)
        scale = 1.15 - 0.6 * t
        recoil = 0.22 * (1 - t)
      }
      const length = shoulder.distanceTo(tip)
      stretchBetween(arm, shoulder, tip, Math.max(0.55, 1 - length * 0.08))
      fist.position.copy(tip)
      fist.scale.setScalar(fistSize * scale)
      fist.lookAt(look.copy(tip).add(direction))
      if (options.recoil && !ctx.reducedMotion) {
        source.pose.offset.addScaledVector(direction.setY(0), recoil)
        source.pose.tilt += recoil * 0.6
      }
    },
    options.priority ?? 'ability',
  )
  return (options.delay ?? 0) + duration * snapEnd
}

const KATANA_HILTS = ['#f8fafc', '#b91c1c', '#111827']

// One of Zoro's three swords (Wado Ichimonji, Sandai Kitetsu, Shusui by hilt color), blade pointing up.
export function katanaMesh(index: number, edgeColor: ColorInput): THREE.Group {
  const sword = new THREE.Group()
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.72, 0.07).translate(0, 0.36, 0),
    standard('#e5e7eb', { roughness: 0.2, metalness: 0.8 }),
  )
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.76, 0.12).translate(0, 0.38, 0),
    glow(edgeColor, 0.45),
  )
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10),
    standard('#ca8a04', { roughness: 0.4, metalness: 0.6 }),
  )
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.2, 0.05).translate(0, -0.1, 0),
    standard(KATANA_HILTS[index % 3]),
  )
  sword.add(blade, edge, guard, handle)
  sword.rotation.z = (index - 1) * 0.35
  const holder = new THREE.Group()
  holder.add(sword)
  holder.position.y = -0.3
  const wrapper = new THREE.Group()
  wrapper.add(holder)
  return wrapper
}

// Horizontal crescents flung outward in every direction while rotating: a spinning slash cannon.
export function radialSlashes(
  ctx: FxContext,
  center: PointSource,
  options: {
    color: ColorInput
    core?: ColorInput
    count?: number
    radius?: number
    delay?: number
    duration?: number
    twist?: number
    height?: number
  },
): void {
  const count = options.count ?? 6
  const group = new THREE.Group()
  const crescents = Array.from({ length: count }, (_, index) => {
    const holder = new THREE.Group()
    holder.rotation.y = (index / count) * TAU
    const crescent = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1, 32, 1, -0.55, 1.1),
      glow(options.color, 0.9),
    )
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(0.93, 1, 32, 1, -0.5, 1.0),
      glow(options.core ?? '#ffffff', 0.95),
    )
    crescent.add(edge)
    crescent.rotation.x = -Math.PI / 2 + (index % 2 ? 0.25 : -0.25)
    holder.add(crescent)
    group.add(holder)
    return crescent
  })
  const radius = options.radius ?? 2
  const origin = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 420, group, (p) => {
    if (!resolved) {
      origin.copy(resolvePoint(center))
      resolved = true
    }
    group.position.set(origin.x, options.height ?? origin.y, origin.z)
    group.rotation.y = easeOut(p) * (options.twist ?? 2.4)
    crescents.forEach((crescent) => {
      crescent.scale.setScalar(0.3 + easeOut(p) * radius)
      ;(crescent.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p * p)
      ;((crescent.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - p
    })
  })
}

// Nami's Clima-Tact twirled above her head like a baton.
export function climaTact(
  ctx: FxContext,
  source: UnitView,
  options: { delay?: number; duration?: number },
): void {
  const group = new THREE.Group()
  ;['#1d4ed8', '#e2e8f0', '#1d4ed8'].forEach((color, index) => {
    const section = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8),
      standard(color, { roughness: 0.3, metalness: 0.5 }),
    )
    section.position.y = (index - 1) * 0.29
    group.add(section)
  })
  ;[-1, 1].forEach((end) => {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#fde047'))
    orb.position.y = end * 0.46
    group.add(orb)
  })
  const head = bodyAt(source, 1.25)
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p) => {
    group.position.copy(head())
    group.position.y += pulse(p) * 0.15
    group.rotation.set(Math.PI / 2 - 0.3, 0, p * 7 * TAU * (0.4 + p * 0.6))
    group.scale.setScalar(Math.min(1, p * 6) * (p > 0.9 ? (1 - p) / 0.1 : 1))
  })
}

// Crackling electric loop around a stunned unit.
export function stunSparks(
  ctx: FxContext,
  view: UnitView,
  options: { color: ColorInput; delay?: number; duration?: number; radius?: number },
): void {
  const segments = 18
  const positions = new Float32Array(segments * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: options.color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const loop = new THREE.LineLoop(geometry, material)
  loop.frustumCulled = false
  const radius = options.radius ?? 0.45
  let last = -1
  fx(ctx, options.delay ?? 0, options.duration ?? 800, loop, (p, now) => {
    if (now - last > 50) {
      last = now
      const center = view.root.position
      for (let index = 0; index < segments; index++) {
        const angle = (index / segments) * TAU + now * 0.004
        const r = radius * (0.85 + Math.random() * 0.3)
        positions[index * 3] = center.x + Math.cos(angle) * r
        positions[index * 3 + 1] = 0.3 + Math.random() * 0.7
        positions[index * 3 + 2] = center.z + Math.sin(angle) * r
      }
      geometry.attributes.position.needsUpdate = true
    }
    material.opacity = Math.random() < 0.8 ? 1 - p * 0.7 : 0.2
  })
}

// Straw Hat jolly roger emblem for the shared `flag` cloth (Usopp's pirate flag).
export function jollyRogerEmblem(): THREE.Group {
  const emblem = new THREE.Group()
  const decal = (
    geometry: THREE.BufferGeometry,
    color: ColorInput,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true }),
    )
    mesh.position.set(x, y, z)
    emblem.add(mesh)
    return mesh
  }
  ;[-0.7, 0.7].forEach((angle) => {
    decal(new THREE.PlaneGeometry(0.3, 0.03), '#f8fafc', 0, -0.03, 0).rotation.z = angle
  })
  decal(new THREE.CircleGeometry(0.085, 18), '#f8fafc', 0, -0.01, 0.002)
  decal(new THREE.CircleGeometry(0.1, 16, 0, Math.PI), '#facc15', 0, 0.045, 0.004).scale.set(
    1.25,
    0.55,
    1,
  )
  decal(new THREE.PlaneGeometry(0.2, 0.022), '#dc2626', 0, 0.05, 0.006)
  ;[-0.03, 0.03].forEach((x) =>
    decal(new THREE.CircleGeometry(0.018, 8), '#111827', x, -0.01, 0.008),
  )
  // Floats slightly in front of the waving cloth so the wave never swallows it.
  emblem.position.z = 0.08
  emblem.scale.setScalar(1.6)
  const holder = new THREE.Group()
  holder.add(emblem)
  return holder
}

function crossGeometry(size: number, bar: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  const a = bar / 2
  const b = size / 2
  shape.moveTo(-a, b)
  ;[
    [a, b],
    [a, a],
    [b, a],
    [b, -a],
    [a, -a],
    [a, -b],
    [-a, -b],
    [-a, -a],
    [-b, -a],
    [-b, a],
    [-a, a],
  ].forEach(([x, y]) => shape.lineTo(x, y))
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

// Chopper's pink hat disc with the white cross, blooming above the patient and sinking into it.
export function medicalCross(
  ctx: FxContext,
  view: UnitView,
  options: { color: ColorInput; delay?: number; duration?: number },
): void {
  const group = new THREE.Group()
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), glow(options.color, 0.35))
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), glow('#f472b6', 0.85))
  disc.position.z = 0.005
  const cross = new THREE.Mesh(crossGeometry(0.44, 0.14), glow('#ffffff'))
  cross.position.z = 0.01
  group.add(halo, disc, cross)
  const point = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, group, (p) => {
    view.focusPoint(point, 1)
    const pop = phase(p, 0, 0.25)
    const sink = easeInOut(phase(p, 0.6, 1))
    const hover = view.height + 0.55
    point.y = hover + (view.height * 0.55 - hover) * sink + Math.sin(p * 12) * 0.03 * (1 - sink)
    group.position.copy(point)
    group.quaternion.copy(ctx.camera.quaternion)
    const overshoot = pop < 1 ? easeOut(pop) * (1 + 0.25 * Math.sin(pop * Math.PI)) : 1
    group.scale.setScalar(overshoot * (1 - sink * 0.6) * (1 + 0.06 * Math.sin(p * 30) * (1 - sink)))
    halo.scale.setScalar(1 + 0.3 * Math.sin(p * 18))
    setOpacity(group, 1 - sink * sink)
  })
}

// Chopper's Rumble Ball, for `prop`.
export function rumbleBallMesh(): THREE.Group {
  const group = new THREE.Group()
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 14, 10),
    standard('#facc15', { roughness: 0.4 }),
  )
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.014, 6, 20),
    standard('#92400e', { roughness: 0.6 }),
  )
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glow('#fef08a', 0.4))
  group.add(ball, stripe, shine)
  return group
}

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly turns: number,
    private readonly startRadius: number,
    private readonly endRadius: number,
    private readonly offset: number,
    private readonly rise = 1,
  ) {
    super()
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const radius = this.startRadius + (this.endRadius - this.startRadius) * t
    const angle = this.offset + t * this.turns * TAU
    return target.set(Math.cos(angle) * radius, t * this.rise, Math.sin(angle) * radius)
  }
}

// White bandage spiralling up around the patient.
export function bandageWrap(
  ctx: FxContext,
  view: UnitView,
  options: { delay?: number; duration?: number; color?: ColorInput },
): void {
  const segments = 90
  const geometry = new THREE.TubeGeometry(
    new HelixCurve(2.5, 0.42, 0.36, 0, 0.9),
    segments,
    0.035,
    5,
    false,
  )
  const indexCount = geometry.index?.count ?? 0
  const tube = new THREE.Mesh(geometry, glow(options.color ?? '#f8fafc', 0.85))
  fx(ctx, options.delay ?? 0, options.duration ?? 900, tube, (p) => {
    tube.position.copy(view.root.position).setY(0.15)
    tube.rotation.y = p * 3
    const wrap = easeOut(phase(p, 0, 0.5))
    geometry.setDrawRange(0, Math.floor((indexCount * wrap) / 3) * 3)
    ;(tube.material as THREE.MeshBasicMaterial).opacity = 0.85 * (p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1)
  })
}

interface ArmRig {
  upper: THREE.Mesh
  fore: THREE.Mesh
  hand: THREE.Mesh
  bloom: THREE.Mesh
  angle: number
  height: number
}

function buildArm(group: THREE.Group, petal: ColorInput, angle: number, height: number): ArmRig {
  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 1, 8, 1, true),
    standard(SKIN),
  )
  const fore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 1, 8, 1, true),
    standard(SKIN),
  )
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), standard(SKIN))
  hand.scale.set(1, 0.7, 1.3)
  const bloom = new THREE.Mesh(starGeometry(5, 0.2, 0.1), glow(petal, 0.85))
  group.add(upper, fore, hand, bloom)
  return { upper, fore, hand, bloom, angle, height }
}

// Cien Fleur: arms bloom out of the ground around the target (and across its body) and clutch it.
export function sproutArms(
  ctx: FxContext,
  target: UnitView,
  options: {
    petal: ColorInput
    count?: number
    radius?: number
    delay?: number
    duration?: number
    clutchAt?: number
    cross?: boolean
  },
): void {
  const count = options.count ?? 6
  const radius = options.radius ?? 0.55
  const clutchAt = options.clutchAt ?? 0.35
  const group = new THREE.Group()
  const arms = Array.from({ length: count }, (_, index) =>
    buildArm(group, options.petal, (index / count) * TAU + 0.3, 0.3 + (index % 3) * 0.22),
  )
  const crossArms = options.cross
    ? [buildArm(group, options.petal, 0, 0), buildArm(group, options.petal, 1, 0)]
    : []
  const base = new THREE.Vector3()
  const elbow = new THREE.Vector3()
  const hand = new THREE.Vector3()
  const grab = new THREE.Vector3()
  const right = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const center = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 1400, group, (p, now) => {
    const grow = easeOut(phase(p, 0, clutchAt * 0.7))
    const clutch = easeInOut(phase(p, clutchAt * 0.7, clutchAt))
    const retract = easeInOut(phase(p, 0.85, 1))
    const squeeze = clutch * (1 - retract) * Math.sin(now * 0.04) * 0.015
    const origin = target.root.position
    arms.forEach((arm) => {
      const outward = new THREE.Vector3(Math.cos(arm.angle), 0, Math.sin(arm.angle))
      base.copy(origin).addScaledVector(outward, radius).setY(0.02)
      elbow
        .copy(base)
        .addScaledVector(outward, 0.12)
        .setY(0.02 + 0.5 * grow * (1 - retract))
      grab
        .copy(origin)
        .addScaledVector(outward, 0.16 + squeeze)
        .setY(arm.height)
      hand.copy(elbow).setY(elbow.y + 0.35 * grow * (1 - retract))
      hand.lerp(grab, clutch * (1 - retract))
      stretchBetween(arm.upper, base, elbow)
      stretchBetween(arm.fore, elbow, hand)
      arm.upper.visible = grow > 0.02
      arm.fore.visible = grow > 0.02
      arm.hand.position.copy(hand)
      arm.hand.lookAt(grab)
      arm.hand.scale.setScalar(Math.max(0.01, grow * (1 - retract)))
      arm.bloom.position.copy(base).setY(0.04)
      arm.bloom.rotation.set(-Math.PI / 2, 0, p * 3)
      arm.bloom.scale.setScalar(pulse(phase(p, 0, 0.4)) * 1.4 + (1 - retract) * 0.6 * grow)
    })
    if (crossArms.length) {
      cameraRight(ctx, right)
      toCamera.set(0, 0, 1).applyQuaternion(ctx.camera.quaternion).setY(0).normalize()
      target.focusPoint(center, 0.5).addScaledVector(toCamera, 0.28)
      const wrap = easeInOut(phase(p, clutchAt * 0.6, clutchAt * 1.1)) * (1 - retract)
      crossArms.forEach((arm, index) => {
        const sign = index === 0 ? 1 : -1
        base
          .copy(center)
          .addScaledVector(right, sign * 0.38)
          .setY(center.y + 0.28)
        grab
          .copy(center)
          .addScaledVector(right, -sign * 0.34)
          .setY(center.y - 0.3 + squeeze)
        elbow.lerpVectors(base, grab, 0.5 * wrap)
        hand.lerpVectors(base, grab, wrap)
        stretchBetween(arm.upper, base, elbow)
        stretchBetween(arm.fore, elbow, hand)
        arm.upper.visible = wrap > 0.02
        arm.fore.visible = wrap > 0.02
        arm.hand.position.copy(hand)
        arm.hand.scale.setScalar(Math.max(0.01, wrap))
        arm.bloom.position.copy(base)
        arm.bloom.quaternion.copy(ctx.camera.quaternion)
        arm.bloom.scale.setScalar(Math.max(0.01, wrap * 0.9))
      })
    }
    setOpacity(group, 1 - retract * retract)
  })
}

// A single arm sprouting beside the target and slapping it (Robin's auto-attack).
export function sproutSlap(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: {
    petal: ColorInput
    delay?: number
    duration?: number
    priority?: RenderEffectPriority
  },
): number {
  const group = new THREE.Group()
  const arm = buildArm(group, options.petal, 0, 0)
  const right = new THREE.Vector3()
  const base = new THREE.Vector3()
  const elbow = new THREE.Vector3()
  const hand = new THREE.Vector3()
  const face = new THREE.Vector3()
  const duration = options.duration ?? 360
  const side = flatDirection(source, target).x >= 0 ? 1 : -1
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p) => {
      cameraRight(ctx, right).multiplyScalar(side)
      const grow = easeOut(phase(p, 0, 0.35))
      const swing = easeInOut(phase(p, 0.35, 0.55))
      const retract = phase(p, 0.75, 1)
      base.copy(target.root.position).addScaledVector(right, 0.5).setY(0.02)
      elbow.copy(base).setY(0.45 * grow * (1 - retract))
      target.focusPoint(face, 0.6).addScaledVector(right, 0.12)
      hand
        .copy(elbow)
        .addScaledVector(right, 0.25 * grow)
        .setY(elbow.y + 0.3 * grow)
      hand.lerp(face, swing * (1 - retract))
      stretchBetween(arm.upper, base, elbow)
      stretchBetween(arm.fore, elbow, hand)
      arm.hand.position.copy(hand)
      arm.hand.scale.setScalar(Math.max(0.01, grow * (1 - retract)))
      arm.bloom.position.copy(base).setY(0.04)
      arm.bloom.rotation.set(-Math.PI / 2, 0, p * 4)
      arm.bloom.scale.setScalar(Math.max(0.01, 1.2 * (1 - retract)))
    },
    options.priority ?? 'ability',
  )
  return (options.delay ?? 0) + duration * 0.5
}

function ghostGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-0.5, -0.55)
  shape.lineTo(-0.5, 0.1)
  shape.absarc(0, 0.1, 0.5, Math.PI, 0, true)
  shape.lineTo(0.5, -0.55)
  shape.quadraticCurveTo(0.42, -0.35, 0.33, -0.55)
  shape.quadraticCurveTo(0.25, -0.75, 0.17, -0.55)
  shape.quadraticCurveTo(0.08, -0.35, 0, -0.55)
  shape.quadraticCurveTo(-0.08, -0.75, -0.17, -0.55)
  shape.quadraticCurveTo(-0.25, -0.35, -0.33, -0.55)
  shape.quadraticCurveTo(-0.42, -0.75, -0.5, -0.55)
  const leftEye = new THREE.Path()
  leftEye.absellipse(-0.18, 0.12, 0.1, 0.14, 0, TAU, false, 0)
  const rightEye = new THREE.Path()
  rightEye.absellipse(0.18, 0.12, 0.1, 0.14, 0, TAU, false, 0)
  const mouth = new THREE.Path()
  mouth.absellipse(0, -0.18, 0.13, 0.07, 0, TAU, false, 0)
  shape.holes.push(leftEye, rightEye, mouth)
  return new THREE.ShapeGeometry(shape, 12)
}

// Brook's soul: a glowing afro'd ghost that drifts out of him.
export function soulGhost(
  ctx: FxContext,
  view: UnitView,
  options: { color: ColorInput; delay?: number; duration?: number; size?: number },
): void {
  const group = new THREE.Group()
  const body = new THREE.Mesh(ghostGeometry(), glow(options.color, 0.7))
  group.add(body)
  ;[
    [-0.32, 0.55],
    [-0.15, 0.7],
    [0.05, 0.74],
    [0.24, 0.66],
    [0.38, 0.5],
  ].forEach(([x, y]) => {
    const puff = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), glow('#e0f2fe', 0.35))
    puff.position.set(x, y, -0.01)
    group.add(puff)
  })
  const size = options.size ?? 0.55
  const right = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 1100, group, (p, now) => {
    cameraRight(ctx, right)
    group.position
      .copy(view.root.position)
      .addScaledVector(right, -0.25 + Math.sin(now * 0.006) * 0.12)
      .setY(view.height * 0.8 + easeOut(p) * 0.9)
    group.quaternion.copy(ctx.camera.quaternion)
    group.rotateZ(Math.sin(now * 0.008) * 0.15)
    group.scale.setScalar(size * (0.6 + easeOut(Math.min(1, p * 3)) * 0.4))
    setOpacity(group, pulse(p))
  })
}

export function soulWisps(
  ctx: FxContext,
  view: UnitView,
  options: {
    color: ColorInput
    delay?: number
    duration?: number
    count?: number
    radius?: number
  },
): void {
  const count = options.count ?? 5
  const group = new THREE.Group()
  const wisps = Array.from({ length: count }, (_, index) => {
    const wisp = new THREE.Group()
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glow('#f0f9ff', 0.9))
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.3, 8, 1, true).rotateX(Math.PI).translate(0, -0.15, 0),
      glow(options.color, 0.6),
    )
    wisp.add(head, tail)
    wisp.userData.angle = (index / count) * TAU
    wisp.userData.offset = Math.random() * 0.3
    group.add(wisp)
    return wisp
  })
  const radius = options.radius ?? 0.6
  fx(ctx, options.delay ?? 0, options.duration ?? 1200, group, (p) => {
    const origin = view.root.position
    wisps.forEach((wisp) => {
      const local = phase(p, wisp.userData.offset as number, 1)
      const angle = (wisp.userData.angle as number) + local * 5
      wisp.position.set(
        origin.x + Math.cos(angle) * radius * (1 - local * 0.4),
        0.2 + local * 1.6,
        origin.z + Math.sin(angle) * radius * (1 - local * 0.4),
      )
      wisp.scale.setScalar(pulse(local))
    })
  })
}

export interface RapierOptions {
  glow: ColorInput
  delay?: number
  duration?: number
  mode: 'thrust' | 'draw'
  length?: number
  priority?: RenderEffectPriority
}

// Brook's cane sword: a needle-thin blade that either lunges or is slowly drawn, frosting over.
export function rapier(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: RapierOptions,
): number {
  const length = options.length ?? 0.8
  const group = new THREE.Group()
  const blade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.016, 1, 6).translate(0, 0.5, 0),
    standard('#f1f5f9', { roughness: 0.15, metalness: 0.9 }),
  )
  const sheen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.045, 1, 8, 1, true).translate(0, 0.5, 0),
    glow(options.glow, 0.5),
  )
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.012, 6, 16),
    standard('#cbd5e1', { roughness: 0.3, metalness: 0.7 }),
  )
  guard.rotation.x = Math.PI / 2
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8).translate(0, -0.11, 0),
    standard('#1f2937', { roughness: 0.6 }),
  )
  group.add(blade, sheen, guard, handle)
  const hilt = new THREE.Vector3()
  const aim = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const right = new THREE.Vector3()
  const duration = options.duration ?? 260
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p, now) => {
      source.focusPoint(hilt, 0.5)
      target.focusPoint(aim, 0.55)
      direction.subVectors(aim, hilt).normalize()
      let bladeLength = length
      if (options.mode === 'thrust') {
        const reach = p < 0.45 ? easeOut(p / 0.45) : 1 - easeInOut((p - 0.45) / 0.55)
        const distance = Math.max(0, hilt.distanceTo(aim) - length * 0.85)
        hilt.addScaledVector(direction, 0.1 + reach * distance)
      } else {
        cameraRight(ctx, right)
        hilt.addScaledVector(right, 0.25).setY(hilt.y + 0.1)
        direction.lerp(UP, 0.45).normalize()
        bladeLength = length * easeOut(phase(p, 0, 0.45))
        ;(sheen.material as THREE.MeshBasicMaterial).opacity =
          0.35 + 0.35 * Math.sin(now * 0.02) * phase(p, 0.3, 0.6)
      }
      group.position.copy(hilt)
      group.quaternion.setFromUnitVectors(UP, direction)
      blade.scale.set(1, Math.max(0.01, bladeLength), 1)
      sheen.scale.set(1, Math.max(0.01, bladeLength), 1)
      group.scale.setScalar(p > 0.9 ? (1 - p) / 0.1 : 1)
    },
    options.priority ?? 'ability',
  )
  return (options.delay ?? 0) + (options.mode === 'thrust' ? duration * 0.45 : duration)
}

// Vagabond Drill: a tapering, twin-helix water drill boring from the caster into the target.
export function waterDrill(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: { color: ColorInput; core?: ColorInput; delay?: number; duration?: number },
): void {
  const group = new THREE.Group()
  const spinner = new THREE.Group()
  group.add(spinner)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1, 18, 1, true).translate(0, 0.5, 0),
    glow(options.color, 0.5),
  )
  const spine = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 1, 10, 1, true).translate(0, 0.5, 0),
    glow(options.core ?? '#e0f2fe', 0.9),
  )
  spinner.add(cone, spine)
  ;[0, Math.PI].forEach((offset, index) => {
    const helix = new THREE.Mesh(
      new THREE.TubeGeometry(new HelixCurve(3.5, 0.42, 0.04, offset), 80, 0.035, 5, false),
      glow(index === 0 ? (options.core ?? '#e0f2fe') : options.color, 0.9),
    )
    spinner.add(helix)
  })
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const direction = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 600, group, (p, now) => {
    source.focusPoint(from, 0.5)
    target.focusPoint(to, 0.5)
    direction.subVectors(to, from)
    const full = direction.length() + 0.2
    direction.normalize()
    const extend = phase(p, 0, 0.4) ** 2
    const fade = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1
    group.position.copy(from).addScaledVector(direction, 0.15)
    group.quaternion.setFromUnitVectors(UP, direction)
    spinner.rotation.y = now * 0.03
    spinner.scale.set(
      fade * (0.6 + extend * 0.6),
      Math.max(0.01, full * extend),
      fade * (0.6 + extend * 0.6),
    )
  })
}

// Franky's Strong Right: a rocket-propelled steel fist on a chain.
export function rocketFist(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: {
    color: ColorInput
    delay?: number
    duration?: number
    priority?: RenderEffectPriority
  },
): number {
  const group = new THREE.Group()
  const fist = new THREE.Group()
  const knuckles = fistMesh(0.22, () => standard('#94a3b8', { roughness: 0.3, metalness: 0.8 }))
  const cuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.12, 12).rotateX(Math.PI / 2),
    standard(options.color, { roughness: 0.4, metalness: 0.4 }),
  )
  cuff.position.z = -0.15
  const thruster = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.3, 10, 1, true).rotateX(-Math.PI / 2),
    glow('#fb923c', 0.85),
  )
  thruster.position.z = -0.35
  fist.add(knuckles, cuff, thruster)
  const chainPositions = new Float32Array(6)
  const chainGeometry = new THREE.BufferGeometry()
  chainGeometry.setAttribute('position', new THREE.BufferAttribute(chainPositions, 3))
  const chain = new THREE.Line(chainGeometry, new THREE.LineBasicMaterial({ color: '#cbd5e1' }))
  chain.frustumCulled = false
  group.add(fist, chain)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const duration = options.duration ?? 320
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p) => {
      source.focusPoint(from, 0.55)
      target.focusPoint(to, 0.55)
      const reach = p < 0.45 ? (p / 0.45) ** 1.6 : p < 0.55 ? 1 : 1 - easeInOut((p - 0.55) / 0.45)
      fist.position.lerpVectors(from, to, reach * 0.92)
      fist.lookAt(to)
      thruster.scale.set(1, (p < 0.45 ? 1 : 0.2) * (0.8 + Math.random() * 0.4), 1)
      chainPositions.set([
        from.x,
        from.y,
        from.z,
        fist.position.x,
        fist.position.y,
        fist.position.z,
      ])
      chainGeometry.attributes.position.needsUpdate = true
    },
    options.priority ?? 'ability',
  )
  return (options.delay ?? 0) + duration * 0.45
}

// Usopp's Kabuto slingshot: the band is drawn back, then snaps. Returns the release time.
export function slingshot(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: { delay?: number; duration?: number; priority?: RenderEffectPriority },
): number {
  const group = new THREE.Group()
  const frame = new THREE.Group()
  const wood = '#92400e'
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.022, 0.2, 6).translate(0, -0.1, 0),
    standard(wood),
  )
  const prongs = [-1, 1].map((sign) => {
    const prong = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.018, 0.16, 6).translate(0, 0.08, 0),
      standard(wood),
    )
    prong.rotation.z = -sign * 0.45
    return prong
  })
  frame.add(handle, ...prongs)
  const bandPositions = new Float32Array(9)
  const bandGeometry = new THREE.BufferGeometry()
  bandGeometry.setAttribute('position', new THREE.BufferAttribute(bandPositions, 3))
  const band = new THREE.Line(bandGeometry, new THREE.LineBasicMaterial({ color: '#f59e0b' }))
  band.frustumCulled = false
  group.add(frame, band)
  const direction = new THREE.Vector3()
  const side = new THREE.Vector3()
  const pouch = new THREE.Vector3()
  const left = new THREE.Vector3()
  const rightTip = new THREE.Vector3()
  const duration = options.duration ?? 300
  const release = 0.45
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p) => {
      flatDirection(source, target, direction)
      side.crossVectors(direction, UP).normalize()
      frame.position
        .copy(source.root.position)
        .addScaledVector(direction, 0.35)
        .setY(source.height * 0.6)
      frame.lookAt(frame.position.clone().add(direction))
      frame.rotateX(-Math.PI / 2)
      left
        .copy(frame.position)
        .addScaledVector(side, -0.07)
        .setY(frame.position.y + 0.15)
      rightTip
        .copy(frame.position)
        .addScaledVector(side, 0.07)
        .setY(frame.position.y + 0.15)
      const pull = p < release ? easeOut(p / release) : Math.max(0, 1 - (p - release) * 12) * -0.2
      pouch.lerpVectors(left, rightTip, 0.5).addScaledVector(direction, -0.35 * pull)
      bandPositions.set([
        left.x,
        left.y,
        left.z,
        pouch.x,
        pouch.y,
        pouch.z,
        rightTip.x,
        rightTip.y,
        rightTip.z,
      ])
      bandGeometry.attributes.position.needsUpdate = true
      frame.scale.setScalar(p > 0.85 ? (1 - p) / 0.15 : 1)
      band.visible = p < 0.85
    },
    options.priority ?? 'standard',
  )
  return (options.delay ?? 0) + duration * release
}
