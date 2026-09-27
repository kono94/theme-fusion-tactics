import * as THREE from 'three'
import type { RenderEffectPriority } from '../../animations/renderPolicy'
import type { CameraRig, EffectSystem } from '../effects'
import { easeInOut, type UnitView } from '../unitView'

export type FloatKind = 'damage' | 'skill' | 'heal' | 'shield' | 'skill-name'

export interface FxContext {
  now: number
  effects: EffectSystem
  camera: CameraRig
  particleScale: number
  reducedMotion: boolean
  floatText: (view: UnitView, text: string, kind: FloatKind, delayMs?: number) => void
  flash: (color: string, delayMs: number, durationMs?: number) => void
  enemiesOf: (view: UnitView) => UnitView[]
  alliesOf: (view: UnitView) => UnitView[]
}

export type ColorInput = THREE.ColorRepresentation

type PointSource = THREE.Vector3 | (() => THREE.Vector3)

const resolvePoint = (point: PointSource): THREE.Vector3 =>
  typeof point === 'function' ? point() : point

export const at = (view: UnitView, heightFactor = 0.55): (() => THREE.Vector3) => {
  const point = new THREE.Vector3()
  return () => view.focusPoint(point, heightFactor)
}

export const ground = (view: UnitView): (() => THREE.Vector3) => {
  const point = new THREE.Vector3()
  return () => point.copy(view.root.position).setY(0.08)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function glow(color: ColorInput, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

function scaled(ctx: FxContext, count: number): number {
  return Math.max(2, Math.round(count * ctx.particleScale))
}

function schedule(
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

export function later(ctx: FxContext, delay: number, action: () => void): void {
  let fired = false
  schedule(ctx, delay, 1, undefined, () => {
    if (fired) return
    fired = true
    action()
  })
}

export interface BurstOptions {
  color: ColorInput
  count?: number
  speed?: number
  size?: number
  gravity?: number
  delay?: number
  duration?: number
  spread?: 'sphere' | 'ring' | 'up'
  priority?: RenderEffectPriority
}

export function burst(ctx: FxContext, point: PointSource, options: BurstOptions): void {
  const count = scaled(ctx, options.count ?? 16)
  const speed = options.speed ?? 1.8
  const positions = new Float32Array(count * 3)
  const velocities: THREE.Vector3[] = []
  for (let index = 0; index < count; index++) {
    const velocity =
      options.spread === 'ring'
        ? new THREE.Vector3(
            Math.cos((index / count) * Math.PI * 2),
            0.08,
            Math.sin((index / count) * Math.PI * 2),
          )
        : options.spread === 'up'
          ? new THREE.Vector3((Math.random() - 0.5) * 0.5, 1, (Math.random() - 0.5) * 0.5)
          : new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5)
    velocities.push(velocity.normalize().multiplyScalar(speed * (0.6 + Math.random() * 0.8)))
  }
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
  const gravity = options.gravity ?? 1.4
  const origin = new THREE.Vector3()
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 650,
    points,
    (p) => {
      if (!resolved) {
        origin.copy(resolvePoint(point))
        resolved = true
      }
      velocities.forEach((velocity, index) => {
        positions[index * 3] = origin.x + velocity.x * p
        positions[index * 3 + 1] = origin.y + velocity.y * p - gravity * p * p
        positions[index * 3 + 2] = origin.z + velocity.z * p
      })
      geometry.attributes.position.needsUpdate = true
      material.opacity = 1 - p
    },
    options.priority ?? 'ability',
  )
}

export interface ProjectileOptions {
  color: ColorInput
  core?: ColorInput
  delay?: number
  duration?: number
  size?: number
  arc?: number
  from?: PointSource
  offset?: THREE.Vector3
  shape?: 'orb' | 'shard' | 'bolt'
  priority?: RenderEffectPriority
  onImpact?: () => void
}

export function projectile(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: ProjectileOptions,
): void {
  const size = options.size ?? 0.11
  const group = new THREE.Group()
  const coreGeometry =
    options.shape === 'shard'
      ? new THREE.ConeGeometry(size, size * 4, 6).rotateX(Math.PI / 2)
      : options.shape === 'bolt'
        ? new THREE.CapsuleGeometry(size * 0.6, size * 5, 4, 8).rotateX(Math.PI / 2)
        : new THREE.SphereGeometry(size, 12, 8)
  const core = new THREE.Mesh(coreGeometry, glow(options.core ?? '#ffffff'))
  const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 2, 12, 8), glow(options.color, 0.55))
  group.add(core, halo)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const targetPoint = at(target)
  let fromResolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 260,
    group,
    (p) => {
      if (!fromResolved) {
        from.copy(options.from ? resolvePoint(options.from) : source.focusPoint(from, 0.6))
        if (options.offset) from.add(options.offset)
        fromResolved = true
      }
      to.copy(targetPoint())
      group.position.lerpVectors(from, to, p)
      group.position.y += Math.sin(Math.PI * p) * (options.arc ?? 0.4)
      group.lookAt(to)
      halo.scale.setScalar(1 + 0.3 * Math.sin(p * 20))
    },
    options.priority ?? 'ability',
    options.onImpact,
  )
}

