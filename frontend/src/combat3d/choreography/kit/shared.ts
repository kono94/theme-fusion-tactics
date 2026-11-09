import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { type ColorInput, type FxContext, glow, later, leafMesh } from '../primitives'

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

export interface BloomOptions {
  petal: ColorInput
  spot?: ColorInput
  center?: ColorInput
  petals?: number
  size?: number
  height?: number
  delay?: number
  duration?: number
}

// A flower that unfolds above a unit's head (Venusaur's back flower, Vileplume's petals).
export function bloom(ctx: FxContext, view: UnitView, options: BloomOptions): void {
  const count = options.petals ?? 5
  const size = options.size ?? 0.35
  const group = new THREE.Group()
  const petals: THREE.Object3D[] = []
  for (let index = 0; index < count; index++) {
    const pivot = new THREE.Group()
    pivot.rotation.y = (index / count) * Math.PI * 2
    const petal = leafMesh(options.petal, size)
    petal.geometry.rotateX(Math.PI / 2).translate(0, size, 0)
    if (options.spot) {
      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(size * 0.18, 10),
        standard(options.spot, { opacity: 1, roughness: 0.6 }),
      )
      spot.position.set(0, size * 1.1, 0.01)
      petal.add(spot)
    }
    pivot.add(petal)
    petals.push(petal)
    group.add(pivot)
  }
  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(size * 0.3, 12, 8),
    glow(options.center ?? '#fde047', 0.9),
  )
  group.add(heart)
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, group, (p) => {
    group.position
      .copy(view.root.position)
      .setY(view.height + (options.height ?? 0.1) + view.pose.lift)
    const open = easeInOut(Math.min(1, p / 0.35))
    const close = p > 0.8 ? (p - 0.8) / 0.2 : 0
    petals.forEach((petal) => {
      petal.rotation.x = -(Math.PI / 2) * (0.1 + open * 0.75) * (1 - close)
    })
    group.rotation.y = p * 1.2
    group.scale.setScalar(Math.max(0.01, (0.3 + open * 0.7) * (1 - close)))
  })
}

export interface PowderOptions {
  color: ColorInput
  count?: number
  radius?: number
  height?: number
  size?: number
  delay?: number
  duration?: number
  swirl?: number
}

// Powder that drifts down from above in a slow swirling spiral onto an area.
export function powderFall(ctx: FxContext, center: PointSource, options: PowderOptions): void {
  const count = Math.max(6, Math.round((options.count ?? 40) * ctx.particleScale))
  const radius = options.radius ?? 1
  const height = options.height ?? 2
  const seeds = Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.sqrt(Math.random()) * radius,
    start: Math.random() * 0.35,
    speed: 0.7 + Math.random() * 0.5,
  }))
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: options.size ?? 0.12,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const origin = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, points, (p) => {
    if (!resolved) {
      origin.copy(resolvePoint(center))
      resolved = true
    }
    seeds.forEach((seed, index) => {
      const local = Math.min(1, Math.max(0, (p - seed.start) / (1 - seed.start)) * seed.speed)
      const angle = seed.angle + local * (options.swirl ?? 3)
      const r = seed.radius * (0.6 + local * 0.4)
      positions[index * 3] = origin.x + Math.cos(angle) * r
      positions[index * 3 + 1] = p < seed.start ? HIDDEN_Y : 0.1 + height * (1 - local)
      positions[index * 3 + 2] = origin.z + Math.sin(angle) * r
    })
    geometry.attributes.position.needsUpdate = true
    material.opacity = fadeInOut(p, 0.1, 0.3)
  })
}

export const SIDE = new THREE.Vector3()

export const LIFT = new THREE.Vector3()

// Perpendicular basis around a travel direction, for placing things around a jet or a drain path.
export function basis(direction: THREE.Vector3): void {
  SIDE.crossVectors(direction, UP)
  if (SIDE.lengthSq() < 1e-4) SIDE.set(1, 0, 0)
  SIDE.normalize()
  LIFT.crossVectors(SIDE, direction).normalize()
}

export function liquid(color: ColorInput, opacity: number): THREE.MeshStandardMaterial {
  const material = standard(color, {
    opacity,
    roughness: 0.04,
    metalness: 0.25,
    emissive: new THREE.Color(color).multiplyScalar(0.45),
  })
  material.transparent = true
  material.depthWrite = false
  return material
}

export function sprayPoints(count: number, color: ColorInput, size: number) {
  const positions = new Float32Array(count * 3).fill(HIDDEN_Y)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return { points, positions, geometry, material }
}

export function colorPoints(count: number, size: number) {
  const positions = new Float32Array(count * 3).fill(HIDDEN_Y)
  const colors = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return { points, positions, colors, geometry, material }
}

export const phaseOf = (p: number, start: number, end: number): number =>
  Math.min(1, Math.max(0, (p - start) / (end - start)))

export const easeOutCubic = (p: number): number => 1 - (1 - p) ** 3

export interface JetOptions {
  color?: ColorInput
  core?: ColorInput
  foam?: ColorInput
  radius?: number
  flare?: number
  rings?: number
  spray?: number
  grow?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Pressurised water jet: a glossy rippling water column with a bright inner core, pressure rings racing down its
// length, a round water head on the front while it extends, and droplets peeling off the sides under gravity.
export function waterJet(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: JetOptions = {},
): void {
  const radius = options.radius ?? 0.08
  const grow = options.grow ?? 0.25
  const color = options.color ?? '#38bdf8'
  const foam = options.foam ?? '#bae6fd'
  const root = new THREE.Group()
  const jet = new THREE.Group()
  const shaft = new THREE.Group()
  root.add(jet)
  jet.add(shaft)
  const bodyGeometry = new THREE.CylinderGeometry(
    radius,
    radius * (options.flare ?? 1.4),
    1,
    14,
    10,
    true,
  ).translate(0, 0.5, 0)
  const base = Float32Array.from(bodyGeometry.attributes.position.array as Float32Array)
  const angles = Array.from({ length: base.length / 3 }, (_, index) =>
    Math.atan2(base[index * 3 + 2], base[index * 3]),
  )
  shaft.add(
    new THREE.Mesh(bodyGeometry, liquid(color, 0.62)),
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.42, radius * 0.6, 1, 10, 1, true).translate(0, 0.5, 0),
      glow(options.core ?? '#7dd3fc', 0.6),
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.35, radius * 1.9, 1, 14, 1, true).translate(0, 0.5, 0),
      glow(color, 0.16),
    ),
  )
  const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.6, 14, 10), liquid(color, 0.75))
  head.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 2.3, 12, 8), glow(foam, 0.28)))
  jet.add(head)
  const rings = Array.from({ length: options.rings ?? 3 }, () => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.45, radius * 0.26, 6, 20),
      glow(foam, 0.5),
    )
    ring.rotation.x = Math.PI / 2
    jet.add(ring)
    return ring
  })
  const sprayCount = Math.max(4, Math.round((options.spray ?? 24) * ctx.particleScale))
  const spray = sprayPoints(sprayCount, foam, 0.07)
  root.add(spray.points)
  const seeds = Array.from({ length: sprayCount }, () => ({
    launch: Math.random() * 0.8,
    along: 0.15 + Math.random() * 0.85,
    angle: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.9,
  }))
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const cursor = new THREE.Vector3()
  const duration = options.duration ?? 600
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    root,
    (p, now) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      direction.subVectors(end, start)
      const full = Math.max(0.01, direction.length())
      direction.divideScalar(full)
      basis(direction)
      const front = easeOutCubic(phaseOf(p, 0, grow))
      const length = Math.max(0.01, full * front)
      jet.position.copy(start)
      jet.quaternion.setFromUnitVectors(UP, direction)
      const thickness =
        (0.55 + 0.45 * front) * (1 - 0.85 * phaseOf(p, 0.72, 1)) * (1 + 0.07 * Math.sin(now * 0.07))
      shaft.scale.set(thickness, length, thickness)
      const array = bodyGeometry.attributes.position.array as Float32Array
      for (let index = 0; index < angles.length; index++) {
        const y = base[index * 3 + 1]
        const ripple =
          1 +
          0.16 * Math.sin(y * 22 - now * 0.05 + angles[index] * 2) +
          0.07 * Math.sin(y * 47 - now * 0.09)
        array[index * 3] = base[index * 3] * ripple
        array[index * 3 + 2] = base[index * 3 + 2] * ripple
      }
      bodyGeometry.attributes.position.needsUpdate = true
      head.visible = p < grow + 0.08
      head.position.set(0, length, 0)
      head.scale.setScalar(thickness * (1 + 0.15 * Math.sin(now * 0.05)))
      const fade = 1 - phaseOf(p, 0.8, 1)
      setOpacity(shaft, fade)
      setOpacity(head, fade)
      rings.forEach((ring, index) => {
        const t = (p * 2.6 + index / rings.length) % 1
        ring.position.y = t * length
        ring.scale.setScalar(thickness * (0.8 + t * 0.9))
        ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t) * fade
      })
      seeds.forEach((seed, index) => {
        const local = (p - seed.launch) / 0.3
        if (local < 0 || local > 1 || seed.along > front) {
          spray.positions[index * 3 + 1] = HIDDEN_Y
          return
        }
        const time = (local * 0.3 * duration) / 1000
        cursor
          .copy(start)
          .addScaledVector(direction, full * seed.along + time * 1.2)
          .addScaledVector(SIDE, Math.cos(seed.angle) * (radius + seed.speed * time))
          .addScaledVector(LIFT, Math.sin(seed.angle) * (radius + seed.speed * time))
        cursor.y -= 4.5 * time * time
        spray.positions.set([cursor.x, cursor.y, cursor.z], index * 3)
      })
      spray.geometry.attributes.position.needsUpdate = true
      spray.material.opacity = fade
    },
    options.priority ?? 'ability',
  )
}

