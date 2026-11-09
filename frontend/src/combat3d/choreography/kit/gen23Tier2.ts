import * as THREE from 'three'
import type { UnitView } from '../../unitView'
import { type ColorInput, type FxContext, glow, orbit, starGeometry } from '../primitives'
import {
  billboard,
  bodyPoint,
  easeIn,
  easeOut,
  fadeInOut,
  flat,
  flatDirection,
  fx,
  motionScale,
  phase,
  type PointSource,
  type PositionAt,
  pulse,
  resolvePoint,
  scaledCount,
  setOpacity,
  standard,
} from './shared'

// A live point behind and above a unit, where Mareep-line tails and Marill's bubble ball sit.
export const tailPoint = (
  source: UnitView,
  target: UnitView,
  heightFactor = 0.85,
  back = 0.32,
): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  const direction = new THREE.Vector3()
  return () =>
    bodyPoint(source, heightFactor, out).addScaledVector(
      flatDirection(source, target, direction),
      -back,
    )
}

export interface TailOrbOptions {
  color: ColorInput
  shell: ColorInput
  size?: number
  delay?: number
  duration?: number
}

// The glowing tail bulb of Mareep, Flaaffy and Ampharos: a lit glass shell around a pulsing core.
export function tailOrb(ctx: FxContext, point: PointSource, options: TailOrbOptions): void {
  const size = options.size ?? 0.12
  const group = new THREE.Group()
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(size, 16, 12),
    standard(options.shell, {
      opacity: 0.55,
      roughness: 0.15,
      emissive: options.color,
      emissiveIntensity: 0.4,
    }),
  )
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(size * 0.55, 12, 8),
    glow(options.color, 0.6),
  )
  group.add(shell, core)
  fx(ctx, options.delay ?? 0, options.duration ?? 600, group, (p, now) => {
    group.position.copy(resolvePoint(point))
    const grow = easeOut(phase(p, 0, 0.25))
    group.scale.setScalar(grow * (1 + 0.12 * Math.sin(now * 0.03)))
    core.scale.setScalar(0.8 + 0.4 * pulse(phase(p, 0.2, 0.9)))
    setOpacity(group, fadeInOut(p, 0.1, 0.2))
  })
}

// Mareep's fleecy wool: a ring of soft lit puffs that swell with static around a unit.
export function woolPuffs(
  ctx: FxContext,
  view: UnitView,
  options: {
    color: ColorInput
    count?: number
    radius?: number
    delay?: number
    duration?: number
  },
): void {
  const count = options.count ?? 7
  const radius = options.radius ?? 0.32
  const group = new THREE.Group()
  for (let index = 0; index < count; index++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.11 + (index % 3) * 0.025, 10, 8),
      standard(options.color, { roughness: 1, opacity: 0.85 }),
    )
    const angle = (index / count) * Math.PI * 2
    puff.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 2) * 0.08,
      Math.sin(angle) * radius,
    )
    group.add(puff)
  }
  const center = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 600, group, (p, now) => {
    group.position.copy(bodyPoint(view, 0.45, center))
    group.rotation.y = now * 0.002
    group.scale.setScalar(easeOut(phase(p, 0, 0.3)) * (1 + 0.18 * pulse(phase(p, 0.3, 1))))
    setOpacity(group, fadeInOut(p, 0.1, 0.25))
  })
}

// Little dizzy stars circling above a stunned unit's head.
export function dazeStars(
  ctx: FxContext,
  view: UnitView,
  options: { color: ColorInput; count?: number; delay?: number; duration?: number },
): void {
  orbit(ctx, view, {
    color: options.color,
    count: options.count ?? 3,
    radius: 0.28,
    heightFactor: 1.08,
    turns: 2.2,
    billboard: true,
    build: () => new THREE.Mesh(starGeometry(5, 0.08, 0.035), flat(options.color, 0.9)),
    delay: options.delay,
    duration: options.duration ?? 900,
  })
}

// Stunned sway: the victim reels side to side and sags a little.
export function reel(ctx: FxContext, view: UnitView, delay: number, duration = 700): void {
  const m = motionScale(ctx)
  fx(ctx, delay, duration, undefined, (p) => {
    const envelope = pulse(p)
    view.pose.tilt += Math.sin(p * Math.PI * 4) * 0.22 * m * envelope
    view.pose.scale *= 1 - 0.05 * envelope
  })
}

