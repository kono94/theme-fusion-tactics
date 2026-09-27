import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, later, type ColorInput, type FxContext } from '../primitives'

export type PointSource = THREE.Vector3 | (() => THREE.Vector3)

export const resolvePoint = (point: PointSource): THREE.Vector3 =>
  typeof point === 'function' ? point() : point

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

// Local progress of p inside the [start, end] window, clamped to 0..1.
export const phase = (p: number, start: number, end: number): number =>
  clamp01((p - start) / (end - start))

export const pulse = (p: number): number => Math.sin(Math.PI * clamp01(p))

export const easeIn = (p: number): number => p * p * p

export const easeOut = (p: number): number => 1 - (1 - p) ** 3

// Opacity envelope: ramps in over `fadeIn`, holds, ramps out over the last `fadeOut` of the effect.
export const fadeInOut = (p: number, fadeIn = 0.12, fadeOut = 0.3): number =>
  Math.min(clamp01(p / fadeIn), clamp01((1 - p) / fadeOut))

export function fx(
  ctx: FxContext,
  delay: number,
  duration: number,
  object: THREE.Object3D | undefined,
  update: (p: number, now: number) => void,
  priority: RenderEffectPriority = 'ability',
  finish?: () => void,
): void {
  ctx.effects.add({ start: ctx.now + delay, duration, object, update, priority, finish })
}

export const scaledCount = (ctx: FxContext, count: number): number =>
  Math.max(2, Math.round(count * ctx.particleScale))

export const starPower = (view: UnitView): number => 1 + 0.15 * ((view.unit.starLevel || 1) - 1)

export const motionScale = (ctx: FxContext): number => (ctx.reducedMotion ? 0.25 : 1)

const UP = new THREE.Vector3(0, 1, 0)
const HIDDEN_Y = -50
const yawEuler = new THREE.Euler()

// Where the portrait is actually drawn this frame, including the pose offset and lift from choreographies.
export function bodyPoint(view: UnitView, heightFactor: number, out: THREE.Vector3): THREE.Vector3 {
  view.focusPoint(out, heightFactor).add(view.pose.offset)
  out.y += view.pose.lift
  return out
}

export const bodyAt = (view: UnitView, heightFactor = 0.55): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  return () => bodyPoint(view, heightFactor, out)
}

// A live point `distance` past `from` toward `toward` (negative distance steps back); e.g. a mouth or a beam end.
export const ahead = (
  from: UnitView,
  toward: UnitView,
  distance: number,
  heightFactor = 0.55,
): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  const direction = new THREE.Vector3()
  return () =>
    bodyPoint(from, heightFactor, out).addScaledVector(
      flatDirection(from, toward, direction),
      distance,
    )
}

// A live point `overshoot` beyond the target on the caster-to-target line, for piercing LINE abilities.
export const beyond = (
  source: UnitView,
  target: UnitView,
  overshoot: number,
  heightFactor = 0.55,
): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  const direction = new THREE.Vector3()
  return () =>
    target
      .focusPoint(out, heightFactor)
      .addScaledVector(flatDirection(source, target, direction), overshoot)
}

// A live point at a fixed world height above a unit's tile (clouds, suns, drop origins).
export const above = (view: UnitView, height: number): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  return () => out.copy(view.root.position).setY(height)
}

// A live point offset from another point (pass `view.root.position` to follow a unit's tile).
export const offsetPoint = (point: PointSource, offset: THREE.Vector3): (() => THREE.Vector3) => {
  const out = new THREE.Vector3()
  return () => out.copy(resolvePoint(point)).add(offset)
}

// Camera yaw around the world up axis: rotate flat props by it so they face the viewer but stay upright.
export function cameraYaw(ctx: FxContext): number {
  return yawEuler.setFromQuaternion(ctx.camera.quaternion, 'YXZ').y
}

// Additive pose envelopes: squash-and-stretch and a side-to-side shiver.
export function squash(
  ctx: FxContext,
  view: UnitView,
  options: { delay?: number; duration?: number; amount?: number; priority?: RenderEffectPriority },
): void {
  const amount = options.amount ?? 0.15
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 300,
    undefined,
    (p) => {
      view.pose.scale *= 1 - amount * Math.sin(Math.PI * p)
      view.pose.lift -= amount * 0.5 * Math.sin(Math.PI * p)
    },
    options.priority,
  )
}

export function shiver(
  ctx: FxContext,
  view: UnitView,
  options: {
    delay?: number
    duration?: number
    amount?: number
    speed?: number
    priority?: RenderEffectPriority
  },
): void {
  const amount = (options.amount ?? 0.06) * (ctx.reducedMotion ? 0.3 : 1)
  const speed = options.speed ?? 40
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    undefined,
    (p) => {
      const envelope = Math.sin(Math.PI * p)
      view.pose.offset.x += Math.sin(p * speed) * amount * envelope
      view.pose.tilt += Math.sin(p * speed * 0.7) * amount * 1.5 * envelope
    },
    options.priority,
  )
}

export interface StandardOptions {
  opacity?: number
  roughness?: number
  metalness?: number
  emissive?: ColorInput
  emissiveIntensity?: number
  flatShading?: boolean
}

// Lit, non-additive material for solid props (fists, weapons, rocks, shells).
export function standard(
  color: ColorInput,
  options: StandardOptions = {},
): THREE.MeshStandardMaterial {
  const opacity = options.opacity ?? 1
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.55,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 1,
    flatShading: options.flatShading ?? false,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  })
}

// Unlit, non-additive material for opaque-looking shapes (smoke, goo, silhouettes) that glow() would wash out.
export function flat(color: ColorInput, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

// Scales every material under `object` relative to the opacity it was created with.
export function setOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((child) => {
    if (
      !(child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line)
    )
      return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials as THREE.Material[]) {
      material.userData.baseOpacity ??= material.opacity
      material.opacity = (material.userData.baseOpacity as number) * opacity
      material.transparent = true
    }
  })
}

export function billboard(ctx: FxContext, object: THREE.Object3D): void {
  object.quaternion.copy(ctx.camera.quaternion)
}