export interface SplashOptions {
  color?: ColorInput
  foam?: ColorInput
  radius?: number
  height?: number
  tips?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Splash crown on the floor: a glossy flared water wall with a lobed rim, droplets flung off each lobe that arc
// out and fall, fine mist and an expanding ripple ring.
export function splashCrown(ctx: FxContext, point: PointSource, options: SplashOptions = {}): void {
  const radius = options.radius ?? 0.35
  const height = options.height ?? 0.5
  const color = options.color ?? '#38bdf8'
  const foam = options.foam ?? '#bae6fd'
  const lobes = Math.max(5, Math.round((options.tips ?? 10) * Math.max(0.6, ctx.particleScale)))
  const duration = options.duration ?? 800
  const group = new THREE.Group()
  const crown = new THREE.Group()
  const sheetGeometry = new THREE.CylinderGeometry(1, 0.55, 1, 30, 3, true).translate(0, 0.5, 0)
  const sheetPositions = sheetGeometry.attributes.position
  for (let index = 0; index < sheetPositions.count; index++) {
    if (sheetPositions.getY(index) < 0.99) continue
    const angle = Math.atan2(sheetPositions.getZ(index), sheetPositions.getX(index))
    sheetPositions.setY(index, 1 + 0.35 * Math.max(0, Math.cos(angle * lobes)))
  }
  crown.add(
    new THREE.Mesh(sheetGeometry, liquid(color, 0.5)),
    new THREE.Mesh(sheetGeometry.clone().scale(1.04, 1, 1.04), glow(foam, 0.2)),
  )
  group.add(crown)
  const drops = Array.from({ length: lobes }, (_, index) => {
    const size = 0.03 + Math.random() * 0.025
    const drop = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), liquid(color, 0.9))
    drop.add(new THREE.Mesh(new THREE.SphereGeometry(size * 1.8, 8, 6), glow(foam, 0.35)))
    group.add(drop)
    const rise = height * (0.9 + Math.random() * 0.7)
    return {
      drop,
      angle: (index / lobes) * Math.PI * 2,
      out: radius * (1.2 + Math.random() * 1.4),
      up: Math.sqrt(2 * 9 * rise),
    }
  })
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), glow(color, 0.7))
  ripple.rotation.x = -Math.PI / 2
  group.add(ripple)
  const mistCount = Math.max(4, Math.round(16 * ctx.particleScale))
  const mist = sprayPoints(mistCount, foam, 0.06)
  group.add(mist.points)
  const mistSeeds = Array.from({ length: mistCount }, () => ({
    angle: Math.random() * Math.PI * 2,
    out: 0.4 + Math.random() * 0.9,
    up: 1.5 + Math.random() * 2,
  }))
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    duration,
    group,
    (p) => {
      if (!resolved) {
        const origin = resolvePoint(point)
        group.position.set(origin.x, Math.max(0.04, origin.y), origin.z)
        resolved = true
      }
      const time = (p * duration) / 1000
      const rise = p < 0.3 ? easeOutCubic(p / 0.3) : 1 - phaseOf(p, 0.3, 0.8) ** 2
      const spread = radius * (0.45 + 0.75 * easeOutCubic(phaseOf(p, 0, 0.6)))
      crown.scale.set(spread, Math.max(0.001, height * rise), spread)
      crown.rotation.y = p * 0.6
      setOpacity(crown, 1 - phaseOf(p, 0.5, 0.85))
      drops.forEach(({ drop, angle, out, up }) => {
        const y = up * time - 9 * time * time
        drop.visible = y > -0.02
        drop.position.set(
          Math.cos(angle) * (radius * 0.6 + out * time),
          y,
          Math.sin(angle) * (radius * 0.6 + out * time),
        )
        drop.scale.set(1, 1 + Math.min(1.2, Math.abs(up - 18 * time) * 0.25), 1)
      })
      ripple.scale.setScalar(0.3 + easeOutCubic(p) * radius * 3)
      ;(ripple.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - p)
      mistSeeds.forEach((seed, index) => {
        const y = seed.up * time * 0.6 - 3 * time * time
        mist.positions.set(
          [
            Math.cos(seed.angle) * seed.out * time,
            Math.max(0, y),
            Math.sin(seed.angle) * seed.out * time,
          ],
          index * 3,
        )
      })
      mist.geometry.attributes.position.needsUpdate = true
      mist.material.opacity = 0.7 * (1 - p)
    },
    options.priority ?? 'ability',
  )
}