export interface SlashOptions {
  color: ColorInput
  delay?: number
  duration?: number
  angle?: number
  radius?: number
  width?: number
  sweep?: number
  priority?: RenderEffectPriority
}

export function slashArc(ctx: FxContext, point: PointSource, options: SlashOptions): void {
  const radius = options.radius ?? 0.5
  const width = options.width ?? 0.14
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(radius - width, radius, 32, 1, 0, Math.PI * 0.9),
    glow(options.color, 0.95),
  )
  const edge = new THREE.Mesh(
    new THREE.RingGeometry(radius - width * 0.3, radius, 32, 1, 0, Math.PI * 0.9),
    glow('#ffffff', 0.9),
  )
  arc.add(edge)
  const position = new THREE.Vector3()
  const angle = options.angle ?? -1.2
  const sweep = options.sweep ?? 2.4
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 240,
    arc,
    (p) => {
      if (!resolved) {
        position.copy(resolvePoint(point))
        resolved = true
      }
      arc.position.copy(position)
      arc.quaternion.copy(ctx.camera.quaternion)
      arc.rotateZ(angle + easeInOut(p) * sweep)
      arc.scale.setScalar(0.8 + p * 0.6)
      ;(arc.material as THREE.MeshBasicMaterial).opacity = 1 - p * p
      ;(edge.material as THREE.MeshBasicMaterial).opacity = 1 - p
    },
    options.priority ?? 'ability',
  )
}

export interface BeamOptions {
  color: ColorInput
  core?: ColorInput
  delay?: number
  duration?: number
  width?: number
  from?: PointSource
  priority?: RenderEffectPriority
}

export function beam(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: BeamOptions,
): void {
  const width = options.width ?? 0.12
  const group = new THREE.Group()
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(width, width, 1, 12, 1, true),
    glow(options.color),
  )
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.4, width * 0.4, 1, 8, 1, true),
    glow(options.core ?? '#ffffff'),
  )
  group.add(outer, inner)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const direction = new THREE.Vector3()
  const sourcePoint = options.from ?? at(source, 0.6)
  const targetPoint = at(target)
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 380,
    group,
    (p) => {
      from.copy(resolvePoint(sourcePoint))
      to.copy(targetPoint())
      const length = Math.max(0.01, from.distanceTo(to))
      group.position.lerpVectors(from, to, 0.5)
      group.quaternion.setFromUnitVectors(up, direction.subVectors(to, from).normalize())
      const thickness = Math.sin(Math.PI * Math.min(1, p * 1.4)) * 2 + 0.2
      group.scale.set(thickness, length, thickness)
      ;(outer.material as THREE.MeshBasicMaterial).opacity = 1 - p * 0.7
    },
    options.priority ?? 'ability',
  )
}

export interface ShockwaveOptions {
  color: ColorInput
  delay?: number
  duration?: number
  radius?: number
  thickness?: number
  height?: number
  priority?: RenderEffectPriority
}

export function shockwave(ctx: FxContext, point: PointSource, options: ShockwaveOptions): void {
  const radius = options.radius ?? 2
  const thickness = Math.min(0.5, (options.thickness ?? 0.18) / radius)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1 - thickness, 1, 64),
    glow(options.color, 0.9),
  )
  ring.rotation.x = -Math.PI / 2
  const position = new THREE.Vector3()
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 600,
    ring,
    (p) => {
      if (!resolved) {
        position.copy(resolvePoint(point))
        resolved = true
      }
      ring.scale.setScalar(0.2 + easeInOut(p) * radius)
      ring.position.set(position.x, options.height ?? 0.1, position.z)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p)
    },
    options.priority ?? 'ability',
  )
}

export interface PillarOptions {
  color: ColorInput
  delay?: number
  duration?: number
  radius?: number
  height?: number
  priority?: RenderEffectPriority
}

export function pillar(ctx: FxContext, point: PointSource, options: PillarOptions): void {
  const height = options.height ?? 3.5
  const radius = options.radius ?? 0.45
  const group = new THREE.Group()
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.2, height, 20, 1, true).translate(
      0,
      height / 2,
      0,
    ),
    glow(options.color, 0.8),
  )
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.35, radius * 0.45, height, 12, 1, true).translate(
      0,
      height / 2,
      0,
    ),
    glow('#ffffff', 0.9),
  )
  group.add(column, core)
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    group,
    (p) => {
      if (!resolved) {
        const position = resolvePoint(point)
        group.position.set(position.x, 0, position.z)
        resolved = true
      }
      const grow = Math.min(1, p * 4)
      const fade = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4
      group.scale.set(fade, grow, fade)
      group.rotation.y = p * 4
    },
    options.priority ?? 'ability',
  )
}