export function flatDirection(
  source: UnitView,
  target: UnitView,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  out.subVectors(target.root.position, source.root.position).setY(0)
  return out.lengthSq() < 1e-6 ? out.set(0, 0, 1) : out.normalize()
}

// Living enemies of `source` within `radius` of `center`, excluding `center` itself.
export function enemiesAround(
  ctx: FxContext,
  source: UnitView,
  center: UnitView | THREE.Vector3,
  radius: number,
): UnitView[] {
  const origin = center instanceof THREE.Vector3 ? center : center.root.position
  return ctx
    .enemiesOf(source)
    .filter((enemy) => enemy !== center && enemy.root.position.distanceTo(origin) <= radius)
}

// The living enemy of `source` closest to `from` (the caster by default).
export function nearestEnemy(
  ctx: FxContext,
  source: UnitView,
  from: UnitView | THREE.Vector3 = source,
): UnitView | undefined {
  const origin = from instanceof THREE.Vector3 ? from : from.root.position
  let nearest: UnitView | undefined
  let best = Number.POSITIVE_INFINITY
  for (const enemy of ctx.enemiesOf(source)) {
    const distance = enemy.root.position.distanceToSquared(origin)
    if (distance < best) {
      best = distance
      nearest = enemy
    }
  }
  return nearest
}

export interface LineOptions {
  width?: number
  overshoot?: number
  limit?: number
}

// Living enemies other than `target` inside a corridor from `source` through `target`, nearest first.
export function enemiesInLine(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: LineOptions = {},
): UnitView[] {
  const origin = source.root.position
  const direction = flatDirection(source, target)
  const reach = origin.distanceTo(target.root.position) + (options.overshoot ?? 1.5)
  const width = options.width ?? 0.6
  const relative = new THREE.Vector3()
  return ctx
    .enemiesOf(source)
    .filter((enemy) => {
      if (enemy === target) return false
      relative.subVectors(enemy.root.position, origin).setY(0)
      const along = relative.dot(direction)
      if (along < 0.2 || along > reach) return false
      return relative.addScaledVector(direction, -along).length() <= width
    })
    .sort((a, b) => a.root.position.distanceTo(origin) - b.root.position.distanceTo(origin))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY)
}

// The caster plus living allies within `radius` of `center` (the caster by default), caster first.
export function alliesAround(
  ctx: FxContext,
  source: UnitView,
  radius: number,
  limit = 5,
  center: UnitView | THREE.Vector3 = source,
): UnitView[] {
  const origin = center instanceof THREE.Vector3 ? center : center.root.position
  const allies = ctx
    .alliesOf(source)
    .filter((ally) => ally.root.position.distanceTo(origin) <= radius)
  return [source, ...allies].slice(0, limit)
}

export function flinch(ctx: FxContext, victims: UnitView[], delay: number, stagger = 0): void {
  victims.forEach((victim, index) => {
    const at = delay + index * stagger
    later(ctx, at, () => victim.onHit(ctx.now + at))
  })
}

// Victims flinch as a wave travelling outward from `source` at `msPerUnit`.
export function flinchAlong(
  ctx: FxContext,
  source: UnitView,
  victims: UnitView[],
  delay: number,
  msPerUnit: number,
): void {
  victims.forEach((victim) => {
    const at = delay + victim.root.position.distanceTo(source.root.position) * msPerUnit
    later(ctx, at, () => victim.onHit(ctx.now + at))
  })
}

// Shape geometries in the XY plane, centered on the origin. Each call creates a new geometry.
export function heartGeometry(size: number): THREE.ShapeGeometry {
  const s = size
  const shape = new THREE.Shape()
  shape.moveTo(0, -s)
  shape.bezierCurveTo(-s * 0.2, -s * 0.7, -s * 1.1, -s * 0.3, -s * 1.05, s * 0.25)
  shape.bezierCurveTo(-s, s * 0.8, -s * 0.3, s * 0.95, 0, s * 0.45)
  shape.bezierCurveTo(s * 0.3, s * 0.95, s, s * 0.8, s * 1.05, s * 0.25)
  shape.bezierCurveTo(s * 1.1, -s * 0.3, s * 0.2, -s * 0.7, 0, -s)
  return new THREE.ShapeGeometry(shape, 12)
}

export function zGeometry(size: number): THREE.ShapeGeometry {
  const s = size
  const t = size * 0.28
  const shape = new THREE.Shape()
  shape.moveTo(-s, s)
  shape.lineTo(s, s)
  shape.lineTo(s, s - t)
  shape.lineTo(-s + t * 1.6, -s + t)
  shape.lineTo(s, -s + t)
  shape.lineTo(s, -s)
  shape.lineTo(-s, -s)
  shape.lineTo(-s, -s + t)
  shape.lineTo(s - t * 1.6, s - t)
  shape.lineTo(-s, s - t)
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

// Eighth note: a round head with a stem and flag.
export function noteGeometry(size: number): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.absellipse(0, 0, size * 0.42, size * 0.3, 0, Math.PI * 2, false, -0.4)
  const stem = new THREE.Shape()
  stem.moveTo(size * 0.3, 0)
  stem.lineTo(size * 0.42, 0)
  stem.lineTo(size * 0.42, size * 1.5)
  stem.quadraticCurveTo(size * 0.95, size * 1.2, size * 0.8, size * 0.6)
  stem.quadraticCurveTo(size * 0.7, size * 1.05, size * 0.3, size * 1.15)
  stem.closePath()
  return new THREE.ShapeGeometry([shape, stem], 8).translate(0, -size * 0.5, 0)
}

export function hexagonGeometry(radius: number, inner = 0): THREE.BufferGeometry {
  return inner > 0
    ? new THREE.RingGeometry(inner, radius, 6, 1, Math.PI / 6)
    : new THREE.CircleGeometry(radius, 6, Math.PI / 6)
}