export interface TorrentOptions {
  radius?: number
  puffs?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

export const FLAME_RAMP = ['#fcd34d', '#f97316', '#dc2626', '#44120a'].map(
  (hex) => new THREE.Color(hex),
)

export function rampColor(t: number, out: THREE.Color): THREE.Color {
  const scaled = Math.min(FLAME_RAMP.length - 1.001, Math.max(0, t) * (FLAME_RAMP.length - 1))
  const index = Math.floor(scaled)
  return out.copy(FLAME_RAMP[index]).lerp(FLAME_RAMP[index + 1], scaled - index)
}

// Roaring flame torrent: nested additive cones (red sheath, orange body, golden core) whose surfaces churn with
// scrolling turbulence, billowing fireballs that swell and cool from gold to deep red along the flow, and dark
// smoke curling off the far end.
export function flameTorrent(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: TorrentOptions = {},
): void {
  const radius = options.radius ?? 0.7
  const root = new THREE.Group()
  const jet = new THREE.Group()
  root.add(jet)
  // The outer sheath is unlit but not additive so the torrent has a solid red-orange body; only the inner two
  // layers add light, which keeps the core warm gold instead of washing out to white.
  const layers = [
    { color: '#c2410c', width: 1, opacity: 0.4, speed: 0.035, amp: 0.24, additive: false },
    { color: '#f97316', width: 0.68, opacity: 0.4, speed: 0.05, amp: 0.18, additive: true },
    { color: '#f59e0b', width: 0.36, opacity: 0.45, speed: 0.075, amp: 0.13, additive: true },
  ].map((layer, index) => {
    const geometry = new THREE.ConeGeometry(1, 1, 18, 12, true)
      .rotateX(Math.PI)
      .translate(0, 0.5, 0)
    const base = Float32Array.from(geometry.attributes.position.array as Float32Array)
    jet.add(
      new THREE.Mesh(
        geometry,
        layer.additive ? glow(layer.color, layer.opacity) : flat(layer.color, layer.opacity),
      ),
    )
    return { ...layer, geometry, base, seed: index * 1.7 }
  })
  const puffCount = Math.max(6, Math.round((options.puffs ?? 18) * ctx.particleScale))
  const puffs = Array.from({ length: puffCount }, (_, index) => {
    const material = flat('#fbbf24', 0.5)
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), material)
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0)
    root.add(mesh)
    return {
      mesh,
      material,
      offset: index / puffCount,
      angle: Math.random() * Math.PI * 2,
      wander: 0.3 + Math.random() * 0.7,
      size: 0.7 + Math.random() * 0.6,
    }
  })
  const smoke = Array.from({ length: 6 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: '#292524',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), material)
    root.add(mesh)
    return { mesh, material, offset: index / 6, along: 0.55 + Math.random() * 0.45 }
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const tint = new THREE.Color()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    root,
    (p, now) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      direction.subVectors(end, start)
      const full = Math.max(0.01, direction.length())
      direction.divideScalar(full)
      basis(direction)
      const front = easeOutCubic(phaseOf(p, 0, 0.18))
      const envelope = front * (1 - phaseOf(p, 0.8, 1))
      const length = Math.max(0.01, full * front)
      jet.position.copy(start)
      jet.quaternion.setFromUnitVectors(UP, direction)
      const roar = 1 + 0.08 * Math.sin(now * 0.04) + 0.05 * Math.sin(now * 0.11)
      jet.scale.set(
        radius * roar * (0.4 + 0.6 * envelope),
        length,
        radius * roar * (0.4 + 0.6 * envelope),
      )
      layers.forEach((layer) => {
        const array = layer.geometry.attributes.position.array as Float32Array
        for (let index = 0; index < array.length / 3; index++) {
          const x = layer.base[index * 3]
          const y = layer.base[index * 3 + 1]
          const z = layer.base[index * 3 + 2]
          const angle = Math.atan2(z, x)
          const churn =
            1 +
            layer.amp * Math.sin(y * 14 - now * layer.speed + angle * 3 + layer.seed) +
            layer.amp * 0.5 * Math.sin(y * 31 - now * layer.speed * 1.7 + angle * 5 - layer.seed)
          array[index * 3] = x * layer.width * churn + Math.sin(y * 6 - now * 0.02) * 0.08 * y
          array[index * 3 + 1] = y
          array[index * 3 + 2] = z * layer.width * churn
        }
        layer.geometry.attributes.position.needsUpdate = true
      })
      setOpacity(jet, envelope)
      puffs.forEach((puff) => {
        const t = (p * 2.4 + puff.offset) % 1
        const visible = t <= front && p < 0.92
        puff.mesh.visible = visible
        if (!visible) return
        const wander = t * radius * 0.55 * puff.wander
        puff.mesh.position
          .copy(start)
          .addScaledVector(direction, t * full)
          .addScaledVector(SIDE, Math.cos(puff.angle + t * 5) * wander)
          .addScaledVector(LIFT, Math.sin(puff.angle + t * 5) * wander + t * t * 0.3)
        puff.mesh.scale.setScalar((0.06 + t * radius * 0.42) * puff.size)
        puff.mesh.rotation.z += 0.05
        puff.material.color.copy(rampColor(t * 1.1, tint))
        puff.material.opacity = 0.5 * (1 - t * t) * envelope
      })
      smoke.forEach((puff) => {
        const t = (p * 1.3 + puff.offset) % 1
        puff.mesh.position
          .copy(start)
          .addScaledVector(direction, full * puff.along)
          .addScaledVector(SIDE, Math.sin(puff.offset * 9 + t * 3) * 0.2)
        puff.mesh.position.y += 0.3 + t * 0.9
        puff.mesh.scale.setScalar(0.12 + t * 0.3)
        puff.material.opacity = 0.32 * Math.sin(Math.PI * t) * envelope
      })
    },
    options.priority ?? 'ability',
  )
}