// Marill's tail ball / Azumarill's bubble sphere: a glossy water ball with a soft rim and a highlight.
export function bubbleBall(size: number, color: ColorInput = '#3b82f6'): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(size, 18, 14),
      standard(color, { roughness: 0.15, metalness: 0.1, opacity: 0.85 }),
    ),
    new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.28, 10, 8).translate(-size * 0.4, size * 0.45, size * 0.55),
      flat('#e0f2fe', 0.85),
    ),
  )
  return group
}

export interface RollOptions {
  build: () => THREE.Object3D
  axis: THREE.Vector3
  radius: number
  delay?: number
  duration: number
  turns?: number
}

// A rolling body prop (Rollout ball, Donphan's tyre) glued to a `rush` sampler and spinning on its axle.
export function rollingBody(ctx: FxContext, position: PositionAt, options: RollOptions): void {
  const holder = new THREE.Group()
  const body = options.build()
  holder.add(body)
  const axle = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), options.axis)
    .normalize()
  const turns = options.turns ?? 4
  // Local +x is the axle, so builders put wheel axes (torus z) on x.
  holder.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axle)
  fx(ctx, options.delay ?? 0, options.duration, holder, (p, now) => {
    position(now, holder.position)
    holder.position.y = options.radius + 0.02
    body.rotation.x = p * turns * Math.PI * 2
    holder.scale.setScalar(easeOut(phase(p, 0, 0.12)))
    setOpacity(holder, 1 - phase(p, 0.85, 1))
  })
}

// A curved dark feather (Murkrow, Honchkrow) or white plume (Togekiss), quill along +y.
export function featherMesh(vane: ColorInput, edge: ColorInput, size = 0.22): THREE.Group {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(size * 0.32, size * 0.45, size * 0.08, size)
  shape.quadraticCurveTo(-size * 0.22, size * 0.55, 0, 0)
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), standard(vane, { roughness: 0.6 })),
    new THREE.Mesh(
      new THREE.PlaneGeometry(size * 0.03, size).translate(size * 0.04, size / 2, 0.002),
      flat(edge, 0.9),
    ),
  )
  return group
}

export interface VolleyOptions {
  build: (index: number) => THREE.Object3D
  count?: number
  spread?: number
  arc?: number
  delay?: number
  duration?: number
  stagger?: number
}

// A fan of props flying from one point to another with staggered launches (feathers, ice shards, spores).
export function volley(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: VolleyOptions,
): void {
  const count = Math.max(2, scaledCount(ctx, options.count ?? 5))
  const spread = options.spread ?? 0.35
  const stagger = options.stagger ?? 40
  const duration = options.duration ?? 320
  const group = new THREE.Group()
  const items = Array.from({ length: count }, (_, index) => {
    const object = options.build(index)
    group.add(object)
    const angle = (index / count) * Math.PI * 2
    return {
      object,
      offset: new THREE.Vector3(Math.cos(angle) * spread, Math.sin(angle) * spread * 0.6, 0),
      launch: (index * stagger) / (duration + count * stagger),
    }
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const total = duration + count * stagger
  fx(ctx, options.delay ?? 0, total, group, (p) => {
    start.copy(resolvePoint(from))
    end.copy(resolvePoint(to))
    items.forEach((item) => {
      const local = phase(p, item.launch, item.launch + duration / total)
      const travel = easeIn(local) * 0.6 + local * 0.4
      item.object.visible = local > 0 && local < 1
      item.object.position.lerpVectors(start, end, travel)
      item.object.position.addScaledVector(item.offset, Math.sin(Math.PI * travel))
      item.object.position.y += Math.sin(Math.PI * travel) * (options.arc ?? 0.25)
      item.object.lookAt(end)
      item.object.rotateX(Math.PI / 2)
    })
  })
}

export interface ClawOptions {
  color: ColorInput
  edge: ColorInput
  count?: number
  size?: number
  angle?: number
  delay?: number
  duration?: number
}

// Parallel curved claw rakes that sweep across a point, facing the camera (Sneasel, Weavile, Granbull).
export function clawRake(ctx: FxContext, point: PointSource, options: ClawOptions): void {
  const count = options.count ?? 3
  const size = options.size ?? 0.5
  const group = new THREE.Group()
  const marks = Array.from({ length: count }, (_, index) => {
    const mark = new THREE.Group()
    const shape = new THREE.Shape()
    shape.moveTo(-size, 0)
    shape.quadraticCurveTo(0, size * 0.32, size, 0)
    shape.quadraticCurveTo(0, size * 0.18, -size, 0)
    mark.add(
      new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), flat(options.color, 0.9)),
      new THREE.Mesh(new THREE.ShapeGeometry(shape, 12).scale(1, 0.4, 1), glow(options.edge, 0.5)),
    )
    mark.position.y = (index - (count - 1) / 2) * size * 0.32
    group.add(mark)
    return mark
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 300, group, (p) => {
    group.position.copy(resolvePoint(point))
    billboard(ctx, group)
    group.rotateZ(options.angle ?? -0.6)
    const sweep = easeOut(phase(p, 0, 0.4))
    marks.forEach((mark, index) => {
      const local = clamp(sweep * 1.3 - index * 0.12)
      mark.scale.set(local, 1, 1)
      mark.position.x = (1 - local) * -size * 0.6
    })
    setOpacity(group, 1 - phase(p, 0.55, 1))
  })
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value))