// Open palm facing +Z with fingers pointing up; pass a material factory so every mesh owns its material.
export function palmMesh(size: number, material: () => THREE.Material): THREE.Group {
  const k = size / 0.3
  const group = new THREE.Group()
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.3 * k, 16, 12), material())
  palm.scale.set(1, 1.1, 0.34)
  group.add(palm)
  for (let index = 0; index < 4; index++) {
    const x = (-0.19 + index * 0.126) * k
    const finger = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06 * k, (0.3 - Math.abs(index - 1.5) * 0.05) * k, 4, 8),
      material(),
    )
    finger.position.set(x * 1.15, (0.5 - Math.abs(index - 1.5) * 0.04) * k, 0)
    finger.rotation.z = -x * 0.5
    group.add(finger)
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.065 * k, 0.22 * k, 4, 8), material())
  thumb.position.set(0.36 * k, 0.05 * k, 0.02 * k)
  thumb.rotation.z = -1
  group.add(thumb)
  return group
}

export function chevronGeometry(size: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  const outline: [number, number][] = [
    [-0.5, -0.1],
    [0, 0.4],
    [0.5, -0.1],
    [0.5, -0.4],
    [0, 0.1],
    [-0.5, -0.4],
  ]
  outline.forEach(([x, y], index) =>
    index === 0 ? shape.moveTo(x * size, y * size) : shape.lineTo(x * size, y * size),
  )
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

// A chunky cartoon fist (+z forward) built from primitives; pass a material factory so every mesh owns its material.
export function fistMesh(size: number, material: () => THREE.Material): THREE.Group {
  const group = new THREE.Group()
  const palm = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.85, size * 0.9), material())
  group.add(palm)
  for (let index = 0; index < 4; index++) {
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 10, 8), material())
    knuckle.position.set((index - 1.5) * size * 0.24, size * 0.2, size * 0.45)
    group.add(knuckle)
  }
  const thumb = new THREE.Mesh(
    new THREE.CapsuleGeometry(size * 0.14, size * 0.35, 4, 8),
    material(),
  )
  thumb.rotation.z = Math.PI / 2
  thumb.position.set(-size * 0.1, -size * 0.28, size * 0.42)
  group.add(thumb)
  return group
}

export interface CrackOptions {
  color: ColorInput
  count?: number
  length?: number
  width?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Glowing fissures that zig-zag outward across the floor, then fade.
export function groundCracks(ctx: FxContext, point: PointSource, options: CrackOptions): void {
  const count = Math.max(3, Math.round((options.count ?? 6) * Math.max(0.5, ctx.particleScale)))
  const length = options.length ?? 1.6
  const width = options.width ?? 0.05
  const group = new THREE.Group()
  const cracks: THREE.Mesh[] = []
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5
    const segments = 4
    const vertices: THREE.Vector2[] = []
    let x = 0
    let z = 0
    for (let step = 0; step <= segments; step++) {
      vertices.push(new THREE.Vector2(x, z))
      const reach = (length / segments) * (0.7 + Math.random() * 0.6)
      const wobble = angle + (Math.random() - 0.5) * 0.9
      x += Math.cos(wobble) * reach
      z += Math.sin(wobble) * reach
    }
    const shape = new THREE.Shape()
    vertices.forEach((vertex, step) => {
      const taper = width * (1 - step / (segments + 1))
      if (step === 0) shape.moveTo(vertex.x, vertex.y + taper)
      else shape.lineTo(vertex.x, vertex.y + taper)
    })
    for (let step = vertices.length - 1; step >= 0; step--) {
      const taper = width * (1 - step / (segments + 1))
      shape.lineTo(vertices[step].x, vertices[step].y - taper)
    }
    const crack = new THREE.Mesh(
      new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2),
      glow(options.color, 0.95),
    )
    cracks.push(crack)
    group.add(crack)
  }
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    group,
    (p) => {
      if (!resolved) {
        const origin = resolvePoint(point)
        group.position.set(origin.x, 0.09, origin.z)
        resolved = true
      }
      const grow = easeOut(phase(p, 0, 0.25))
      cracks.forEach((crack) => crack.scale.set(grow, 1, grow))
      setOpacity(group, 1 - phase(p, 0.55, 1))
    },
    options.priority ?? 'ability',
  )
}

export interface ZapOptions {
  color: ColorInput
  core?: ColorInput
  delay?: number
  duration?: number
  segments?: number
  jitter?: number
  priority?: RenderEffectPriority
}

// Jagged electric arc between two live points that re-jitters every few frames.
export function zap(ctx: FxContext, from: PointSource, to: PointSource, options: ZapOptions): void {
  const segments = options.segments ?? 8
  const jitter = options.jitter ?? 0.25
  const positions = new Float32Array((segments + 1) * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const coreGeometry = new THREE.BufferGeometry()
  coreGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const outer = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: options.color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const core = new THREE.Line(
    coreGeometry,
    new THREE.LineBasicMaterial({
      color: options.core ?? '#ffffff',
      transparent: true,
      depthWrite: false,
    }),
  )
  outer.frustumCulled = false
  core.frustumCulled = false
  const group = new THREE.Group()
  group.add(outer, core)
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  let lastJitter = -1
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 220,
    group,
    (p, now) => {
      if (now - lastJitter > 45) {
        lastJitter = now
        start.copy(resolvePoint(from))
        end.copy(resolvePoint(to))
        for (let index = 0; index <= segments; index++) {
          const t = index / segments
          const wobble = index === 0 || index === segments ? 0 : jitter
          positions[index * 3] = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * wobble
          positions[index * 3 + 1] =
            start.y + (end.y - start.y) * t + (Math.random() - 0.5) * wobble
          positions[index * 3 + 2] =
            start.z + (end.z - start.z) * t + (Math.random() - 0.5) * wobble
        }
        geometry.attributes.position.needsUpdate = true
        coreGeometry.attributes.position.needsUpdate = true
      }
      setOpacity(group, 1 - phase(p, 0.6, 1))
    },
    options.priority ?? 'ability',
  )
}

export interface RayOptions {
  colors: ColorInput[]
  core?: ColorInput
  width?: number
  delay?: number
  duration?: number
  grow?: number
  twist?: number
  rings?: ColorInput
  priority?: RenderEffectPriority
}