export interface MeteorOptions {
  color: ColorInput
  trail?: ColorInput
  delay?: number
  duration?: number
  size?: number
  height?: number
  priority?: RenderEffectPriority
  onImpact?: () => void
}

export function meteor(ctx: FxContext, point: PointSource, options: MeteorOptions): void {
  const size = options.size ?? 0.22
  const group = new THREE.Group()
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), glow(options.color))
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(size * 0.9, size * 6, 10, 1, true).translate(0, size * 3, 0),
    glow(options.trail ?? options.color, 0.5),
  )
  group.add(rock, tail)
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 420,
    group,
    (p) => {
      if (!resolved) {
        end.copy(resolvePoint(point)).setY(0.1)
        start.copy(end).add(new THREE.Vector3(-1.4, options.height ?? 6, -1.2))
        resolved = true
      }
      group.position.lerpVectors(start, end, p * p)
      group.lookAt(start)
      group.rotateX(-Math.PI / 2)
      rock.rotation.x += 0.2
    },
    options.priority ?? 'ability',
    options.onImpact,
  )
}

export interface LightningOptions {
  color: ColorInput
  delay?: number
  duration?: number
  from?: PointSource
  segments?: number
  jitter?: number
  priority?: RenderEffectPriority
}

export function lightning(ctx: FxContext, target: UnitView, options: LightningOptions): void {
  const segments = options.segments ?? 10
  const jitter = options.jitter ?? 0.35
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array((segments + 1) * 3)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: options.color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const bolt = new THREE.Line(geometry, material)
  bolt.frustumCulled = false
  const coreMaterial = new THREE.LineBasicMaterial({
    color: '#ffffff',
    transparent: true,
    depthWrite: false,
  })
  const core = new THREE.Line(geometry, coreMaterial)
  core.frustumCulled = false
  const group = new THREE.Group()
  group.add(bolt, core)
  const targetPoint = at(target)
  const from = new THREE.Vector3()
  let lastJitter = -1
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 260,
    group,
    (p, now) => {
      const to = targetPoint()
      if (options.from) {
        from.copy(resolvePoint(options.from))
      } else {
        from.set(to.x + 0.4, to.y + 5, to.z - 0.6)
      }
      if (now - lastJitter > 45) {
        lastJitter = now
        for (let index = 0; index <= segments; index++) {
          const t = index / segments
          const wobble = index === 0 || index === segments ? 0 : jitter
          positions[index * 3] = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * wobble
          positions[index * 3 + 1] =
            from.y + (to.y - from.y) * t + (Math.random() - 0.5) * wobble * 0.4
          positions[index * 3 + 2] = from.z + (to.z - from.z) * t + (Math.random() - 0.5) * wobble
        }
        geometry.attributes.position.needsUpdate = true
      }
      material.opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3
      coreMaterial.opacity = material.opacity
    },
    options.priority ?? 'ability',
  )
}

export interface AuraOptions {
  color: ColorInput
  delay?: number
  duration?: number
  count?: number
  radius?: number
  priority?: RenderEffectPriority
}

export function aura(ctx: FxContext, view: UnitView, options: AuraOptions): void {
  const count = scaled(ctx, options.count ?? 18)
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: (options.radius ?? 0.35) * (0.6 + Math.random() * 0.6),
    delay: Math.random() * 0.4,
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: 0.14,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 48), glow(options.color, 0.8))
  ring.rotation.x = -Math.PI / 2
  const group = new THREE.Group()
  group.add(points, ring)
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    group,
    (p) => {
      const origin = view.root.position
      seeds.forEach((seed, index) => {
        const local = clamp01((p - seed.delay) / (1 - seed.delay))
        positions[index * 3] = origin.x + Math.cos(seed.angle + local * 3) * seed.radius
        positions[index * 3 + 1] = local * (view.height + 0.5)
        positions[index * 3 + 2] = origin.z + Math.sin(seed.angle + local * 3) * seed.radius
      })
      geometry.attributes.position.needsUpdate = true
      material.opacity = 1 - p * p
      ring.position.set(origin.x, 0.09, origin.z)
      ring.scale.setScalar(1 + p * 1.6)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - p)
    },
    options.priority ?? 'ability',
  )
}

export interface LimbOptions {
  color: ColorInput
  fist?: ColorInput
  delay?: number
  duration?: number
  sideOffset?: number
  thickness?: number
  priority?: RenderEffectPriority
}