// Ice blade that curls forward: Sneasel's and Weavile's hooked claws, Mamoswine's tusks.
export function iceTusk(length: number, color: ColorInput = '#e0f2fe', curl = 0.5): THREE.Group {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length * 0.6, 0),
    new THREE.Vector3(0, length * 0.85, length * curl * 0.6),
  )
  const material = () => standard(color, { roughness: 0.25, metalness: 0.1, opacity: 0.95 })
  const tip = new THREE.Mesh(new THREE.ConeGeometry(length * 0.07, length * 0.25, 8), material())
  tip.position.copy(curve.getPoint(1))
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(1))
  tip.translateY(length * 0.12)
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 10, length * 0.07, 8, false), material()),
    tip,
  )
  return group
}

// Faceted ice chunk / hailstone with a pale rim.
export function iceChunk(size: number, color: ColorInput = '#bae6fd'): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 0),
    standard(color, { roughness: 0.2, metalness: 0.15, flatShading: true, opacity: 0.92 }),
  )
}

export interface HailOptions {
  count?: number
  radius?: number
  height?: number
  size?: number
  color?: ColorInput
  delay?: number
  duration?: number
}

// Localized hail: faceted stones dropping from a small cloud onto a disc and skidding out on landing.
export function hailFall(ctx: FxContext, center: PointSource, options: HailOptions): void {
  const count = Math.max(4, scaledCount(ctx, options.count ?? 12))
  const radius = options.radius ?? 1.2
  const height = options.height ?? 2.4
  const group = new THREE.Group()
  const stones = Array.from({ length: count }, (_, index) => {
    const stone = iceChunk((options.size ?? 0.07) * (0.7 + Math.random() * 0.6), options.color)
    group.add(stone)
    return {
      stone,
      angle: Math.random() * Math.PI * 2,
      distance: Math.sqrt(Math.random()) * radius,
      launch: (index / count) * 0.55,
      spinSpeed: 4 + Math.random() * 6,
    }
  })
  const origin = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 900, group, (p) => {
    origin.copy(resolvePoint(center))
    stones.forEach((item) => {
      const local = phase(p, item.launch, item.launch + 0.4)
      item.stone.visible = local > 0
      const x = origin.x + Math.cos(item.angle) * item.distance
      const z = origin.z + Math.sin(item.angle) * item.distance
      const bounce = local >= 1 ? phase(p, item.launch + 0.4, item.launch + 0.55) : 0
      item.stone.position.set(
        x + Math.cos(item.angle) * bounce * 0.15,
        Math.max(0.04, height * (1 - easeIn(local))) + pulse(bounce) * 0.08,
        z + Math.sin(item.angle) * bounce * 0.15,
      )
      item.stone.rotation.set(local * item.spinSpeed, local * item.spinSpeed * 0.7, 0)
    })
    setOpacity(group, 1 - phase(p, 0.8, 1))
  })
}