// Straight beam between two live points (use `beyond` to pierce past the target): the tip races out during
// `grow`, holds, then thins away. Several colors become strands twisted around the axis.
export function rayBeam(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: RayOptions,
): void {
  const width = options.width ?? 0.14
  const group = new THREE.Group()
  const shaft = new THREE.Group()
  group.add(shaft)
  const strands = options.colors.map((color, index) => {
    const strandWidth = options.colors.length > 1 ? width * 0.45 : width
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(strandWidth, strandWidth, 1, 10, 1, true).translate(0, 0.5, 0),
      glow(color, 0.85),
    )
    shaft.add(mesh)
    return { mesh, angle: (index / options.colors.length) * Math.PI * 2 }
  })
  shaft.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.35, width * 0.35, 1, 8, 1, true).translate(0, 0.5, 0),
      glow(options.core ?? '#ffffff'),
    ),
  )
  const ringColor = options.rings
  const rings = ringColor
    ? Array.from({ length: 3 }, () => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(width * 1.8, width * 0.25, 6, 20),
          glow(ringColor, 0.8),
        )
        ring.rotation.x = Math.PI / 2
        group.add(ring)
        return ring
      })
    : []
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const growEnd = options.grow ?? 0.2
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    group,
    (p, now) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      const length = Math.max(0.01, start.distanceTo(end) * easeInOut(phase(p, 0, growEnd)))
      group.position.copy(start)
      group.quaternion.setFromUnitVectors(UP, direction.subVectors(end, start).normalize())
      const thickness =
        (p < growEnd ? 0.6 + 0.4 * phase(p, 0, growEnd) : 1 - 0.85 * phase(p, 0.7, 1)) *
        (1 + 0.08 * Math.sin(now * 0.08))
      shaft.scale.set(thickness, length, thickness)
      if (strands.length > 1) {
        strands.forEach(({ mesh, angle }) => {
          const a = angle + now * 0.012 * (options.twist ?? 0)
          mesh.position.set(Math.cos(a) * width * 0.45, 0, Math.sin(a) * width * 0.45)
        })
      }
      rings.forEach((ring, index) => {
        const travel = ((p * 3 + index / rings.length) % 1) * length
        ring.position.set(0, travel, 0)
        ring.scale.setScalar(thickness * (1 + 0.5 * (travel / length)))
      })
      setOpacity(group, 1 - phase(p, 0.75, 1))
    },
    options.priority ?? 'ability',
  )
}

export interface StreamOptions {
  color: ColorInput
  count?: number
  size?: number
  spread?: number
  delay?: number
  duration?: number
  travel?: number
  wobble?: number
  rise?: number
  priority?: RenderEffectPriority
}

// Continuous particle stream from `from` to `to` that widens into a cone: breath attacks, jets, gusts, sprays.
export function stream(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: StreamOptions,
): void {
  const count = Math.max(4, Math.round((options.count ?? 40) * ctx.particleScale))
  const travel = options.travel ?? 0.35
  const spread = options.spread ?? 0.4
  const wobble = options.wobble ?? 0
  const seeds = Array.from({ length: count }, (_, index) => ({
    launch: (index / count) * (1 - travel),
    angle: Math.random() * Math.PI * 2,
    radius: Math.random(),
    phase: Math.random() * Math.PI * 2,
  }))
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: options.size ?? 0.16,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const side = new THREE.Vector3()
  const lift = new THREE.Vector3()
  const cursor = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 600,
    points,
    (p) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      direction.subVectors(end, start).normalize()
      side.crossVectors(direction, UP)
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0)
      side.normalize()
      lift.crossVectors(side, direction).normalize()
      seeds.forEach((seed, index) => {
        const t = (p - seed.launch) / travel
        if (t < 0 || t > 1) {
          positions[index * 3 + 1] = HIDDEN_Y
          return
        }
        const width = spread * t * seed.radius
        cursor.lerpVectors(start, end, t)
        cursor.addScaledVector(
          side,
          Math.cos(seed.angle) * width + Math.sin(t * 9 + seed.phase) * wobble,
        )
        cursor.addScaledVector(lift, Math.sin(seed.angle) * width + (options.rise ?? 0) * t * t)
        positions.set([cursor.x, cursor.y, cursor.z], index * 3)
      })
      geometry.attributes.position.needsUpdate = true
      material.opacity = fadeInOut(p, 0.05, 0.25)
    },
    options.priority ?? 'ability',
  )
}

export interface TubeOptions {
  material: THREE.Material
  path: (p: number, points: THREE.Vector3[]) => void
  controlPoints: number
  delay?: number
  duration?: number
  radius?: number
  tubularSegments?: number
  radialSegments?: number
  taper?: boolean
  opacity?: (p: number) => number
  priority?: RenderEffectPriority
}

// A tube swept along a curve that `path` rewrites every frame: vines, tongues, tentacles, strings, smoke snakes.
export function tube(ctx: FxContext, options: TubeOptions): void {
  const points = Array.from({ length: options.controlPoints }, () => new THREE.Vector3())
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), options.material)
  mesh.frustumCulled = false
  const radius = options.radius ?? 0.05
  const tubular = options.tubularSegments ?? 24
  const radial = options.radialSegments ?? 6
  const center = new THREE.Vector3()
  const vertex = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    mesh,
    (p) => {
      options.path(p, points)
      const curve = new THREE.CatmullRomCurve3(points)
      const geometry = new THREE.TubeGeometry(curve, tubular, radius, radial, false)
      if (options.taper) {
        const position = geometry.attributes.position
        for (let ring = 0; ring <= tubular; ring++) {
          const t = ring / tubular
          curve.getPointAt(t, center)
          for (let side = 0; side <= radial; side++) {
            const index = ring * (radial + 1) + side
            vertex
              .fromBufferAttribute(position, index)
              .sub(center)
              .multiplyScalar(1 - t * 0.75)
              .add(center)
            position.setXYZ(index, vertex.x, vertex.y, vertex.z)
          }
        }
      }
      mesh.geometry.dispose()
      mesh.geometry = geometry
      if (options.opacity) options.material.opacity = options.opacity(p)
    },
    options.priority ?? 'ability',
  )
}