// Heat shimmer: faint wavering lines of hot air hanging above and beside a flame's path.
export function heatShimmer(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: { color?: ColorInput; delay?: number; duration?: number } = {},
): void {
  const segments = 28
  const group = new THREE.Group()
  const strands = Array.from({ length: 6 }, (_, index) => {
    const positions = new Float32Array((segments + 1) * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: options.color ?? '#fdba74',
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    line.frustumCulled = false
    group.add(line)
    return {
      positions,
      geometry,
      height: 0.35 + (index % 3) * 0.28,
      side: (index < 3 ? -1 : 1) * (0.15 + Math.random() * 0.3),
      seed: Math.random() * 10,
    }
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const cursor = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, group, (p, now) => {
    start.copy(resolvePoint(from))
    end.copy(resolvePoint(to))
    direction.subVectors(end, start)
    const full = direction.length()
    direction.normalize()
    basis(direction)
    strands.forEach((strand) => {
      for (let index = 0; index <= segments; index++) {
        const t = 0.1 + (index / segments) * 0.9
        cursor
          .copy(start)
          .addScaledVector(direction, t * full)
          .addScaledVector(
            SIDE,
            strand.side * (0.5 + t) + Math.sin(t * 13 + now * 0.015 + strand.seed) * 0.06,
          )
        cursor.y +=
          strand.height * t + Math.sin(t * 21 - now * 0.022 + strand.seed) * 0.05 + p * 0.25
        strand.positions.set([cursor.x, cursor.y, cursor.z], index * 3)
      }
      strand.geometry.attributes.position.needsUpdate = true
    })
    setOpacity(group, fadeInOut(p, 0.15, 0.4))
  })
}

// Glowing embers scattered along a path that drift upward and flicker out slowly.
export function embers(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: { count?: number; spread?: number; delay?: number; duration?: number } = {},
): void {
  const count = Math.max(6, Math.round((options.count ?? 36) * ctx.particleScale))
  const spread = options.spread ?? 0.5
  const cloud = colorPoints(count, 0.075)
  const palette = ['#fbbf24', '#f97316', '#fde68a', '#ef4444'].map((hex) => new THREE.Color(hex))
  const seeds = Array.from({ length: count }, (_, index) => ({
    along: 0.12 + Math.random() * 0.95,
    side: (Math.random() - 0.5) * 2 * spread,
    launch: Math.random() * 0.5,
    rise: 0.6 + Math.random() * 1.1,
    seed: Math.random() * 10,
    color: palette[index % palette.length],
  }))
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const cursor = new THREE.Vector3()
  const side = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 1400, cloud.points, (p, now) => {
    if (!resolved) {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      direction.subVectors(end, start)
      basis(direction.clone().normalize())
      side.copy(SIDE)
      resolved = true
    }
    seeds.forEach((seed, index) => {
      const local = (p - seed.launch) / (1 - seed.launch)
      if (local < 0) return
      cursor
        .copy(start)
        .addScaledVector(direction, seed.along)
        .addScaledVector(side, seed.side + Math.sin(local * 6 + seed.seed) * 0.12)
      cursor.y = Math.max(0.1, cursor.y - 0.2) + local * seed.rise
      cloud.positions.set([cursor.x, cursor.y, cursor.z], index * 3)
      const flicker =
        (0.55 + 0.45 * Math.sin(now * 0.025 + seed.seed * 7)) * (1 - local) * Math.min(1, local * 8)
      cloud.colors.set(
        [seed.color.r * flicker, seed.color.g * flicker, seed.color.b * flicker],
        index * 3,
      )
    })
    cloud.geometry.attributes.position.needsUpdate = true
    cloud.geometry.attributes.color.needsUpdate = true
  })
}

// Burnt ground along a flame's path: ragged dark blotches with smouldering orange rims that cool off.
export function scorchTrail(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: { width?: number; count?: number; delay?: number; duration?: number } = {},
): void {
  const count = options.count ?? 7
  const width = options.width ?? 0.4
  const group = new THREE.Group()
  const ragged = (geometry: THREE.BufferGeometry, seed: number) => {
    const position = geometry.attributes.position
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index)
      const y = position.getY(index)
      const length = Math.hypot(x, y)
      if (length < 0.5) continue
      const angle = Math.atan2(y, x)
      const scale = 1 + 0.22 * Math.sin(angle * 5 + seed) + 0.12 * Math.sin(angle * 11 + seed * 2)
      position.setXY(index, x * scale, y * scale)
    }
    return geometry.rotateX(-Math.PI / 2)
  }
  const blotches = Array.from({ length: count }, (_, index) => {
    const seed = Math.random() * 10
    const holder = new THREE.Group()
    holder.add(
      new THREE.Mesh(
        ragged(new THREE.CircleGeometry(1, 22), seed),
        new THREE.MeshBasicMaterial({
          color: '#1c1917',
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      ),
    )
    const rim = new THREE.Mesh(
      ragged(new THREE.RingGeometry(0.72, 1, 22), seed),
      glow('#ea580c', 0.75),
    )
    rim.position.y = 0.005
    holder.add(rim)
    group.add(holder)
    return {
      holder,
      rim,
      t: (index + 0.5) / count,
      size: width * (0.55 + Math.random() * 0.5),
      side: (Math.random() - 0.5) * width * 0.8,
    }
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 1600, group, (p) => {
    if (!resolved) {
      start.copy(resolvePoint(from)).setY(0.075)
      end.copy(resolvePoint(to)).setY(0.075)
      direction.subVectors(end, start)
      basis(direction.clone().normalize())
      blotches.forEach((blotch) => {
        blotch.holder.position
          .copy(start)
          .addScaledVector(direction, blotch.t)
          .addScaledVector(SIDE, blotch.side)
        blotch.holder.rotation.y = Math.random() * Math.PI
      })
      resolved = true
    }
    blotches.forEach((blotch) => {
      const appear = easeOutCubic(phaseOf(p, blotch.t * 0.2, blotch.t * 0.2 + 0.1))
      blotch.holder.scale.setScalar(Math.max(0.001, blotch.size * appear))
      setOpacity(blotch.holder, 1 - phaseOf(p, 0.65, 1))
      ;(blotch.rim.material as THREE.MeshBasicMaterial).opacity =
        0.75 * appear * (1 - phaseOf(p, 0.2, 0.7)) * (0.8 + 0.2 * Math.sin(p * 40 + blotch.t * 9))
    })
  })
}

export interface DrainOptions {
  count?: number
  travel?: number
  turns?: number
  delay?: number
  duration?: number
}

// Life drain: motes with short comet tails spiral along a helix from `from` to `to`, arching over the gap.
export function lifeDrain(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: DrainOptions = {},
): void {
  const count = Math.max(8, Math.round((options.count ?? 24) * ctx.particleScale))
  const travel = options.travel ?? 0.45
  const turns = options.turns ?? 2
  const tail = 3
  const cloud = colorPoints(count * tail, 0.08)
  const palette = ['#4ade80', '#bef264', '#86efac', '#22c55e'].map((hex) => new THREE.Color(hex))
  const seeds = Array.from({ length: count }, (_, index) => ({
    launch: (index / count) * (1 - travel),
    angle: Math.random() * Math.PI * 2,
    radius: 0.18 + Math.random() * 0.16,
    color: palette[index % palette.length],
  }))
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const cursor = new THREE.Vector3()
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, cloud.points, (p) => {
    start.copy(resolvePoint(from))
    end.copy(resolvePoint(to))
    basis(direction.subVectors(end, start).normalize())
    seeds.forEach((seed, index) => {
      for (let step = 0; step < tail; step++) {
        const offset = (index * tail + step) * 3
        const k = (p - seed.launch) / travel - step * 0.05
        if (k < 0 || k > 1) {
          cloud.positions[offset + 1] = HIDDEN_Y
          continue
        }
        const eased = easeInOut(k)
        const r = seed.radius * Math.sin(Math.PI * k) + 0.03
        const a = seed.angle + k * turns * Math.PI * 2
        cursor
          .lerpVectors(start, end, eased)
          .addScaledVector(SIDE, Math.cos(a) * r)
          .addScaledVector(LIFT, Math.sin(a) * r)
        cursor.y += Math.sin(Math.PI * eased) * 0.55
        cloud.positions.set([cursor.x, cursor.y, cursor.z], offset)
        const brightness = (1 - step * 0.35) * Math.min(1, k * 6) * (1 - phaseOf(k, 0.85, 1) * 0.6)
        cloud.colors.set(
          [seed.color.r * brightness, seed.color.g * brightness, seed.color.b * brightness],
          offset,
        )
      }
    })
    cloud.geometry.attributes.position.needsUpdate = true
    cloud.geometry.attributes.color.needsUpdate = true
  })
}

export type PositionAt = (now: number, out: THREE.Vector3) => THREE.Vector3

export const fadeTail = (p: number, from = 0.7): number =>
  p < from ? 1 : 1 - (p - from) / (1 - from)

export interface RushOptions {
  delay?: number
  duration: number
  reach?: number
  hold?: number
  outEnd?: number
  lift?: number
  priority?: RenderEffectPriority
}

// Like `dash`, but returns a sampler of the body position so props (water sheath, flame wheel, horn, boulder)
// stay glued to the rushing Pokemon regardless of effect update order.
export function rush(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: RushOptions,
): PositionAt {
  const delay = options.delay ?? 0
  const start = ctx.now + delay
  const travel = new THREE.Vector3().subVectors(target.root.position, source.root.position).setY(0)
  const ranged = source.unit.range > 1 ? 0.35 / Math.max(0.35, travel.length()) : Infinity
  const reach = Math.min(ranged, (options.reach ?? 0.8) * (ctx.reducedMotion ? 0.3 : 1))
  const outEnd = options.outEnd ?? 0.3
  const backStart = outEnd + (options.hold ?? 0.25)
  const amount = (p: number) =>
    p < outEnd
      ? easeInOut(p / outEnd)
      : p < backStart
        ? 1
        : 1 - easeInOut((p - backStart) / Math.max(0.01, 1 - backStart))
  const lift = options.lift ?? 0
  fx(
    ctx,
    delay,
    options.duration,
    undefined,
    (p) => {
      source.pose.offset.addScaledVector(travel, amount(p) * reach)
      source.pose.lift += Math.sin(Math.PI * p) * lift
    },
    options.priority,
  )
  return (now, out) => {
    const p = clamp01((now - start) / options.duration)
    return out
      .copy(source.root.position)
      .addScaledVector(travel, amount(p) * reach)
      .setY(source.height * 0.55 + Math.sin(Math.PI * p) * lift)
  }
}

export interface BoltOptions {
  color: ColorInput
  core?: ColorInput
  width?: number
  segments?: number
  jitter?: number
  delay?: number
  duration?: number
}

// Raichu's Thunder: a thick jagged bolt of cylinder links whose kinks re-randomise so it crackles.
export function thickBolt(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: BoltOptions,
): void {
  const segments = options.segments ?? 7
  const width = options.width ?? 0.08
  const jitter = options.jitter ?? 0.5
  const group = new THREE.Group()
  const links: THREE.Mesh[] = []
  for (let index = 0; index < segments; index++) {
    const link = new THREE.Mesh(
      new THREE.CylinderGeometry(width, width, 1, 6, 1, true),
      glow(options.color),
    )
    link.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.4, width * 0.4, 1, 6, 1, true),
        glow(options.core ?? '#ffffff'),
      ),
    )
    links.push(link)
    group.add(link)
  }
  const nodes = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const dir = new THREE.Vector3()
  let last = -1
  fx(ctx, options.delay ?? 0, options.duration ?? 320, group, (p, now) => {
    if (now - last > 55) {
      last = now
      a.copy(resolvePoint(from))
      b.copy(resolvePoint(to))
      nodes.forEach((node, index) => {
        const wobble = index === 0 || index === segments ? 0 : jitter
        node.lerpVectors(a, b, index / segments)
        node.x += (Math.random() - 0.5) * wobble
        node.z += (Math.random() - 0.5) * wobble
      })
      links.forEach((link, index) => {
        const start = nodes[index]
        const end = nodes[index + 1]
        link.position.lerpVectors(start, end, 0.5)
        link.quaternion.setFromUnitVectors(up, dir.subVectors(end, start).normalize())
        link.scale.set(1, Math.max(0.01, start.distanceTo(end)), 1)
      })
    }
    setOpacity(group, fadeTail(p, 0.55) * (0.75 + 0.25 * Math.sin(now * 0.08)))
  })
}