// A teardrop wisp (ghost flame, frost spirit) in the XY plane, tip up.
export function wispMesh(color: ColorInput, core: ColorInput, size = 0.14): THREE.Group {
  const shape = new THREE.Shape()
  shape.moveTo(0, size * 1.6)
  shape.quadraticCurveTo(size, size * 0.2, 0, -size * 0.6)
  shape.quadraticCurveTo(-size, size * 0.2, 0, size * 1.6)
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), flat(color, 0.75)),
    new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.32, 12).translate(0, size * 0.05, 0.002),
      glow(core, 0.55),
    ),
  )
  return group
}

// A stylised eye glyph (Natu/Xatu psychic eyes, Snubbull's glare): almond white, iris and pupil.
export function eyeGlyph(
  iris: ColorInput,
  size = 0.18,
  sclera: ColorInput = '#f8fafc',
): THREE.Group {
  const shape = new THREE.Shape()
  shape.moveTo(-size, 0)
  shape.quadraticCurveTo(0, size * 0.9, size, 0)
  shape.quadraticCurveTo(0, -size * 0.9, -size, 0)
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), flat(sclera, 0.92)),
    new THREE.Mesh(new THREE.CircleGeometry(size * 0.36, 16).translate(0, 0, 0.002), flat(iris, 1)),
    new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.16, 12).translate(0, 0, 0.004),
      flat('#111827', 1),
    ),
  )
  return group
}

// Holds a camera-facing glyph above or in front of a unit, scaling in and fading out.
export function glyphAt(
  ctx: FxContext,
  point: PointSource,
  build: () => THREE.Object3D,
  options: { delay?: number; duration?: number; scale?: number; spin?: number },
): void {
  const object = build()
  const holder = new THREE.Group()
  holder.add(object)
  fx(ctx, options.delay ?? 0, options.duration ?? 500, holder, (p) => {
    holder.position.copy(resolvePoint(point))
    billboard(ctx, holder)
    object.rotation.z = (options.spin ?? 0) * p
    holder.scale.setScalar((options.scale ?? 1) * (0.4 + 0.6 * easeOut(phase(p, 0, 0.3))))
    setOpacity(holder, fadeInOut(p, 0.15, 0.3))
  })
}

// Hexagonal steel plates that fly in from around a unit and lock onto it (Iron Defense).
export function armorPlates(
  ctx: FxContext,
  view: UnitView,
  options: {
    color: ColorInput
    rim: ColorInput
    count?: number
    delay?: number
    duration?: number
  },
): void {
  const count = options.count ?? 6
  const group = new THREE.Group()
  const plates = Array.from({ length: count }, (_, index) => {
    const plate = new THREE.Group()
    plate.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.04, 6).rotateX(Math.PI / 2),
        standard(options.color, { metalness: 0.85, roughness: 0.3, flatShading: true }),
      ),
      new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.012, 4, 6).rotateZ(Math.PI / 6),
        flat(options.rim, 0.9),
      ),
    )
    group.add(plate)
    return { plate, angle: (index / count) * Math.PI * 2, height: 0.25 + (index % 3) * 0.28 }
  })
  const center = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 800, group, (p) => {
    bodyPoint(view, 0, center)
    const close = easeIn(phase(p, 0, 0.55))
    plates.forEach(({ plate, angle, height }) => {
      const distance = 1.1 - close * 0.72
      const a = angle + (1 - close) * 1.4
      plate.position.set(
        center.x + Math.cos(a) * distance,
        center.y + height,
        center.z + Math.sin(a) * distance,
      )
      plate.lookAt(center.x, center.y + height, center.z)
    })
    setOpacity(group, 1 - phase(p, 0.75, 1))
  })
}

// Spinning flat ring of lit shapes around a point on the ground (Rapid Spin dust, Rollout grooves).
export function groundRing(
  ctx: FxContext,
  center: PointSource,
  options: { color: ColorInput; radius?: number; delay?: number; duration?: number },
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(
      (options.radius ?? 0.6) * 0.7,
      options.radius ?? 0.6,
      32,
      1,
      0,
      Math.PI * 1.4,
    ).rotateX(-Math.PI / 2),
    flat(options.color, 0.55),
  )
  fx(ctx, options.delay ?? 0, options.duration ?? 500, ring, (p) => {
    ring.position.copy(resolvePoint(center)).setY(0.05)
    ring.rotation.y = -p * 12
    ring.scale.setScalar(0.6 + 0.5 * easeOut(p))
    setOpacity(ring, fadeInOut(p, 0.1, 0.4))
  })
}