export interface CoilOptions {
  color: ColorInput
  delay?: number
  duration?: number
  radius?: number
  turns?: number
  thickness?: number
  glowing?: boolean
  priority?: RenderEffectPriority
}

// A helix that tightens around a unit and loosens at the end: binding vines, threads, smoke, wraps.
export function coil(ctx: FxContext, view: UnitView, options: CoilOptions): void {
  const turns = options.turns ?? 3
  const radius = options.radius ?? 0.42
  const material = options.glowing
    ? glow(options.color, 0.9)
    : standard(options.color, { opacity: 0.95 })
  const controlPoints = Math.max(8, turns * 8)
  tube(ctx, {
    material,
    delay: options.delay,
    duration: options.duration ?? 700,
    radius: options.thickness ?? 0.035,
    tubularSegments: controlPoints * 3,
    controlPoints,
    priority: options.priority,
    path: (p, points) => {
      const base = view.root.position
      const wrap = Math.min(1, p * 3)
      const squeeze = 1 - 0.3 * pulse(Math.min(1, p * 2))
      const release = p > 0.8 ? (p - 0.8) / 0.2 : 0
      points.forEach((point, index) => {
        const t = index / (points.length - 1)
        const angle = t * turns * Math.PI * 2 * wrap + p * 2
        const r = radius * squeeze * (1 + release * 0.8)
        point.set(
          base.x + Math.cos(angle) * r,
          0.15 + t * view.height * 0.85,
          base.z + Math.sin(angle) * r,
        )
      })
    },
    opacity: (p) => (options.glowing ? 0.9 : 0.95) * fadeInOut(p, 0.05, 0.25),
  })
}

export interface ShellOptions {
  color: ColorInput
  edge?: ColorInput
  radius?: number
  detail?: number
  material?: 'glow' | 'metal' | 'crystal' | 'stone'
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A faceted shell that snaps around a unit, holds, and fades: Harden, Iron Defense, diamond body, stone, barriers.
export function shell(ctx: FxContext, view: UnitView, options: ShellOptions): void {
  const radius = options.radius ?? 0.62
  const detail = options.detail ?? 1
  const kind = options.material ?? 'glow'
  const faceMaterial =
    kind === 'glow'
      ? glow(options.color, 0.3)
      : standard(options.color, {
          opacity: kind === 'stone' ? 0.95 : 0.55,
          metalness: kind === 'metal' ? 0.9 : kind === 'crystal' ? 0.3 : 0,
          roughness: kind === 'stone' ? 0.95 : 0.25,
          emissive: kind === 'crystal' ? options.color : '#000000',
          emissiveIntensity: 0.35,
          flatShading: true,
        })
  const faces = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), faceMaterial)
  const edgeSource = new THREE.IcosahedronGeometry(radius * 1.01, detail)
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(edgeSource),
    new THREE.LineBasicMaterial({
      color: options.edge ?? '#ffffff',
      transparent: true,
      depthWrite: false,
    }),
  )
  edgeSource.dispose()
  const group = new THREE.Group()
  group.add(faces, edges)
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 800,
    group,
    (p) => {
      group.position.copy(view.root.position).setY(view.height * 0.55 + view.pose.lift)
      const snap = p < 0.2 ? easeInOut(p / 0.2) : 1
      const pop = p > 0.2 && p < 0.35 ? 0.08 * pulse((p - 0.2) / 0.15) : 0
      group.scale.setScalar(0.3 + snap * 0.7 + pop)
      group.rotation.y = p * 1.5
      setOpacity(group, fadeInOut(p, 0.05, 0.35))
    },
    options.priority ?? 'ability',
  )
}

export interface DebrisOptions {
  color: ColorInput
  count?: number
  size?: number
  speed?: number
  pointed?: boolean
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Ballistic rock chunks that fly up, tumble, bounce on the floor, and fade.
export function debris(ctx: FxContext, point: PointSource, options: DebrisOptions): void {
  const count = scaledCount(ctx, options.count ?? 10)
  const duration = options.duration ?? 750
  const group = new THREE.Group()
  const velocities = Array.from({ length: count }, () => {
    const size = (options.size ?? 0.09) * (0.6 + Math.random() * 0.8)
    const geometry = options.pointed
      ? new THREE.ConeGeometry(size * 0.7, size * 2.4, 5)
      : new THREE.IcosahedronGeometry(size, 0)
    group.add(
      new THREE.Mesh(geometry, standard(options.color, { roughness: 0.9, flatShading: true })),
    )
    const angle = Math.random() * Math.PI * 2
    const speed = (options.speed ?? 2.2) * (0.5 + Math.random() * 0.7)
    return new THREE.Vector3(
      Math.cos(angle) * speed,
      2 + Math.random() * 2.2,
      Math.sin(angle) * speed,
    )
  })
  const origin = new THREE.Vector3()
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p) => {
      if (!resolved) {
        origin.copy(resolvePoint(point))
        resolved = true
      }
      const t = (p * duration) / 1000
      group.children.forEach((rock, index) => {
        const velocity = velocities[index]
        rock.position.set(
          origin.x + velocity.x * t,
          Math.max(0.05, origin.y + velocity.y * t - 9 * t * t),
          origin.z + velocity.z * t,
        )
        rock.rotation.set(t * 9 + index, t * 7, 0)
      })
      setOpacity(group, 1 - phase(p, 0.7, 1))
    },
    options.priority ?? 'ability',
  )
}