// Rubber-arm punch: the limb stretches from the caster to the target and snaps back.
export function stretchLimb(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: LimbOptions,
): void {
  const thickness = options.thickness ?? 0.07
  const group = new THREE.Group()
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness, thickness, 1, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: options.color, roughness: 0.6 }),
  )
  const fist = new THREE.Mesh(
    new THREE.SphereGeometry(thickness * 2.4, 14, 10),
    new THREE.MeshStandardMaterial({ color: options.fist ?? options.color, roughness: 0.5 }),
  )
  group.add(arm, fist)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const tip = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const sideOffset = options.sideOffset ?? 0
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 260,
    group,
    (p) => {
      source.focusPoint(from, 0.6)
      target.focusPoint(to, 0.55)
      side.subVectors(to, from).cross(up).normalize().multiplyScalar(sideOffset)
      from.add(side)
      to.add(side.multiplyScalar(0.3))
      const reach = p < 0.45 ? easeInOut(p / 0.45) : 1 - easeInOut((p - 0.45) / 0.55)
      tip.lerpVectors(from, to, reach)
      const length = Math.max(0.01, from.distanceTo(tip))
      arm.position.lerpVectors(from, tip, 0.5)
      arm.quaternion.setFromUnitVectors(up, tip.clone().sub(from).normalize())
      arm.scale.set(1, length, 1)
      fist.position.copy(tip)
    },
    options.priority ?? 'ability',
  )
}

const RANGED_STEP = 0.35

export interface MotionOptions {
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Moves the caster's body toward (and optionally through) the target, then back home.
export function dash(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: MotionOptions & { through?: boolean; hold?: number },
): void {
  const offset = new THREE.Vector3()
  const hold = options.hold ?? 0.25
  // Ranged units cast from their own tile: a dash becomes a short step toward the target.
  const ranged = source.unit.range > 1
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 520,
    undefined,
    (p) => {
      offset.subVectors(target.root.position, source.root.position).setY(0)
      if (ranged) offset.clampLength(0, RANGED_STEP)
      const overshoot = ranged ? 1 : options.through ? 1.35 : 0.8
      const outEnd = 0.3
      const backStart = outEnd + hold
      const reach =
        p < outEnd
          ? easeInOut(p / outEnd)
          : p < backStart
            ? 1
            : 1 - easeInOut((p - backStart) / (1 - backStart))
      source.pose.offset.addScaledVector(offset, reach * overshoot)
    },
    options.priority ?? 'ability',
  )
}

export function leap(
  ctx: FxContext,
  source: UnitView,
  options: MotionOptions & { height?: number; slam?: boolean },
): void {
  const height = options.height ?? 1.4
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 600,
    undefined,
    (p) => {
      source.pose.lift += options.slam
        ? Math.sin(Math.PI * Math.min(1, p * 1.15)) * height
        : Math.sin(Math.PI * p) * height
      source.pose.scale *= 1 + 0.15 * Math.sin(Math.PI * p)
    },
    options.priority ?? 'ability',
  )
}

export function spin(
  ctx: FxContext,
  source: UnitView,
  options: MotionOptions & { turns?: number },
): void {
  const turns = options.turns ?? 1
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    undefined,
    (p) => {
      source.pose.spin += easeInOut(p) * Math.PI * 2 * turns
    },
    options.priority ?? 'ability',
  )
}

export function crouch(ctx: FxContext, source: UnitView, options: MotionOptions): void {
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 260,
    undefined,
    (p) => {
      source.pose.scale *= 1 - 0.14 * Math.sin(Math.PI * p)
      source.pose.lift -= 0.08 * Math.sin(Math.PI * p)
    },
    options.priority ?? 'ability',
  )
}

export function trail(
  ctx: FxContext,
  source: UnitView,
  options: { color: ColorInput; delay?: number; duration?: number },
): void {
  const count = scaled(ctx, 26)
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: 0.2,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  let head = 0
  let seeded = false
  const sample = new THREE.Vector3()
  schedule(ctx, options.delay ?? 0, options.duration ?? 600, points, (p) => {
    sample.copy(source.root.position).add(source.pose.offset)
    sample.y = 0.55 + source.pose.lift
    if (!seeded) {
      for (let index = 0; index < count; index++) {
        positions.set([sample.x, sample.y, sample.z], index * 3)
      }
      seeded = true
    }
    positions[head * 3] = sample.x + (Math.random() - 0.5) * 0.15
    positions[head * 3 + 1] = sample.y + (Math.random() - 0.5) * 0.3
    positions[head * 3 + 2] = sample.z + (Math.random() - 0.5) * 0.15
    head = (head + 1) % count
    geometry.attributes.position.needsUpdate = true
    material.opacity = 1 - p
  })
}

export function cameraPunch(ctx: FxContext, point: PointSource, strength: number, delay = 0): void {
  later(ctx, delay, () => ctx.camera.punch(ctx.now + delay, strength, resolvePoint(point).clone()))
}

export function shake(ctx: FxContext, strength: number, delay = 0, duration = 260): void {
  later(ctx, delay, () => ctx.camera.shake(ctx.now + delay, strength, duration))
}

function easeOut(p: number): number {
  return 1 - (1 - p) * (1 - p)
}

function fadeMaterials(object: THREE.Object3D, opacity: number): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      const material = child.material as THREE.Material & { userData: { baseOpacity?: number } }
      material.userData.baseOpacity ??= material.opacity
      material.opacity = material.userData.baseOpacity * opacity
      material.transparent = true
    }
  })
}