export function flameMesh(
  color: ColorInput,
  core: ColorInput = '#fff7d6',
  size = 0.2,
): THREE.Group {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), glow(color, 0.85))
  const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.3, 12, 1, true), glow(color, 0.75))
  tongue.position.y = 0.62
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glow(core))
  heart.position.y = 0.05
  group.add(body, tongue, heart)
  group.scale.setScalar(size)
  return group
}

export interface StreakOptions {
  color: ColorInput
  count?: number
  spread?: number
  delay?: number
  duration?: number
  thickness?: number
  priority?: RenderEffectPriority
}

// Point-to-point speed lines that zip along a path with staggered starts (for moves where the user vanishes).
export function speedStreaks(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: StreakOptions,
): void {
  const count = Math.max(3, scaledCount(ctx, options.count ?? 10))
  const spread = options.spread ?? 0.5
  const thickness = options.thickness ?? 0.02
  const group = new THREE.Group()
  const lines = Array.from({ length: count }, (_, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, thickness, 1),
      glow(index % 3 === 0 ? '#ffffff' : options.color, 0.9),
    )
    group.add(mesh)
    return {
      mesh,
      lateral: new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, 0),
      offset: Math.random() * 0.35,
      length: 0.6 + Math.random() * 0.9,
    }
  })
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 320,
    group,
    (p) => {
      if (!resolved) {
        a.copy(resolvePoint(from))
        b.copy(resolvePoint(to))
        group.position.copy(a)
        group.lookAt(b)
        resolved = true
      }
      const distance = a.distanceTo(b)
      lines.forEach((line) => {
        const local = clamp01((p - line.offset) / 0.6)
        const length = Math.max(0.01, line.length * Math.sin(Math.PI * local))
        line.mesh.position.copy(line.lateral)
        line.mesh.position.z = local * distance - length / 2
        line.mesh.scale.z = length
      })
      setOpacity(group, 1 - p * 0.5)
    },
    options.priority,
  )
}

export interface WaveOptions {
  color: ColorInput
  crest?: ColorInput
  radius?: number
  height?: number
  delay?: number
  duration?: number
}

// Sludge Wave: an expanding ring wall with a lumpy crest.
export function waveWall(ctx: FxContext, point: PointSource, options: WaveOptions): void {
  const height = options.height ?? 0.8
  const geometry = new THREE.CylinderGeometry(1, 1.08, height, 40, 1, true).translate(
    0,
    height / 2,
    0,
  )
  const positions = geometry.attributes.position
  for (let index = 0; index < positions.count; index++) {
    if (positions.getY(index) > height / 2) {
      const angle = Math.atan2(positions.getZ(index), positions.getX(index))
      positions.setY(index, height * (0.75 + 0.25 * Math.sin(angle * 7)))
    }
  }
  const wall = new THREE.Mesh(geometry, glow(options.color, 0.6))
  const crest = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.07, 6, 40),
    glow(options.crest ?? '#ffffff', 0.8),
  )
  crest.rotation.x = Math.PI / 2
  crest.position.y = height * 0.85
  const group = new THREE.Group()
  group.add(wall, crest)
  const radius = options.radius ?? 2
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 700, group, (p) => {
    if (!resolved) {
      const center = resolvePoint(point)
      group.position.set(center.x, 0, center.z)
      resolved = true
    }
    const spread = 0.15 + easeInOut(p) * radius
    group.scale.set(spread, Math.sin(Math.PI * Math.min(1, p * 1.3)) + 0.05, spread)
    setOpacity(group, 1 - p * p)
  })
}

export const lit = (color: ColorInput, emissiveIntensity = 0.25, roughness = 0.5) =>
  standard(color, { emissive: color, emissiveIntensity, roughness })

export interface JabOptions {
  color: ColorInput
  delay?: number
  duration?: number
  size?: number
  side?: number
  height?: number
  priority?: RenderEffectPriority
}

// Doduo-line peck: a beak that stabs from beside the caster's body into the target and retracts.
export function beakJab(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: JabOptions,
): void {
  const size = options.size ?? 0.09
  const group = new THREE.Group()
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(size, size * 4, 8).rotateX(Math.PI / 2),
    lit(options.color, 0.35, 0.4),
  )
  const glint = new THREE.Mesh(
    new THREE.ConeGeometry(size * 0.4, size * 2, 6).rotateX(Math.PI / 2),
    glow('#ffffff', 0.8),
  )
  glint.position.z = size * 1.2
  group.add(beak, glint)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const side = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 200,
    group,
    (p) => {
      bodyPoint(source, options.height ?? 0.7, from)
      target.focusPoint(to, 0.6)
      side
        .subVectors(to, from)
        .setY(0)
        .cross(UP)
        .normalize()
        .multiplyScalar(options.side ?? 0)
      from.add(side)
      const reach = p < 0.5 ? easeInOut(p / 0.5) : 1 - easeInOut((p - 0.5) / 0.5)
      group.position.lerpVectors(from, to, reach * 0.92)
      group.lookAt(to)
    },
    options.priority ?? 'ability',
  )
}

// Grimer/Muk sludge: a lumpy, glossy blob (callers may stud it with junk for Gunk Shot).
export function makeGlob(color: ColorInput, size: number, lumpiness = 0.3): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(size, 1)
  const position = geometry.attributes.position
  const vertex = new THREE.Vector3()
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index)
    const noise =
      1 +
      (Math.sin(vertex.x * 17 + vertex.y * 11) * 0.5 + Math.cos(vertex.z * 13) * 0.5) * lumpiness
    vertex.multiplyScalar(noise)
    position.setXYZ(index, vertex.x, vertex.y, vertex.z)
  }
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, lit(color, 0.3, 0.25))
}

export interface PuddleOptions {
  color: ColorInput
  radius?: number
  delay?: number
  duration?: number
  bubbles?: ColorInput
  priority?: RenderEffectPriority
}

// Acid / sludge pool that spreads on the floor, fizzes, then dries up.
export function puddle(ctx: FxContext, point: PointSource, options: PuddleOptions): void {
  const radius = options.radius ?? 0.6
  const group = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 24), glow(options.color, 0.6))
  disc.rotation.x = -Math.PI / 2
  group.add(disc)
  const count = scaledCount(ctx, 10)
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.bubbles ?? options.color,
    size: 0.12,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const fizz = new THREE.Points(geometry, material)
  fizz.frustumCulled = false
  group.add(fizz)
  const seeds = Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    distance: Math.random(),
    offset: Math.random(),
  }))
  let resolved = false
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    group,
    (p) => {
      if (!resolved) {
        const center = resolvePoint(point)
        group.position.set(center.x, 0.09, center.z)
        resolved = true
      }
      disc.scale.setScalar(
        Math.max(0.01, radius * easeInOut(phase(p, 0, 0.3)) * (1 + 0.06 * Math.sin(p * 30))),
      )
      ;(disc.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - phase(p, 0.6, 1))
      seeds.forEach((seed, index) => {
        const local = (p * 2 + seed.offset) % 1
        positions[index * 3] = Math.cos(seed.angle) * seed.distance * radius
        positions[index * 3 + 1] = local * 0.45
        positions[index * 3 + 2] = Math.sin(seed.angle) * seed.distance * radius
      })
      geometry.attributes.position.needsUpdate = true
      material.opacity = 1 - p
    },
    options.priority ?? 'ability',
  )
}

export interface ExtendOptions {
  color: ColorInput
  tip: THREE.Object3D
  delay?: number
  duration?: number
  thickness?: number
  side?: number
  rise?: number
  material?: THREE.Material
  // Reach (0..1) over the effect's progress; defaults to a snappy out-and-back.
  profile?: (p: number) => number
  priority?: RenderEffectPriority
}