export interface FangOptions {
  color?: ColorInput
  glowColor?: ColorInput
  size?: number
  teeth?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Upper and lower rows of fangs that snap shut on a unit, facing the camera: Bite, Hyper Fang, Fire/Poison Fang.
export function fangs(ctx: FxContext, view: UnitView, options: FangOptions): void {
  const size = options.size ?? 0.35
  const teeth = options.teeth ?? 2
  const group = new THREE.Group()
  const jaws = [1, -1].map((sign) => {
    const jaw = new THREE.Group()
    for (let index = 0; index < teeth; index++) {
      const long = index === 0 || index === teeth - 1
      const height = size * (long ? 1 : 0.55)
      const geometry = new THREE.ConeGeometry(size * 0.18, height, 8)
      if (sign > 0) geometry.rotateZ(Math.PI)
      const tooth = new THREE.Mesh(
        geometry.translate(0, (-sign * height) / 2, 0),
        flat(options.color ?? '#f8fafc'),
      )
      tooth.position.x = (index - (teeth - 1) / 2) * size * 0.5
      jaw.add(tooth)
    }
    if (options.glowColor) {
      jaw.add(
        new THREE.Mesh(
          new THREE.PlaneGeometry(size * teeth * 0.6, size * 0.12),
          glow(options.glowColor, 0.8),
        ),
      )
    }
    group.add(jaw)
    return { jaw, sign }
  })
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 420,
    group,
    (p) => {
      group.position.copy(view.root.position).setY(view.height * 0.55)
      billboard(ctx, group)
      const close = p < 0.55 ? easeInOut(p / 0.55) : 1
      const gap = size * 1.4 * (1 - close) + size * 0.15
      jaws.forEach(({ jaw, sign }) => (jaw.position.y = sign * gap))
      group.scale.setScalar(p < 0.55 ? 1 : 1 + (p - 0.55) * 0.4)
      setOpacity(group, fadeInOut(p, 0.1, 0.25))
    },
    options.priority ?? 'ability',
  )
}

export interface GlyphOptions {
  color?: ColorInput
  count?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Floating "Z" glyphs drifting up from a sleeping or drowsy unit.
export function zzz(ctx: FxContext, view: UnitView, options: GlyphOptions = {}): void {
  const count = options.count ?? 3
  const group = new THREE.Group()
  const glyphs = Array.from({ length: count }, (_, index) => {
    const glyph = new THREE.Mesh(
      zGeometry(0.07 + index * 0.025),
      glow(options.color ?? '#e0f2fe', 0.95),
    )
    group.add(glyph)
    return glyph
  })
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 1000,
    group,
    (p) => {
      const base = view.root.position
      glyphs.forEach((glyph, index) => {
        const local = clamp01(p * 1.4 - index * 0.18)
        glyph.visible = local > 0 && local < 1
        glyph.position.set(
          base.x + 0.25 + Math.sin(local * 5 + index) * 0.12 + index * 0.12,
          view.height + 0.1 + local * 0.7 + index * 0.12,
          base.z,
        )
        billboard(ctx, glyph)
        glyph.rotateZ(-0.25 + Math.sin(local * 6) * 0.2)
        ;(glyph.material as THREE.MeshBasicMaterial).opacity = 0.95 * pulse(local)
      })
    },
    options.priority ?? 'ability',
  )
}

export interface ArrowOptions {
  color: ColorInput
  direction?: 'rise' | 'fall'
  count?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Stacked chevrons that rise through a unit (buff) or sink through it (debuff).
export function statArrows(ctx: FxContext, view: UnitView, options: ArrowOptions): void {
  const count = options.count ?? 3
  const rising = (options.direction ?? 'rise') === 'rise'
  const holder = new THREE.Group()
  const chevrons = Array.from({ length: count }, (_, index) => {
    const chevron = new THREE.Mesh(chevronGeometry(0.22), glow(options.color, 0.95))
    if (!rising) chevron.rotation.z = Math.PI
    chevron.position.x = (index - (count - 1) / 2) * 0.28
    holder.add(chevron)
    return chevron
  })
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 800,
    holder,
    (p) => {
      holder.position.copy(view.root.position)
      billboard(ctx, holder)
      chevrons.forEach((chevron, index) => {
        const local = clamp01(p * 1.3 - index * 0.12)
        chevron.position.y = rising ? 0.2 + local * 1.3 : 1.5 - local * 1.3
      })
      setOpacity(holder, pulse(p * 1.1))
    },
    options.priority ?? 'ability',
  )
}

export interface FlameOptions {
  color: ColorInput
  core?: ColorInput
  count?: number
  radius?: number
  height?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A cluster of flickering flame tongues anchored to a (possibly moving) point: burning legs, fire trails, pyres.
export function flames(ctx: FxContext, anchor: PointSource, options: FlameOptions): void {
  const count = Math.max(3, Math.round((options.count ?? 7) * Math.max(0.5, ctx.particleScale)))
  const radius = options.radius ?? 0.3
  const height = options.height ?? 0.7
  const group = new THREE.Group()
  const tongues = Array.from({ length: count }, (_, index) => {
    const tongue = new THREE.Group()
    tongue.add(
      new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 1, 7, 1, true).translate(0, 0.5, 0),
        glow(options.color, 0.75),
      ),
      new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.7, 6, 1, true).translate(0, 0.35, 0),
        glow(options.core ?? '#fff7ed', 0.9),
      ),
    )
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5
    const distance = radius * (index === 0 ? 0 : 0.4 + Math.random() * 0.6)
    tongue.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
    tongue.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)
    group.add(tongue)
    return {
      tongue,
      seed: Math.random() * 10,
      size: height * (index === 0 ? 1.2 : 0.55 + Math.random() * 0.5),
    }
  })
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 800,
    group,
    (p, now) => {
      group.position.copy(resolvePoint(anchor))
      const envelope = easeOut(phase(p, 0, 0.18)) * (1 - phase(p, 0.7, 1))
      tongues.forEach(({ tongue, seed, size }) => {
        const flicker =
          0.7 + 0.3 * Math.sin(now * 0.035 + seed) + 0.1 * Math.sin(now * 0.09 + seed * 3)
        const width = 0.8 + 0.4 * envelope
        tongue.scale.set(width, Math.max(0.001, size * flicker * envelope), width)
      })
      setOpacity(group, 1 - phase(p, 0.72, 1))
    },
    options.priority ?? 'ability',
  )
}