export function starGeometry(points: number, outer: number, inner: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = (index / (points * 2)) * Math.PI * 2 + Math.PI / 2
    if (index === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

// Mesh builders for `prop`: each call creates its own geometry and material.
export function leafMesh(color: ColorInput, size = 0.14): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, -size)
  shape.quadraticCurveTo(size * 0.7, 0, 0, size)
  shape.quadraticCurveTo(-size * 0.7, 0, 0, -size)
  const geometry = new THREE.ShapeGeometry(shape, 6).rotateX(-Math.PI / 2)
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true }),
  )
}

export function crescentMesh(color: ColorInput, size = 0.3): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.RingGeometry(size * 0.72, size, 24, 1, 0, Math.PI),
    glow(color, 0.95),
  )
}

export function rockMesh(color: ColorInput, size = 0.13): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
  )
}

export function orbMesh(color: ColorInput, core: ColorInput = '#ffffff', size = 0.1): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), glow(core)),
    new THREE.Mesh(new THREE.SphereGeometry(size * 1.9, 12, 8), glow(color, 0.5)),
  )
  return group
}

export function ringMesh(color: ColorInput, radius = 0.2, tube = 0.035): THREE.Mesh {
  return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 28), glow(color, 0.9))
}

export interface FlareOptions {
  color: ColorInput
  core?: ColorInput
  size?: number
  rays?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Camera-facing impact glint: a soft disc with a sharp star that pops and fades.
export function flare(ctx: FxContext, point: PointSource, options: FlareOptions): void {
  // Glints stay small and soft under bloom, and dimmer still when many units are fighting.
  const size = Math.min(options.size ?? 0.35, 0.6)
  const intensity = ctx.particleScale < 1 ? 0.45 : 0.7
  const group = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.CircleGeometry(size * 0.55, 20), glow(options.color, 0.75))
  const star = new THREE.Mesh(
    starGeometry(options.rays ?? 4, size, size * 0.13),
    glow(options.core ?? '#ffffff'),
  )
  star.position.z = 0.01
  group.add(disc, star)
  const position = new THREE.Vector3()
  const turn = (Math.random() < 0.5 ? -1 : 1) * 0.7
  const roll = Math.random() * Math.PI
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 220,
    group,
    (p) => {
      if (!resolved) {
        position.copy(resolvePoint(point))
        resolved = true
      }
      group.position.copy(position)
      group.quaternion.copy(ctx.camera.quaternion)
      group.scale.setScalar(p < 0.2 ? 0.3 + 3.5 * p : 1 + (p - 0.2) * 0.3)
      star.rotation.z = roll + turn * p
      ;(disc.material as THREE.MeshBasicMaterial).opacity = 0.75 * intensity * (1 - p)
      ;(star.material as THREE.MeshBasicMaterial).opacity = intensity * (1 - p * p)
    },
    options.priority ?? 'ability',
  )
}

export interface PropOptions {
  build: () => THREE.Object3D
  delay?: number
  duration?: number
  arc?: number
  from?: PointSource
  to?: PointSource
  offset?: THREE.Vector3
  // Radians around the travel axis over the whole flight.
  spin?: number
  // Radians around the prop's local up axis over the whole flight (flat shuriken spin).
  tumble?: number
  grow?: number
  fadeOut?: number
  // Easing of the travel progress only (spin, grow and fade still use linear time).
  ease?: (p: number) => number
  priority?: RenderEffectPriority
  onImpact?: () => void
}

// Flies a custom mesh from the caster to the target; the mesh's +z faces the travel direction.
export function prop(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: PropOptions,
): void {
  const object = options.build()
  const holder = new THREE.Group()
  holder.add(object)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const targetPoint = options.to ?? at(target)
  const grow = options.grow ?? 0
  const fadeOut = options.fadeOut ?? 0
  let fromResolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 260,
    holder,
    (p) => {
      if (!fromResolved) {
        from.copy(options.from ? resolvePoint(options.from) : source.focusPoint(from, 0.6))
        if (options.offset) from.add(options.offset)
        fromResolved = true
      }
      to.copy(resolvePoint(targetPoint))
      const travel = options.ease ? options.ease(p) : p
      holder.position.lerpVectors(from, to, travel)
      holder.position.y += Math.sin(Math.PI * travel) * (options.arc ?? 0.3)
      holder.lookAt(to)
      object.rotation.set(0, (options.tumble ?? 0) * p, (options.spin ?? 0) * p)
      holder.scale.setScalar(1 + grow * p)
      if (fadeOut > 0 && p > 1 - fadeOut) fadeMaterials(object, (1 - p) / fadeOut)
    },
    options.priority ?? 'ability',
    options.onImpact,
  )
}