// A limb, tongue or leg that shoots from the caster's current pose to the target with a custom tip;
// unlike stretchLimb it takes any tip mesh, a reach profile (for holds) and a render priority.
export function extend(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: ExtendOptions,
): void {
  const thickness = options.thickness ?? 0.07
  const group = new THREE.Group()
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness, thickness, 1, 8, 1, true),
    options.material ?? standard(options.color, { roughness: 0.5, flatShading: true }),
  )
  group.add(arm, options.tip)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const tip = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const axis = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 240,
    group,
    (p) => {
      source.focusPoint(from, 0.55).add(source.pose.offset)
      from.y += source.pose.lift + (options.rise ?? 0)
      target.focusPoint(to, 0.5)
      side
        .subVectors(to, from)
        .cross(up)
        .normalize()
        .multiplyScalar(options.side ?? 0)
      from.add(side)
      const reach = options.profile
        ? options.profile(p)
        : p < 0.45
          ? 1 - (1 - p / 0.45) ** 3
          : 1 - (p - 0.45) / 0.55
      tip.lerpVectors(from, to, reach)
      const length = Math.max(0.01, from.distanceTo(tip))
      arm.position.lerpVectors(from, tip, 0.5)
      axis.subVectors(tip, from).normalize()
      arm.quaternion.setFromUnitVectors(up, axis)
      arm.scale.set(1, length, 1)
      options.tip.position.copy(tip)
      options.tip.quaternion.setFromUnitVectors(up, axis)
    },
    options.priority,
  )
}

export const scratchA = new THREE.Vector3()

export const scratchB = new THREE.Vector3()

export const scratchSide = new THREE.Vector3()

export const scratchColor = new THREE.Color()

export function cameraAxes(
  ctx: FxContext,
  right: THREE.Vector3,
  up: THREE.Vector3,
  forward: THREE.Vector3,
): void {
  right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
  up.set(0, 1, 0).applyQuaternion(ctx.camera.quaternion)
  forward.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
}

export type FeatherStyle = 'crystal' | 'spike' | 'flame'

export function featherShape(style: FeatherStyle, length: number, width: number): THREE.Shape {
  const shape = new THREE.Shape()
  const w = width / 2
  shape.moveTo(0, 0)
  if (style === 'crystal') {
    shape.lineTo(w, length * 0.32)
    shape.lineTo(w * 0.35, length * 0.86)
    shape.lineTo(0, length)
    shape.lineTo(-w * 0.35, length * 0.86)
    shape.lineTo(-w, length * 0.32)
  } else if (style === 'spike') {
    shape.lineTo(w * 1.1, length * 0.26)
    shape.lineTo(w * 0.3, length * 0.34)
    shape.lineTo(w * 0.9, length * 0.62)
    shape.lineTo(w * 0.1, length * 0.66)
    shape.lineTo(0, length)
    shape.lineTo(-w * 0.55, length * 0.58)
    shape.lineTo(-w * 0.15, length * 0.54)
    shape.lineTo(-w * 0.9, length * 0.22)
  } else {
    shape.bezierCurveTo(w * 1.4, length * 0.2, w * 0.9, length * 0.62, w * 0.15, length)
    shape.quadraticCurveTo(0, length * 0.8, -w * 0.3, length * 0.86)
    shape.bezierCurveTo(-w * 0.2, length * 0.6, -w * 1.2, length * 0.35, 0, 0)
  }
  shape.closePath()
  return shape
}

export interface LegendaryWingOptions {
  style: FeatherStyle
  color: ColorInput
  core: ColorInput
  accent?: ColorInput
  span?: number
  feathers?: number
  heightFactor?: number
  flapRate?: number
  flapAmount?: number
  // Phase window of one powerful downbeat that throws the attack.
  thrust?: [number, number]
  delay?: number
  duration?: number
}

// Two fanned wings of layered feathers (colored halo, bright inner vane, covert row) spread behind the portrait.
export function legendaryWings(
  ctx: FxContext,
  view: UnitView,
  options: LegendaryWingOptions,
): void {
  const span = options.span ?? 1.2
  const count = options.feathers ?? 8
  const duration = options.duration ?? 1500
  const halo = glow(options.color, 0.5)
  const core = glow(options.core, 0.65)
  const accent = glow(options.accent ?? options.core, 0.5)
  const group = new THREE.Group()
  const feathers: { feather: THREE.Object3D; base: number; seed: number }[] = []
  const wings = [1, -1].map((side) => {
    const wing = new THREE.Group()
    for (let index = 0; index < count; index++) {
      const t = index / (count - 1)
      const length = span * (0.55 + 0.45 * Math.sin(Math.PI * (0.25 + 0.6 * t)))
      const width = span * (options.style === 'spike' ? 0.28 : 0.2)
      const feather = new THREE.Group()
      const vane = new THREE.Mesh(
        new THREE.ShapeGeometry(featherShape(options.style, length, width)),
        halo,
      )
      const inner = new THREE.Mesh(
        new THREE.ShapeGeometry(featherShape(options.style, length * 0.82, width * 0.36)),
        core,
      )
      inner.position.z = 0.01
      feather.add(vane, inner)
      const base = -(0.2 + t * 1.65)
      feather.rotation.z = base
      wing.add(feather)
      feathers.push({ feather, base, seed: Math.random() * 10 })
    }
    const coverts = Math.ceil(count / 2)
    for (let index = 0; index < coverts; index++) {
      const t = index / Math.max(1, coverts - 1)
      const covert = new THREE.Mesh(
        new THREE.ShapeGeometry(featherShape(options.style, span * 0.42, span * 0.17)),
        accent,
      )
      covert.position.set(span * 0.06, span * 0.03, 0.02)
      covert.rotation.z = -(0.35 + t * 1.3)
      wing.add(covert)
    }
    group.add(wing)
    return { wing, side }
  })
  const rate = options.flapRate ?? 1.2
  const amount = options.flapAmount ?? 0.2
  const position = new THREE.Vector3()
  const back = new THREE.Vector3()
  let lastCrackle = -1
  fx(ctx, options.delay ?? 0, duration, group, (p, now) => {
    bodyPoint(view, options.heightFactor ?? 0.62, position)
    back.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion).multiplyScalar(0.14)
    group.position.copy(position).add(back)
    group.quaternion.copy(ctx.camera.quaternion)
    const open = easeOut(phase(p, 0, 0.2)) * (1 - easeInOut(phase(p, 0.84, 1)))
    const seconds = (p * duration) / 1000
    const flap = Math.sin(seconds * Math.PI * 2 * rate) * amount * (ctx.reducedMotion ? 0.3 : 1)
    const thrust = options.thrust
      ? Math.sin(Math.PI * phase(p, options.thrust[0], options.thrust[1])) * 0.7
      : 0
    const size = 0.25 + 0.75 * open
    wings.forEach(({ wing, side }) => {
      wing.position.x = side * 0.14
      wing.rotation.z = (1 - open) * 0.9 + flap - thrust
      wing.scale.set(side * size, size, size)
    })
    const crackle = options.style === 'spike' && now - lastCrackle > 50
    if (crackle) lastCrackle = now
    feathers.forEach(({ feather, base, seed }) => {
      if (options.style === 'crystal') {
        feather.scale.setScalar(1 + 0.04 * Math.sin(now * 0.004 + seed))
      } else if (options.style === 'flame') {
        feather.scale.y = 0.85 + 0.18 * Math.sin(now * 0.03 + seed) + 0.07 * Math.sin(now * 0.07)
        feather.rotation.z = base + 0.07 * Math.sin(now * 0.02 + seed)
      } else if (crackle) {
        feather.scale.y = 0.88 + Math.random() * 0.26
        feather.rotation.z = base + (Math.random() - 0.5) * 0.12
      }
    })
    const shimmer =
      options.style === 'spike'
        ? crackle
          ? 0.55 + Math.random() * 0.45
          : 1
        : 0.8 + 0.2 * Math.sin(now * 0.012)
    halo.opacity = 0.5 * open * (options.style === 'spike' ? shimmer : 1)
    core.opacity = 0.65 * open * (options.style === 'spike' ? 1 : shimmer)
    accent.opacity = 0.5 * open
  })
}