export interface FlagOptions {
  color: ColorInput
  stripe: ColorInput
  pole?: ColorInput
  // Extra children (emblems, skulls) attached to the cloth's center, facing +Z.
  emblem?: () => THREE.Object3D
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A raised banner beside a unit with a vertex-waved cloth that sweeps back and forth.
export function flag(ctx: FxContext, view: UnitView, options: FlagOptions): void {
  const group = new THREE.Group()
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 2, 8).translate(0, 1, 0),
    standard(options.pole ?? '#78350f', { roughness: 0.7 }),
  )
  const finial = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.07),
    standard('#fbbf24', { metalness: 0.7, roughness: 0.3 }),
  )
  finial.position.y = 2.05
  const clothGeometry = new THREE.PlaneGeometry(1.1, 0.66, 16, 8).translate(0.55, 1.62, 0)
  const colorA = new THREE.Color(options.color)
  const colorB = new THREE.Color(options.stripe)
  const clothPositions = clothGeometry.attributes.position as THREE.BufferAttribute
  const base = Float32Array.from(clothPositions.array as Float32Array)
  const colors = new Float32Array(clothPositions.count * 3)
  for (let index = 0; index < clothPositions.count; index++) {
    const y = base[index * 3 + 1] - 1.62
    const x = base[index * 3]
    const color = Math.abs(y) < 0.09 || Math.abs(x - 0.55 - y * 0.9) < 0.07 ? colorB : colorA
    colors.set([color.r, color.g, color.b], index * 3)
  }
  clothGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const cloth = new THREE.Mesh(
    clothGeometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.8,
      emissive: options.color,
      emissiveIntensity: 0.25,
    }),
  )
  group.add(pole, finial, cloth)
  if (options.emblem) {
    const emblem = options.emblem()
    emblem.position.set(0.55, 1.62, 0.02)
    group.add(emblem)
  }
  const position = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 1300,
    group,
    (p, now) => {
      bodyPoint(view, 0, position)
      group.position.set(position.x + 0.28, position.y, position.z)
      group.rotation.set(0, cameraYaw(ctx), 0)
      const raise = easeOut(phase(p, 0, 0.18))
      const swing = Math.sin(phase(p, 0.2, 0.8) * Math.PI * 3) * 0.45 * pulse(phase(p, 0.2, 0.8))
      group.rotation.z = swing
      group.scale.set(1, raise * (1 - easeInOut(phase(p, 0.88, 1))) + 0.001, 1)
      const array = clothPositions.array as Float32Array
      for (let index = 0; index < clothPositions.count; index++) {
        const x = base[index * 3]
        array[index * 3 + 2] =
          Math.sin(x * 5 - now * 0.018) * 0.12 * x + Math.sin(x * 9 - now * 0.03) * 0.03 * x
        array[index * 3 + 1] = base[index * 3 + 1] - x * x * 0.08 * (1 - Math.abs(swing))
      }
      clothPositions.needsUpdate = true
    },
    options.priority ?? 'ability',
  )
}

export interface SwingOptions {
  // Arm pitch (radians around the pivot's x axis) at the top of the wind-up and at the end of the strike.
  from: number
  to: number
  height?: number
  roll?: number
  windup?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Swings a held prop (+y is the weapon's length) from the caster toward the target: wind-up, strike, fade.
export function swing(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  prop: THREE.Object3D,
  options: SwingOptions,
): void {
  const pivot = new THREE.Group()
  const arm = new THREE.Group()
  pivot.add(arm)
  arm.add(prop)
  const windup = options.windup ?? 0.45
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 420,
    pivot,
    (p) => {
      pivot.position.copy(source.root.position).add(source.pose.offset)
      pivot.position.y = (options.height ?? 0.75) + source.pose.lift
      pivot.lookAt(target.root.position.x, pivot.position.y, target.root.position.z)
      if (options.roll) pivot.rotateZ(options.roll)
      const raise = easeOut(phase(p, 0, windup))
      const strike = easeIn(phase(p, windup, windup + 0.2))
      arm.rotation.x = options.from * raise + (options.to - options.from) * strike
      setOpacity(pivot, 1 - phase(p, 0.82, 1))
    },
    options.priority ?? 'ability',
  )
}

// Weapon builders: the grip sits at the origin and the weapon extends along +y.
export function blade(
  length: number,
  color: ColorInput,
  edge: ColorInput,
  width = 0.07,
): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6).translate(0, 0.1, 0),
      standard('#1f1f1f'),
    ),
    new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.03, 0.05).translate(0, 0.21, 0),
      standard('#caa24a', { metalness: 0.8 }),
    ),
    new THREE.Mesh(
      new THREE.BoxGeometry(width, length, 0.015).translate(0, 0.22 + length / 2, 0),
      standard(color, { metalness: 0.9, roughness: 0.2 }),
    ),
    new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.8, length, 0.03).translate(0, 0.22 + length / 2, 0),
      glow(edge, 0.55),
    ),
  )
  return group
}

// A pole weapon or staff: prongs = 0 gives a plain pole (Sabo's pipe), 1 a spear or naginata, 3 a trident.
export function spear(length: number, shaft: ColorInput, tip: ColorInput, prongs = 1): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, length, 6).translate(0, length / 2, 0),
      standard(shaft),
    ),
  )
  const spread = prongs > 1 ? 0.07 : 0
  for (let index = 0; index < prongs; index++) {
    const center = prongs === 1 || index === (prongs - 1) / 2
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, center ? 0.24 : 0.17, 6),
      standard(tip, { metalness: 0.8, roughness: 0.25 }),
    )
    cone.position.set(prongs > 1 ? (index - (prongs - 1) / 2) * spread : 0, length + 0.1, 0)
    group.add(cone)
  }
  if (prongs > 1) {
    group.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(spread * 2.4, 0.03, 0.03).translate(0, length, 0),
        standard(tip, { metalness: 0.8 }),
      ),
    )
  }
  return group
}