export interface SpikeOptions {
  color: ColorInput
  count?: number
  radius?: number
  height?: number
  width?: number
  tilt?: number
  solid?: boolean
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Ground spikes (rock, ice, steel) that erupt, hold, then sink back.
export function spikes(ctx: FxContext, point: PointSource, options: SpikeOptions): void {
  const count = Math.max(1, Math.round((options.count ?? 6) * Math.max(0.5, ctx.particleScale)))
  const height = options.height ?? 0.9
  const width = options.width ?? 0.13
  const radius = options.radius ?? 0.45
  const tilt = options.tilt ?? 0.35
  const group = new THREE.Group()
  const geometry = new THREE.ConeGeometry(width, 1, 5).translate(0, 0.5, 0)
  const material = options.solid
    ? new THREE.MeshStandardMaterial({
        color: options.color,
        roughness: 0.55,
        metalness: 0.2,
        flatShading: true,
        transparent: true,
      })
    : glow(options.color, 0.9)
  const heights: number[] = []
  for (let index = 0; index < count; index++) {
    const spike = new THREE.Mesh(geometry, material)
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5
    const distance = index === 0 ? 0 : radius * (0.5 + Math.random() * 0.5)
    spike.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
    const lean = index === 0 ? 0 : tilt
    spike.rotation.set(Math.sin(angle) * lean, 0, -Math.cos(angle) * lean)
    heights.push(height * (index === 0 ? 1.15 : 0.55 + Math.random() * 0.45))
    group.add(spike)
  }
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    group,
    (p) => {
      if (!resolved) {
        const position = resolvePoint(point)
        group.position.set(position.x, 0.02, position.z)
        resolved = true
      }
      const rise = p < 0.18 ? easeOut(p / 0.18) : p < 0.72 ? 1 : 1 - easeInOut((p - 0.72) / 0.28)
      group.children.forEach((spike, index) => {
        spike.scale.set(1, Math.max(0.001, rise * heights[index]), 1)
      })
      material.opacity = p < 0.72 ? 0.95 : 0.95 * (1 - (p - 0.72) / 0.28)
    },
    options.priority ?? 'ability',
  )
}

export interface VortexOptions {
  color: ColorInput
  secondary?: ColorInput
  height?: number
  radius?: number
  rings?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Funnel of spinning partial rings: tornadoes, whirlpools, psychic spirals.
export function vortex(ctx: FxContext, point: PointSource, options: VortexOptions): void {
  const rings = options.rings ?? 6
  const height = options.height ?? 2.2
  const radius = options.radius ?? 0.7
  const group = new THREE.Group()
  for (let index = 0; index < rings; index++) {
    const t = index / Math.max(1, rings - 1)
    const ringRadius = radius * (0.35 + 0.65 * t)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.82, ringRadius, 28, 1, 0, Math.PI * 1.4),
      glow(index % 2 && options.secondary ? options.secondary : options.color, 0.8),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1 + height * t
    group.add(ring)
  }
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 800,
    group,
    (p, now) => {
      if (!resolved) {
        const position = resolvePoint(point)
        group.position.set(position.x, 0, position.z)
        resolved = true
      }
      const grow = p < 0.2 ? easeOut(p / 0.2) : 1
      const fade = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25
      group.children.forEach((ring, index) => {
        ring.rotation.z = now * 0.012 * (1 + index * 0.15) + index
        ring.position.x = Math.sin(now * 0.006 + index * 0.8) * 0.06 * index
        ring.scale.setScalar(grow)
        ;((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8 * fade
      })
    },
    options.priority ?? 'ability',
  )
}

export interface CloudOptions {
  color: ColorInput
  count?: number
  radius?: number
  size?: number
  rise?: number
  opacity?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Soft, non-additive puffs for smoke, toxic gas, dust and sand.
export function cloud(ctx: FxContext, point: PointSource, options: CloudOptions): void {
  const count = Math.max(3, Math.round((options.count ?? 7) * Math.max(0.5, ctx.particleScale)))
  const radius = options.radius ?? 0.6
  const size = options.size ?? 0.35
  const rise = options.rise ?? 0.4
  const opacity = options.opacity ?? 0.55
  const group = new THREE.Group()
  const geometry = new THREE.SphereGeometry(1, 10, 8)
  const material = new THREE.MeshBasicMaterial({
    color: options.color,
    transparent: true,
    opacity,
    depthWrite: false,
  })
  const seeds = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + Math.random()
    const distance = radius * Math.sqrt(Math.random())
    return {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      y: Math.random() * 0.3,
      scale: size * (0.6 + Math.random() * 0.7),
    }
  })
  seeds.forEach(() => group.add(new THREE.Mesh(geometry, material)))
  const origin = new THREE.Vector3()
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    group,
    (p) => {
      if (!resolved) {
        origin.copy(resolvePoint(point))
        resolved = true
      }
      const swell = easeOut(Math.min(1, p * 2.5))
      group.children.forEach((puff, index) => {
        const seed = seeds[index]
        puff.position.set(
          origin.x + seed.x * (0.5 + swell * 0.7),
          origin.y + seed.y + rise * p,
          origin.z + seed.z * (0.5 + swell * 0.7),
        )
        puff.scale.setScalar(seed.scale * (0.3 + swell * 0.9))
      })
      material.opacity = opacity * (p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5)
    },
    options.priority ?? 'ability',
  )
}