export function ribbonMesh(segments: number): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  const vertices = (segments + 1) * 2
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
  const index: number[] = []
  for (let segment = 0; segment < segments; segment++) {
    const a = segment * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geometry.setIndex(index)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  mesh.frustumCulled = false
  return mesh
}

// Rewrites a camera-facing strip along `points` (segments + 1 of them); additive, so darker color = more transparent.
export function writeRibbon(
  mesh: THREE.Mesh,
  points: THREE.Vector3[],
  viewDirection: THREE.Vector3,
  width: (t: number) => number,
  color: (t: number, out: THREE.Color) => void,
): void {
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute
  const colors = mesh.geometry.attributes.color as THREE.BufferAttribute
  const last = points.length - 1
  points.forEach((point, index) => {
    const t = index / last
    scratchA.copy(points[Math.min(last, index + 1)]).sub(points[Math.max(0, index - 1)])
    scratchSide.crossVectors(scratchA, viewDirection)
    if (scratchSide.lengthSq() < 1e-8) scratchSide.set(0, 1, 0)
    scratchSide.normalize().multiplyScalar(width(t) / 2)
    scratchB.copy(point).add(scratchSide)
    position.setXYZ(index * 2, scratchB.x, scratchB.y, scratchB.z)
    scratchB.copy(point).sub(scratchSide)
    position.setXYZ(index * 2 + 1, scratchB.x, scratchB.y, scratchB.z)
    color(t, scratchColor)
    colors.setXYZ(index * 2, scratchColor.r, scratchColor.g, scratchColor.b)
    colors.setXYZ(index * 2 + 1, scratchColor.r, scratchColor.g, scratchColor.b)
  })
  position.needsUpdate = true
  colors.needsUpdate = true
}

export interface TailRibbonOptions {
  from: ColorInput
  to: ColorInput
  count?: number
  length?: number
  width?: number
  // Distance along the camera's right axis between the outermost ribbon roots.
  spread?: number
  droop?: number
  heightFactor?: number
  delay?: number
  duration?: number
}

// Long gradient streamers that ripple away behind a hovering unit: tail plumes, fire trails off wingtips.
export function tailRibbons(ctx: FxContext, view: UnitView, options: TailRibbonOptions): void {
  const segments = 22
  const count = options.count ?? 3
  const length = options.length ?? 1.6
  const width = options.width ?? 0.16
  const spread = options.spread ?? 0.2
  const droop = options.droop ?? 0.5
  const group = new THREE.Group()
  const ribbons = Array.from({ length: count }, () => {
    const mesh = ribbonMesh(segments)
    group.add(mesh)
    return mesh
  })
  const points = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const anchor = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const start = new THREE.Color(options.from)
  const end = new THREE.Color(options.to)
  const wave = ctx.reducedMotion ? 0.4 : 1
  fx(ctx, options.delay ?? 0, options.duration ?? 1400, group, (p, now) => {
    bodyPoint(view, options.heightFactor ?? 0.45, anchor)
    cameraAxes(ctx, right, up, forward)
    const grow = easeOut(phase(p, 0, 0.3))
    const fade = 1 - phase(p, 0.72, 1)
    ribbons.forEach((mesh, ribbon) => {
      const side = count === 1 ? 0 : (ribbon / (count - 1)) * 2 - 1
      points.forEach((point, index) => {
        const t = index / segments
        const reach = length * t * grow
        point
          .copy(anchor)
          .addScaledVector(right, side * (spread / 2 + reach * 0.5))
          .addScaledVector(
            up,
            -reach * droop + Math.sin(t * 5 - now * 0.006 + ribbon * 1.7) * 0.16 * t * wave,
          )
          .addScaledVector(forward, reach * 0.4)
          .addScaledVector(right, Math.cos(t * 4 - now * 0.005 + ribbon) * 0.1 * t * wave)
      })
      writeRibbon(
        mesh,
        points,
        forward,
        (t) => width * (1 - t * 0.8) * (0.5 + 0.5 * grow),
        (t, out) => {
          out
            .copy(start)
            .lerp(end, t)
            .multiplyScalar((1 - t) ** 0.7 * fade)
        },
      )
    })
  })
}

// Six-armed snowflake with two pairs of side branches per arm, in the XY plane.
export function snowflakeGeometry(size: number): THREE.BufferGeometry {
  const vertices: number[] = []
  const rhombus = (ax: number, ay: number, bx: number, by: number, width: number) => {
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const length = Math.hypot(bx - ax, by - ay) || 1
    const px = (-(by - ay) / length) * width
    const py = ((bx - ax) / length) * width
    vertices.push(ax, ay, 0, mx + px, my + py, 0, bx, by, 0)
    vertices.push(ax, ay, 0, bx, by, 0, mx - px, my - py, 0)
  }
  for (let arm = 0; arm < 6; arm++) {
    const angle = (arm / 6) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    rhombus(0, 0, cos * size, sin * size, size * 0.09)
    ;[
      [0.45, 0.32],
      [0.7, 0.22],
    ].forEach(([along, branch]) => {
      const x = cos * size * along
      const y = sin * size * along
      for (const turn of [0.9, -0.9]) {
        rhombus(
          x,
          y,
          x + Math.cos(angle + turn) * size * branch,
          y + Math.sin(angle + turn) * size * branch,
          size * 0.045,
        )
      }
    })
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
}

export interface BoltPath {
  points: THREE.Vector3[]
  width: number
}

// Camera-facing quads along each path; unused slots collapse to zero-area triangles.
export function writeBoltQuads(
  array: Float32Array,
  paths: BoltPath[],
  visible: number[],
  scale: number,
  viewDirection: THREE.Vector3,
): void {
  array.fill(0)
  let offset = 0
  paths.forEach((path, pathIndex) => {
    const count = path.points.length - 1
    for (let segment = 0; segment < count; segment++, offset += 18) {
      if (segment >= visible[pathIndex]) continue
      const a = path.points[segment]
      const b = path.points[segment + 1]
      const width = path.width * scale * (1 - (segment / count) * 0.45)
      scratchSide.subVectors(b, a).cross(viewDirection)
      if (scratchSide.lengthSq() < 1e-8) scratchSide.set(1, 0, 0)
      scratchSide.normalize().multiplyScalar(width / 2)
      const sx = scratchSide.x
      const sy = scratchSide.y
      const sz = scratchSide.z
      array.set(
        [
          a.x + sx,
          a.y + sy,
          a.z + sz,
          a.x - sx,
          a.y - sy,
          a.z - sz,
          b.x + sx,
          b.y + sy,
          b.z + sz,
          b.x + sx,
          b.y + sy,
          b.z + sz,
          a.x - sx,
          a.y - sy,
          a.z - sz,
          b.x - sx,
          b.y - sy,
          b.z - sz,
        ],
        offset,
      )
    }
  })
}

export function boltGroup(quads: number, color: ColorInput, core: ColorInput) {
  const halo = new Float32Array(quads * 18)
  const inner = new Float32Array(quads * 18)
  const haloGeometry = new THREE.BufferGeometry()
  haloGeometry.setAttribute('position', new THREE.BufferAttribute(halo, 3))
  const innerGeometry = new THREE.BufferGeometry()
  innerGeometry.setAttribute('position', new THREE.BufferAttribute(inner, 3))
  const haloMaterial = glow(color, 0.7)
  const innerMaterial = glow(core, 0.9)
  const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial)
  const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial)
  haloMesh.frustumCulled = false
  innerMesh.frustumCulled = false
  innerMesh.renderOrder = 1
  const group = new THREE.Group()
  group.add(haloMesh, innerMesh)
  const refresh = (paths: BoltPath[], visible: number[], viewDirection: THREE.Vector3) => {
    writeBoltQuads(halo, paths, visible, 1, viewDirection)
    writeBoltQuads(inner, paths, visible, 0.3, viewDirection)
    haloGeometry.attributes.position.needsUpdate = true
    innerGeometry.attributes.position.needsUpdate = true
  }
  return { group, haloMaterial, innerMaterial, refresh }
}

