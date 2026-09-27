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
        ? new THREE.Vector3(Math.cos((index / count) * Math.PI * 2), 0.08, Math.sin((index / count) * Math.PI * 2))
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

export function beam(ctx: FxContext, source: UnitView, target: UnitView, options: BeamOptions): void {
  const width = options.width ?? 0.12
  const group = new THREE.Group()
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(width, width, 1, 12, 1, true), glow(options.color))
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
  const ring = new THREE.Mesh(new THREE.RingGeometry(1 - thickness, 1, 64), glow(options.color, 0.9))
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
    new THREE.CylinderGeometry(radius, radius * 1.2, height, 20, 1, true).translate(0, height / 2, 0),
    glow(options.color, 0.8),
  )
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.35, radius * 0.45, height, 12, 1, true).translate(0, height / 2, 0),
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
    'ability',
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
  const coreMaterial = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })
  const core = new THREE.Line(geometry, coreMaterial)
  core.frustumCulled = false
  const group = new THREE.Group()
  group.add(bolt, core)
  const targetPoint = at(target)
  const from = new THREE.Vector3()
  let lastJitter = -1
  schedule(ctx, options.delay ?? 0, options.duration ?? 260, group, (p, now) => {
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
        positions[index * 3 + 1] = from.y + (to.y - from.y) * t + (Math.random() - 0.5) * wobble * 0.4
        positions[index * 3 + 2] = from.z + (to.z - from.z) * t + (Math.random() - 0.5) * wobble
      }
      geometry.attributes.position.needsUpdate = true
    }
    material.opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3
    coreMaterial.opacity = material.opacity
  })
}

export interface AuraOptions {
  color: ColorInput
  delay?: number
  duration?: number
  count?: number
  radius?: number
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
  schedule(ctx, options.delay ?? 0, options.duration ?? 900, group, (p) => {
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
  })
}

export interface LimbOptions {
  color: ColorInput
  fist?: ColorInput
  delay?: number
  duration?: number
  sideOffset?: number
  thickness?: number
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
  schedule(ctx, options.delay ?? 0, options.duration ?? 260, group, (p) => {
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
  })
}

export interface MotionOptions {
  delay?: number
  duration?: number
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
  schedule(ctx, options.delay ?? 0, options.duration ?? 520, undefined, (p) => {
    offset.subVectors(target.root.position, source.root.position).setY(0)
    const overshoot = options.through ? 1.35 : 0.8
    const outEnd = 0.3
    const backStart = outEnd + hold
    const reach =
      p < outEnd ? easeInOut(p / outEnd) : p < backStart ? 1 : 1 - easeInOut((p - backStart) / (1 - backStart))
    source.pose.offset.addScaledVector(offset, reach * overshoot)
  })
}

export function leap(
  ctx: FxContext,
  source: UnitView,
  options: MotionOptions & { height?: number; slam?: boolean },
): void {
  const height = options.height ?? 1.4
  schedule(ctx, options.delay ?? 0, options.duration ?? 600, undefined, (p) => {
    source.pose.lift += options.slam ? Math.sin(Math.PI * Math.min(1, p * 1.15)) * height : Math.sin(Math.PI * p) * height
    source.pose.scale *= 1 + 0.15 * Math.sin(Math.PI * p)
  })
}

export function spin(ctx: FxContext, source: UnitView, options: MotionOptions & { turns?: number }): void {
  const turns = options.turns ?? 1
  schedule(ctx, options.delay ?? 0, options.duration ?? 500, undefined, (p) => {
    source.pose.spin += easeInOut(p) * Math.PI * 2 * turns
  })
}

export function crouch(ctx: FxContext, source: UnitView, options: MotionOptions): void {
  schedule(ctx, options.delay ?? 0, options.duration ?? 260, undefined, (p) => {
    source.pose.scale *= 1 - 0.14 * Math.sin(Math.PI * p)
    source.pose.lift -= 0.08 * Math.sin(Math.PI * p)
  })
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