export interface SwarmOptions {
  color: ColorInput
  count?: number
  size?: number
  delay?: number
  duration?: number
  // Fraction of the duration spent flying to the target before buzzing around it.
  travel?: number
  priority?: RenderEffectPriority
}

// A buzzing cloud (bugs, bats, petals) that flies to the target and circles it.
export function swarm(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: SwarmOptions,
): void {
  const count = scaled(ctx, options.count ?? 22)
  const travel = options.travel ?? 0.45
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => ({
    phase: Math.random() * Math.PI * 2,
    speed: 8 + Math.random() * 8,
    radius: 0.2 + Math.random() * 0.35,
    lag: Math.random() * 0.25,
    height: (Math.random() - 0.5) * 0.5,
  }))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: options.size ?? 0.1,
    transparent: true,
    depthWrite: false,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const center = new THREE.Vector3()
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    points,
    (p) => {
      if (!resolved) {
        source.focusPoint(from, 0.6)
        resolved = true
      }
      target.focusPoint(to, 0.55)
      seeds.forEach((seed, index) => {
        const reach = easeInOut(clamp01((p - seed.lag * travel) / travel))
        center.lerpVectors(from, to, reach)
        center.y += Math.sin(Math.PI * reach) * 0.5
        const angle = seed.phase + p * seed.speed
        const radius = seed.radius * (0.4 + reach * 0.8)
        positions[index * 3] = center.x + Math.cos(angle) * radius
        positions[index * 3 + 1] = center.y + seed.height + Math.sin(angle * 1.7) * 0.12
        positions[index * 3 + 2] = center.z + Math.sin(angle) * radius
      })
      geometry.attributes.position.needsUpdate = true
      material.opacity = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15
    },
    options.priority ?? 'ability',
  )
}

export interface OrbitOptions {
  color: ColorInput
  count?: number
  radius?: number
  heightFactor?: number
  size?: number
  turns?: number
  // Radius multiplier reached at the end of the effect (<1 converges inward, >1 flies outward).
  collapse?: number
  // Keep flat glyphs facing the camera while they circle.
  billboard?: boolean
  build?: (index: number) => THREE.Object3D
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Objects circling a unit: daze stars, buff runes, steel blades, leaves.
export function orbit(ctx: FxContext, view: UnitView, options: OrbitOptions): void {
  const count = options.count ?? 4
  const radius = options.radius ?? 0.45
  const size = options.size ?? 0.07
  const turns = options.turns ?? 1.5
  const collapse = options.collapse ?? 1
  const group = new THREE.Group()
  for (let index = 0; index < count; index++) {
    group.add(
      options.build?.(index) ??
        new THREE.Mesh(new THREE.OctahedronGeometry(size), glow(options.color)),
    )
  }
  const center = new THREE.Vector3()
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 800,
    group,
    (p) => {
      view.focusPoint(center, options.heightFactor ?? 0.55)
      center.add(view.pose.offset)
      center.y += view.pose.lift
      const currentRadius = radius * (1 + (collapse - 1) * easeInOut(p))
      const appear = Math.min(1, p * 6)
      group.children.forEach((child, index) => {
        const angle = (index / count) * Math.PI * 2 + p * turns * Math.PI * 2
        child.position.set(
          center.x + Math.cos(angle) * currentRadius,
          center.y + Math.sin(angle * 2 + index) * 0.05,
          center.z + Math.sin(angle) * currentRadius,
        )
        if (options.billboard) child.quaternion.copy(ctx.camera.quaternion)
        else child.rotation.y = angle
        child.scale.setScalar(appear)
      })
      if (p > 0.8) fadeMaterials(group, (1 - p) / 0.2)
    },
    options.priority ?? 'ability',
  )
}

export interface ChargeOptions {
  color: ColorInput
  core?: ColorInput
  size?: number
  count?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Anticipation: particles converge into a growing sphere, which pops at the end.
export function chargeOrb(ctx: FxContext, point: PointSource, options: ChargeOptions): void {
  const size = options.size ?? 0.22
  const count = scaled(ctx, options.count ?? 16)
  const group = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(size * 0.55, 14, 10),
    glow(options.core ?? '#ffffff'),
  )
  const shell = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), glow(options.color, 0.55))
  const positions = new Float32Array(count * 3)
  const directions = Array.from({ length: count }, () =>
    new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(0.6 + Math.random() * 0.6),
  )
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: 0.08,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  group.add(core, shell, points)
  const center = new THREE.Vector3()
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 420,
    group,
    (p, now) => {
      center.copy(resolvePoint(point))
      core.position.copy(center)
      shell.position.copy(center)
      const grow = easeInOut(Math.min(1, p / 0.85))
      const pop = p > 0.85 ? 1 + (p - 0.85) * 6 : 1
      core.scale.setScalar(Math.max(0.01, grow * pop))
      shell.scale.setScalar(Math.max(0.01, grow * pop * (1 + 0.12 * Math.sin(now * 0.05))))
      directions.forEach((direction, index) => {
        const local = (p * 2.2 + index / count) % 1
        const distance = 1 - local
        positions[index * 3] = center.x + direction.x * distance
        positions[index * 3 + 1] = center.y + direction.y * distance
        positions[index * 3 + 2] = center.z + direction.z * distance
      })
      geometry.attributes.position.needsUpdate = true
      const fade = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1
      ;(core.material as THREE.MeshBasicMaterial).opacity = fade
      ;(shell.material as THREE.MeshBasicMaterial).opacity = 0.55 * fade
      material.opacity = p > 0.8 ? 0 : 1
    },
    options.priority ?? 'ability',
  )
}