export interface MotionLineOptions {
  color: ColorInput
  count?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Speed streaks that ride along with a unit and trail opposite its current motion (dashes, leaps, Agility).
export function motionLines(ctx: FxContext, view: UnitView, options: MotionLineOptions): void {
  const count = scaledCount(ctx, options.count ?? 8)
  const positions = new Float32Array(count * 6)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: options.color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const lines = new THREE.LineSegments(geometry, material)
  lines.frustumCulled = false
  const seeds = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 0.9,
    y: 0.2 + Math.random() * 0.9,
    z: (Math.random() - 0.5) * 0.9,
    length: 0.4 + Math.random() * 0.6,
  }))
  const previous = new THREE.Vector3()
  const current = new THREE.Vector3()
  const direction = new THREE.Vector3(0, 1, 0)
  let seeded = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    lines,
    (p) => {
      current.copy(view.root.position).add(view.pose.offset)
      current.y = view.pose.lift
      if (seeded && current.distanceToSquared(previous) > 1e-5)
        direction.subVectors(current, previous).normalize()
      previous.copy(current)
      seeded = true
      seeds.forEach((seed, index) => {
        const x = current.x + seed.x
        const y = current.y + seed.y
        const z = current.z + seed.z
        positions.set(
          [
            x,
            y,
            z,
            x - direction.x * seed.length,
            y - direction.y * seed.length,
            z - direction.z * seed.length,
          ],
          index * 6,
        )
      })
      geometry.attributes.position.needsUpdate = true
      material.opacity = fadeInOut(p, 0.1, 0.4)
    },
    options.priority ?? 'ability',
  )
}

export interface BubbleOptions {
  color: ColorInput
  count?: number
  size?: number
  wobble?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Glossy bubbles that wobble from `from` to `to` and pop on arrival: Bubble, Bubble Beam, foam.
export function bubbles(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: BubbleOptions,
): void {
  const count = Math.max(
    3,
    Math.round((options.count ?? 10) * Math.min(1, ctx.particleScale + 0.3)),
  )
  const size = options.size ?? 0.11
  const group = new THREE.Group()
  const list = Array.from({ length: count }, (_, index) => {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(size * (0.6 + Math.random() * 0.8), 14, 10),
      standard(options.color, {
        opacity: 0.45,
        roughness: 0.05,
        metalness: 0.2,
        emissive: new THREE.Color(options.color).multiplyScalar(0.35),
      }),
    )
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.35, size * 0.5, 12, 1, 0, Math.PI * 0.5),
      glow('#ffffff', 0.9),
    )
    rim.position.set(-size * 0.2, size * 0.2, size * 0.4)
    bubble.add(rim)
    group.add(bubble)
    return {
      bubble,
      rim,
      launch: (index / count) * 0.45,
      phase: Math.random() * Math.PI * 2,
      lateral: (Math.random() - 0.5) * 0.35,
    }
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const side = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    group,
    (p) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      side.subVectors(end, start).cross(UP).normalize()
      list.forEach((item) => {
        const t = (p - item.launch) / 0.5
        item.bubble.visible = t > 0 && t < 1.15
        if (!item.bubble.visible) return
        const travel = Math.min(1, t)
        item.bubble.position.lerpVectors(start, end, travel)
        item.bubble.position.addScaledVector(
          side,
          item.lateral * pulse(travel) + Math.sin(t * 12 + item.phase) * (options.wobble ?? 0.05),
        )
        item.bubble.position.y += Math.sin(t * 9 + item.phase) * 0.05
        const pop = t > 1 ? (t - 1) / 0.15 : 0
        item.bubble.scale.setScalar(1 + pop * 1.2)
        setOpacity(item.bubble, 1 - pop)
        item.rim.quaternion.copy(ctx.camera.quaternion)
      })
    },
    options.priority ?? 'ability',
  )
}

export interface MoteOptions {
  colors: ColorInput[]
  count?: number
  radius?: number
  height?: number
  base?: number
  // How many times each mote travels its full height over the effect; negative falls.
  cycles?: number
  sway?: number
  size?: number
  twinkle?: boolean
  // Radians each mote circles the center over one pass (a slow swirl).
  swirl?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Long-lived motes that loop through a column with sway: rising embers, falling diamond dust, drifting sparks.
export function driftMotes(ctx: FxContext, center: PointSource, options: MoteOptions): void {
  const count = scaledCount(ctx, options.count ?? 40)
  const radius = options.radius ?? 1.2
  const height = options.height ?? 1.8
  const base = options.base ?? 0.1
  const cycles = options.cycles ?? 1.2
  const sway = options.sway ?? 0.12
  const swirl = options.swirl ?? 0
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const palette = options.colors.map((color) => new THREE.Color(color))
  const seeds = Array.from({ length: count }, (_, index) => ({
    angle: Math.random() * Math.PI * 2,
    distance: Math.sqrt(Math.random()) * radius,
    offset: Math.random(),
    speed: 0.7 + Math.random() * 0.6,
    color: palette[index % palette.length],
    phase: Math.random() * 10,
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: options.size ?? 0.09,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const origin = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 1400,
    points,
    (p, now) => {
      origin.copy(resolvePoint(center))
      const envelope = fadeInOut(p, 0.1, 0.4)
      seeds.forEach((seed, index) => {
        const local = (((seed.offset + p * cycles * seed.speed) % 1) + 1) % 1
        const wobble = Math.sin(local * 6 + seed.phase) * sway
        const angle = seed.angle + swirl * local
        positions[index * 3] = origin.x + Math.cos(angle) * seed.distance + wobble
        positions[index * 3 + 1] = origin.y + base + local * height
        positions[index * 3 + 2] =
          origin.z + Math.sin(angle) * seed.distance + Math.cos(local * 5 + seed.phase) * sway
        const life = Math.sin(Math.PI * local)
        const twinkle = options.twinkle
          ? 0.35 + 0.65 * Math.max(0, Math.sin(now * 0.02 + seed.phase * 3))
          : 1
        const brightness = life * twinkle * envelope
        colors[index * 3] = seed.color.r * brightness
        colors[index * 3 + 1] = seed.color.g * brightness
        colors[index * 3 + 2] = seed.color.b * brightness
      })
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
    },
    options.priority ?? 'ability',
  )
}