export interface ForkedBoltOptions {
  color: ColorInput
  core?: ColorInput
  width?: number
  segments?: number
  branches?: number
  jitter?: number
  // Phase by which the bolt has fully forked down from `from` to `to`.
  reveal?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A thick, branching lightning bolt that forks down its path, re-jitters, and flickers out.
export function forkedBolt(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: ForkedBoltOptions,
): void {
  const segments = options.segments ?? 10
  const branchCount = options.branches ?? 3
  const branchSegments = 4
  const jitter = options.jitter ?? 0.3
  const reveal = options.reveal ?? 0.12
  const width = options.width ?? 0.12
  const { group, haloMaterial, innerMaterial, refresh } = boltGroup(
    segments + branchCount * branchSegments,
    options.color,
    options.core ?? '#fef9c3',
  )
  const main: BoltPath = {
    points: Array.from({ length: segments + 1 }, () => new THREE.Vector3()),
    width,
  }
  const branches = Array.from({ length: branchCount }, () => ({
    path: {
      points: Array.from({ length: branchSegments + 1 }, () => new THREE.Vector3()),
      width: width * 0.55,
    },
    root: 0,
    direction: new THREE.Vector3(),
    length: 0,
  }))
  const offsets = Array.from({ length: segments + 1 }, () => new THREE.Vector3())
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const along = new THREE.Vector3()
  const viewDirection = new THREE.Vector3()
  const paths = [main, ...branches.map((branch) => branch.path)]
  const visible = paths.map(() => 0)
  const seed = Math.random() * 10
  let lastJitter = -1
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 320,
    group,
    (p, now) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      along.subVectors(end, start)
      const distance = along.length()
      if (now - lastJitter > 55) {
        lastJitter = now
        offsets.forEach((offset) =>
          offset.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5),
        )
        branches.forEach((branch) => {
          branch.root = 2 + Math.floor(Math.random() * Math.max(1, segments - 4))
          branch.direction
            .copy(along)
            .normalize()
            .add(
              scratchA
                .set(Math.random() - 0.5, -Math.random() * 0.3, Math.random() - 0.5)
                .multiplyScalar(1.6),
            )
            .normalize()
          branch.length = distance * (0.18 + Math.random() * 0.2)
        })
      }
      main.points.forEach((point, index) => {
        const t = index / segments
        const wobble = index === 0 || index === segments ? 0 : jitter
        point.lerpVectors(start, end, t).addScaledVector(offsets[index], wobble)
      })
      branches.forEach((branch) => {
        const root = main.points[branch.root]
        branch.path.points.forEach((point, index) => {
          const t = index / branchSegments
          point.copy(root).addScaledVector(branch.direction, branch.length * t)
          if (index > 0)
            point.addScaledVector(offsets[(branch.root + index) % offsets.length], jitter * 0.5)
        })
      })
      const shown = Math.ceil(segments * clamp01(p / reveal))
      visible[0] = shown
      branches.forEach((branch, index) => {
        visible[index + 1] =
          shown > branch.root ? Math.min(branchSegments, (shown - branch.root) * 2) : 0
      })
      viewDirection.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
      refresh(paths, visible, viewDirection)
      const flicker = p < reveal + 0.1 ? 1 : Math.sin(now * 0.09 + seed) > -0.2 ? 1 : 0.45
      const fade = (1 - phase(p, 0.55, 1)) * flicker
      haloMaterial.opacity = 0.7 * fade
      innerMaterial.opacity = 0.9 * fade
    },
    options.priority ?? 'ability',
  )
}

export interface GroundArcOptions {
  color: ColorInput
  core?: ColorInput
  radius?: number
  arcs?: number
  delay?: number
  duration?: number
}

// Static electricity crawling over the floor: short jagged arcs that hop around a glowing patch.
export function groundArcs(ctx: FxContext, center: PointSource, options: GroundArcOptions): void {
  const arcs = options.arcs ?? 4
  const radius = options.radius ?? 0.6
  const pieces = 5
  const { group, haloMaterial, innerMaterial, refresh } = boltGroup(
    arcs * pieces,
    options.color,
    options.core ?? '#fef9c3',
  )
  const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), glow(options.color, 0.16))
  patch.rotation.x = -Math.PI / 2
  group.add(patch)
  const paths: BoltPath[] = Array.from({ length: arcs }, () => ({
    points: Array.from({ length: pieces + 1 }, () => new THREE.Vector3()),
    width: 0.06,
  }))
  const visible = paths.map(() => pieces)
  const origin = new THREE.Vector3()
  const viewDirection = new THREE.Vector3()
  let lastHop = -1
  fx(ctx, options.delay ?? 0, options.duration ?? 900, group, (p, now) => {
    origin.copy(resolvePoint(center)).setY(0)
    patch.position.set(origin.x, 0.06, origin.z)
    if (now - lastHop > 80) {
      lastHop = now
      paths.forEach((path, index) => {
        if (lastHop > 0 && Math.random() < 0.4) return
        visible[index] = Math.random() < 0.75 ? pieces : 0
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * radius * 0.8
        const heading = Math.random() * Math.PI * 2
        const length = 0.3 + Math.random() * 0.4
        path.points.forEach((point, piece) => {
          const t = piece / pieces
          const wobble = piece === 0 || piece === pieces ? 0 : 0.09
          point.set(
            origin.x +
              Math.cos(angle) * distance +
              Math.cos(heading) * length * t +
              (Math.random() - 0.5) * wobble,
            0.08 + Math.random() * 0.06,
            origin.z +
              Math.sin(angle) * distance +
              Math.sin(heading) * length * t +
              (Math.random() - 0.5) * wobble,
          )
        })
      })
    }
    viewDirection.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion)
    refresh(paths, visible, viewDirection)
    const fade = fadeInOut(p, 0.08, 0.35)
    haloMaterial.opacity = 0.7 * fade
    innerMaterial.opacity = 0.9 * fade
    setOpacity(patch, fade * (0.7 + 0.3 * Math.sin(now * 0.03)))
  })
}

// Flat ring whose vertex colors run through `colors` around the circumference (rotate it to make the band flow).
export function spectrumRing(
  inner: number,
  outer: number,
  colors: ColorInput[],
  opacity = 0.6,
): THREE.Mesh {
  const geometry = new THREE.RingGeometry(inner, outer, 64, 1)
  const position = geometry.attributes.position
  const palette = colors.map((color) => new THREE.Color(color))
  const tint = new THREE.Color()
  const vertexColors = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index++) {
    const around =
      ((Math.atan2(position.getY(index), position.getX(index)) / (Math.PI * 2) + 1) % 1) *
      palette.length
    const from = Math.floor(around) % palette.length
    tint.copy(palette[from]).lerp(palette[(from + 1) % palette.length], around - Math.floor(around))
    vertexColors.set([tint.r, tint.g, tint.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
  const material = glow('#ffffff', opacity)
  material.vertexColors = true
  return new THREE.Mesh(geometry, material)
}

// Psystrike crystal: a faceted, lit spike along +z with a faint colored sheath.
export function crystalShard(length: number, body: ColorInput, sheath: ColorInput): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0).scale(length * 0.14, length * 0.14, length * 0.5),
      standard(body, {
        roughness: 0.15,
        metalness: 0.35,
        flatShading: true,
        emissive: body,
        emissiveIntensity: 0.45,
        opacity: 0.92,
      }),
    ),
    new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0).scale(length * 0.22, length * 0.22, length * 0.6),
      glow(sheath, 0.3),
    ),
  )
  return group
}

// Teardrop in the XY plane with its point at +y: dew drops and petals.
export function teardropGeometry(width: number, length: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(width, length * 0.2, width * 0.8, length * 0.75, 0, length)
  shape.bezierCurveTo(-width * 0.8, length * 0.75, -width, length * 0.2, 0, 0)
  return new THREE.ShapeGeometry(shape, 10)
}

export const tint = new THREE.Color()