export interface HaloOptions {
  color: ColorInput
  radius?: number
  direction?: 'rise' | 'fall'
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A glowing band that sweeps along a unit's body: rising for buffs, falling for debuffs.
export function halo(ctx: FxContext, view: UnitView, options: HaloOptions): void {
  const radius = options.radius ?? 0.48
  const group = new THREE.Group()
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.8, radius, 40),
    glow(options.color, 0.9),
  )
  ring.rotation.x = -Math.PI / 2
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.16, 32, 1, true),
    glow(options.color, 0.35),
  )
  group.add(ring, band)
  const top = view.height + 0.15
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 600,
    group,
    (p) => {
      const travel = easeInOut(p)
      const y = options.direction === 'fall' ? top * (1 - travel) : top * travel
      group.position.set(
        view.root.position.x + view.pose.offset.x,
        0.08 + y + view.pose.lift,
        view.root.position.z + view.pose.offset.z,
      )
      const alpha = Math.sin(Math.PI * p)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * alpha
      ;(band.material as THREE.MeshBasicMaterial).opacity = 0.35 * alpha
      group.scale.setScalar(options.direction === 'fall' ? 1.1 - 0.25 * p : 0.9 + 0.25 * p)
    },
    options.priority ?? 'ability',
  )
}

export interface SigilOptions {
  color: ColorInput
  secondary?: ColorInput
  radius?: number
  points?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Flat rune circle on the ground under a caster or target.
export function sigil(ctx: FxContext, point: PointSource, options: SigilOptions): void {
  const radius = options.radius ?? 0.8
  const group = new THREE.Group()
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.92, radius, 48),
    glow(options.color, 0.85),
  )
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.52, radius * 0.57, 40),
    glow(options.secondary ?? options.color, 0.7),
  )
  const star = new THREE.Mesh(
    starGeometry(options.points ?? 6, radius * 0.9, radius * 0.4),
    glow(options.secondary ?? options.color, 0.35),
  )
  group.add(outer, inner, star)
  group.rotation.x = -Math.PI / 2
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    group,
    (p) => {
      if (!resolved) {
        const position = resolvePoint(point)
        group.position.set(position.x, 0.09, position.z)
        resolved = true
      }
      group.scale.setScalar(p < 0.2 ? easeOut(p / 0.2) : 1)
      star.rotation.z = p * 1.6
      inner.rotation.z = -p * 2.4
      const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3
      fadeMaterials(group, fade)
    },
    options.priority ?? 'ability',
  )
}

// Pose knockback away from a point: fast out, eased return.
export function pushBack(
  ctx: FxContext,
  victim: UnitView,
  from: PointSource,
  options: MotionOptions & { distance?: number; lift?: number; priority?: RenderEffectPriority },
): void {
  const direction = new THREE.Vector3()
  const distance = (options.distance ?? 0.35) * (ctx.reducedMotion ? 0.3 : 1)
  let resolved = false
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 360,
    undefined,
    (p) => {
      if (!resolved) {
        direction.subVectors(victim.root.position, resolvePoint(from)).setY(0)
        if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1)
        direction.normalize()
        resolved = true
      }
      const reach = p < 0.25 ? easeOut(p / 0.25) : 1 - easeInOut((p - 0.25) / 0.75)
      victim.pose.offset.addScaledVector(direction, reach * distance)
      victim.pose.lift += Math.sin(Math.PI * p) * (options.lift ?? 0)
      victim.pose.tilt += reach * 0.25 * Math.sign(direction.x || 1)
    },
    options.priority ?? 'ability',
  )
}

// Lifts a unit off the ground and wobbles it (psychic hold, tornado, uppercut).
export function levitate(
  ctx: FxContext,
  view: UnitView,
  options: MotionOptions & { height?: number; wobble?: number; spins?: number },
): void {
  const height = (options.height ?? 0.5) * (ctx.reducedMotion ? 0.3 : 1)
  schedule(
    ctx,
    options.delay ?? 0,
    options.duration ?? 700,
    undefined,
    (p) => {
      const lift = Math.sin(Math.PI * p)
      view.pose.lift += lift * height
      view.pose.tilt += Math.sin(p * Math.PI * 6) * (options.wobble ?? 0.15) * lift
      view.pose.spin += ctx.reducedMotion ? 0 : easeInOut(p) * Math.PI * 2 * (options.spins ?? 0)
    },
    options.priority ?? 'ability',
  )
}
