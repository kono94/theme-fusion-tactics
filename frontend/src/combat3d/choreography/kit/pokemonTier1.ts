import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, leafMesh, starGeometry, type ColorInput, type FxContext } from '../primitives'
import { fadeInOut, flat, fx, resolvePoint, setOpacity, standard, type PointSource } from './shared'

const UP = new THREE.Vector3(0, 1, 0)
const HIDDEN_Y = -50

export interface ConeOptions {
  color: ColorInput
  radius?: number
  delay?: number
  duration?: number
  opacity?: number
  flicker?: number
}

// Open cone with its apex at `from` and mouth at `to`.
export function cone(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: ConeOptions,
): void {
  const geometry = new THREE.ConeGeometry(1, 1, 20, 1, true).rotateX(Math.PI).translate(0, 0.5, 0)
  const material = glow(options.color, options.opacity ?? 0.6)
  const mesh = new THREE.Mesh(geometry, material)
  const direction = new THREE.Vector3()
  const radius = options.radius ?? 0.5
  const flicker = options.flicker ?? 0.12
  fx(ctx, options.delay ?? 0, options.duration ?? 600, mesh, (p, now) => {
    const start = resolvePoint(from)
    direction.subVectors(resolvePoint(to), start)
    const length = Math.max(0.05, direction.length())
    mesh.position.copy(start)
    mesh.quaternion.setFromUnitVectors(UP, direction.normalize())
    const grow = Math.min(1, p * 5)
    const width = radius * grow * (1 + Math.sin(now * 0.05) * flicker)
    mesh.scale.set(width, length * grow, width)
    material.opacity = (options.opacity ?? 0.6) * fadeInOut(p, 0.05, 0.3)
  })
}

export interface DrillOptions {
  color: ColorInput
  stripe?: ColorInput
  length?: number
  radius?: number
  delay?: number
  duration?: number
  from: PointSource
  to: PointSource
  spin?: number
  priority?: RenderEffectPriority
}

// A spinning conical drill (beak or horn) that travels from `from` to `to`, tip first.
export function drill(ctx: FxContext, options: DrillOptions): void {
  const length = options.length ?? 0.6
  const radius = options.radius ?? 0.14
  const group = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(radius, length, 12).rotateX(Math.PI / 2).translate(0, 0, -length / 2),
    standard(options.color, { opacity: 1, roughness: 0.3 }),
  )
  const grooves = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 1.04, length, 6, 4)
      .rotateX(Math.PI / 2)
      .translate(0, 0, -length / 2),
    new THREE.MeshBasicMaterial({
      color: options.stripe ?? '#ffffff',
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    }),
  )
  group.add(shaft, grooves)
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 300,
    group,
    (p) => {
      start.copy(resolvePoint(options.from))
      end.copy(resolvePoint(options.to))
      group.position.lerpVectors(start, end, easeInOut(p))
      group.lookAt(end.x + (end.x - start.x), end.y, end.z + (end.z - start.z))
      group.rotateZ(p * (options.spin ?? 30))
      grooves.material.opacity = 0.7 * fadeInOut(p, 0.05, 0.2)
    },
    options.priority,
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

const SIDE = new THREE.Vector3()
const LIFT = new THREE.Vector3()

// Perpendicular basis around a travel direction, for placing things around a jet or a drain path.
function basis(direction: THREE.Vector3): void {
  SIDE.crossVectors(direction, UP)
  if (SIDE.lengthSq() < 1e-4) SIDE.set(1, 0, 0)
  SIDE.normalize()
  LIFT.crossVectors(SIDE, direction).normalize()
}

function liquid(color: ColorInput, opacity: number): THREE.MeshStandardMaterial {
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

function sprayPoints(count: number, color: ColorInput, size: number) {
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

function colorPoints(count: number, size: number) {
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

const phaseOf = (p: number, start: number, end: number): number =>
  Math.min(1, Math.max(0, (p - start) / (end - start)))

const easeOutCubic = (p: number): number => 1 - (1 - p) ** 3

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

export interface VolleyOptions {
  color?: ColorInput
  rim?: ColorInput
  count?: number
  size?: number
  spread?: number
  travel?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Soap-film bubbles: a glossy clear body with a bright camera-facing rim, a shifting iridescent inner ring and a
// small glint, wobbling like jelly in flight; each pops into a ring of foam droplets on arrival.
export function bubbleVolley(
  ctx: FxContext,
  from: PointSource,
  to: PointSource,
  options: VolleyOptions = {},
): void {
  const count = options.count ?? 4
  const size = options.size ?? 0.1
  const travel = options.travel ?? 0.6
  const pop = 0.14
  const spreadWidth = options.spread ?? 0.3
  const perPop = 6
  const group = new THREE.Group()
  const spray = sprayPoints(count * perPop, '#bae6fd', 0.06)
  group.add(spray.points)
  const list = Array.from({ length: count }, (_, index) => {
    const radius = size * (0.75 + Math.random() * 0.5)
    const bubble = new THREE.Group()
    const face = new THREE.Group()
    const iris = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.64, radius * 0.84, 28),
      glow('#c4b5fd', 0.32),
    )
    const glint = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.17, 12), glow('#e0f2fe', 0.7))
    glint.position.set(-radius * 0.4, radius * 0.4, 0.01)
    glint.scale.set(1, 0.55, 1)
    glint.rotation.z = 0.8
    face.add(
      new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.82, radius * 1.03, 28),
        glow(options.rim ?? '#38bdf8', 0.7),
      ),
      iris,
      glint,
    )
    bubble.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        liquid(options.color ?? '#bae6fd', 0.22),
      ),
      face,
    )
    group.add(bubble)
    return {
      bubble,
      face,
      iris,
      launch: count > 1 ? (index / (count - 1)) * (1 - travel - pop) : 0,
      phase: Math.random() * Math.PI * 2,
      lateral: (Math.random() - 0.5) * spreadWidth,
      lift: Math.random() * 0.15,
      popAt: new THREE.Vector3(),
      popped: false,
      dirs: Array.from({ length: perPop }, (_, spoke) => {
        const angle = (spoke / perPop) * Math.PI * 2 + Math.random() * 0.5
        return new THREE.Vector3(Math.cos(angle), 0.4 + Math.random() * 0.8, Math.sin(angle))
      }),
    }
  })
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()
  const direction = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    group,
    (p) => {
      start.copy(resolvePoint(from))
      end.copy(resolvePoint(to))
      basis(direction.subVectors(end, start).normalize())
      list.forEach((item, index) => {
        const t = (p - item.launch) / travel
        const burstAt = index * perPop * 3
        if (t < 0) {
          item.bubble.visible = false
          return
        }
        if (t < 1) {
          item.bubble.visible = true
          item.bubble.position
            .lerpVectors(start, end, t)
            .addScaledVector(
              SIDE,
              item.lateral * Math.sin(Math.PI * t) + Math.sin(t * 10 + item.phase) * 0.04,
            )
          item.bubble.position.y +=
            Math.sin(Math.PI * t) * (0.12 + item.lift) + Math.sin(t * 8 + item.phase) * 0.03
          const jelly = 1 + 0.12 * Math.sin(t * 18 + item.phase)
          const appear = Math.min(1, t * 5)
          item.bubble.scale.set(jelly * appear, (2 - jelly) * appear, jelly * appear)
          ;(item.iris.material as THREE.MeshBasicMaterial).color.setHSL(
            (0.55 + t * 0.6 + item.phase) % 1,
            0.85,
            0.7,
          )
          item.face.quaternion.copy(ctx.camera.quaternion)
          item.popAt.copy(item.bubble.position)
          return
        }
        const popT = (p - item.launch - travel) / pop
        item.bubble.visible = popT < 1
        if (popT < 1) {
          item.bubble.scale.setScalar(1 + popT * 0.9)
          setOpacity(item.bubble, 1 - popT)
          item.face.quaternion.copy(ctx.camera.quaternion)
        }
        item.dirs.forEach((dir, spoke) => {
          const offset = burstAt + spoke * 3
          if (popT > 1.6) {
            spray.positions[offset + 1] = HIDDEN_Y
            return
          }
          spray.positions[offset] = item.popAt.x + dir.x * popT * 0.3
          spray.positions[offset + 1] = item.popAt.y + dir.y * popT * 0.25 - 0.2 * popT * popT
          spray.positions[offset + 2] = item.popAt.z + dir.z * popT * 0.3
        })
      })
      spray.geometry.attributes.position.needsUpdate = true
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

const FLAME_RAMP = ['#fcd34d', '#f97316', '#dc2626', '#44120a'].map((hex) => new THREE.Color(hex))

function rampColor(t: number, out: THREE.Color): THREE.Color {
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

interface BladeSeed {
  x: number
  z: number
  yaw: number
  height: number
  width: number
  phase: number
  distance: number
}

const BLADE_BASE = new THREE.Color('#14532d')
const BLADE_TIP = new THREE.Color('#a3e635')

// Every blade of grass is one triangle in a single merged mesh, so a whole meadow costs one draw call.
function bladeMesh(seeds: BladeSeed[]) {
  const positions = new Float32Array(seeds.length * 9)
  const colors = new Float32Array(seeds.length * 9)
  seeds.forEach((seed, index) => {
    const tip = BLADE_TIP.clone().lerp(new THREE.Color('#4ade80'), Math.random() * 0.6)
    colors.set(
      [
        BLADE_BASE.r,
        BLADE_BASE.g,
        BLADE_BASE.b,
        BLADE_BASE.r,
        BLADE_BASE.g,
        BLADE_BASE.b,
        tip.r,
        tip.g,
        tip.b,
      ],
      index * 9,
    )
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  const update = (grow: (seed: BladeSeed) => number, now: number, gust: number) => {
    seeds.forEach((seed, index) => {
      const g = grow(seed)
      const cos = Math.cos(seed.yaw)
      const sin = Math.sin(seed.yaw)
      const w = seed.width * Math.max(0.2, g)
      const sway =
        (Math.sin(now * 0.005 + seed.phase) * 0.05 +
          Math.sin(seed.distance * 4 - now * 0.008) * gust) *
        g
      positions.set(
        [
          seed.x - cos * w,
          0,
          seed.z - sin * w,
          seed.x + cos * w,
          0,
          seed.z + sin * w,
          seed.x - sin * sway,
          Math.max(0.001, seed.height * g),
          seed.z + cos * sway,
        ],
        index * 9,
      )
    })
    geometry.attributes.position.needsUpdate = true
  }
  return { mesh, material, update }
}

function blossom(petal: ColorInput, size: number): THREE.Group {
  const group = new THREE.Group()
  const petals = new THREE.Mesh(starGeometry(5, size, size * 0.55), flat(petal, 0.95))
  const heart = new THREE.Mesh(new THREE.CircleGeometry(size * 0.3, 10), flat('#facc15', 1))
  heart.position.z = 0.004
  group.add(petals, heart)
  group.rotation.x = -Math.PI / 2
  return group
}

export interface FieldOptions {
  radius?: number
  count?: number
  flowers?: number
  delay?: number
  duration?: number
}

// A meadow that sprouts outward from a point in a wave: grass blades swaying in a travelling gust, small
// blossoms popping open between them, and a soft green tint spreading over the floor.
export function grassField(ctx: FxContext, center: PointSource, options: FieldOptions = {}): void {
  const radius = options.radius ?? 3
  const count = Math.max(30, Math.round((options.count ?? 150) * ctx.particleScale))
  const seeds: BladeSeed[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const distance = radius * Math.sqrt(Math.random())
    return {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      yaw: Math.random() * Math.PI,
      height: 0.14 + Math.random() * 0.26,
      width: 0.022 + Math.random() * 0.018,
      phase: Math.random() * Math.PI * 2,
      distance,
    }
  })
  const blades = bladeMesh(seeds)
  const group = new THREE.Group()
  group.add(blades.mesh)
  const tint = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2),
    flat('#15803d', 0.22),
  )
  tint.position.y = -0.01
  group.add(tint)
  const palette = ['#f9a8d4', '#fde68a', '#f0abfc', '#fecdd3']
  const flowerCount = Math.max(4, Math.round((options.flowers ?? 14) * ctx.particleScale))
  const flowers = Array.from({ length: flowerCount }, (_, index) => {
    const angle = Math.random() * Math.PI * 2
    const distance = radius * (0.2 + 0.8 * Math.sqrt(Math.random()))
    const flower = blossom(palette[index % palette.length], 0.05 + Math.random() * 0.03)
    flower.position.set(
      Math.cos(angle) * distance,
      0.1 + Math.random() * 0.12,
      Math.sin(angle) * distance,
    )
    group.add(flower)
    return { flower, distance, spin: Math.random() * Math.PI }
  })
  const wave = (distance: number) => 0.32 * (distance / radius)
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 1600, group, (p, now) => {
    if (!resolved) {
      const origin = resolvePoint(center)
      group.position.set(origin.x, 0.06, origin.z)
      resolved = true
    }
    const wither = 1 - phaseOf(p, 0.84, 1)
    blades.update(
      (seed) => easeOutCubic(phaseOf(p, wave(seed.distance), wave(seed.distance) + 0.16)) * wither,
      now,
      0.06,
    )
    const spread = easeOutCubic(phaseOf(p, 0, 0.35))
    tint.scale.setScalar(Math.max(0.01, radius * spread))
    ;(tint.material as THREE.MeshBasicMaterial).opacity = 0.22 * spread * wither
    flowers.forEach(({ flower, distance, spin }) => {
      const open = easeOutCubic(phaseOf(p, wave(distance) + 0.12, wave(distance) + 0.24))
      flower.scale.setScalar(Math.max(0.001, open * wither))
      flower.rotation.z = spin + p * 0.8
    })
  })
}

// Grass rippling outward across a unit's tile in rings while leaves spiral up around it.
export function tileRipple(
  ctx: FxContext,
  view: UnitView,
  options: { delay?: number; duration?: number; leaf?: ColorInput } = {},
): void {
  const count = Math.max(16, Math.round(40 * ctx.particleScale))
  const seeds: BladeSeed[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const distance = 0.2 + Math.random() * 0.4
    return {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      yaw: angle + Math.PI / 2,
      height: 0.16 + Math.random() * 0.18,
      width: 0.02 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
      distance,
    }
  })
  const blades = bladeMesh(seeds)
  const group = new THREE.Group()
  group.add(blades.mesh)
  const leaves = Array.from({ length: 5 }, (_, index) => {
    const leaf = leafMesh(index % 2 ? '#4ade80' : (options.leaf ?? '#16a34a'), 0.08)
    group.add(leaf)
    return { leaf, angle: (index / 5) * Math.PI * 2 }
  })
  fx(ctx, options.delay ?? 0, options.duration ?? 1000, group, (p, now) => {
    group.position.copy(view.root.position).setY(0.06)
    const wither = 1 - phaseOf(p, 0.8, 1)
    blades.update(
      (seed) => {
        const front = (seed.distance - 0.2) / 0.4
        const rise = easeOutCubic(phaseOf(p, front * 0.2, front * 0.2 + 0.18))
        const ripple = 1 + 0.35 * Math.sin(seed.distance * 18 - p * 30) * (1 - phaseOf(p, 0.3, 0.7))
        return rise * ripple * wither
      },
      now,
      0.03,
    )
    leaves.forEach(({ leaf, angle }) => {
      const t = phaseOf(p, 0.1, 0.95)
      const a = angle + t * 5
      const r = 0.42 - t * 0.12
      leaf.position.set(Math.cos(a) * r, 0.1 + t * (view.height + 0.2), Math.sin(a) * r)
      leaf.rotation.set(0.6, -a, Math.sin(t * 12) * 0.5)
      leaf.scale.setScalar(Math.max(0.001, Math.min(1, t * 6)))
      ;(leaf.material as THREE.MeshBasicMaterial).opacity = 1 - phaseOf(t, 0.7, 1)
    })
  })
}

function petalGeometry(width: number, length: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(width, length * 0.15, width * 0.95, length * 0.85, 0, length)
  shape.bezierCurveTo(-width * 0.95, length * 0.85, -width, length * 0.15, 0, 0)
  const geometry = new THREE.ShapeGeometry(shape, 10)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const inner = new THREE.Color('#fce7f3')
  const outer = new THREE.Color('#ec4899')
  const color = new THREE.Color()
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index) / width
    const y = position.getY(index) / length
    // Cup the petal across its width and curl the tip back slightly.
    position.setZ(index, -0.3 * x * x * width + 0.12 * y * y * length)
    const vein = Math.abs(x) < 0.08 ? 0.35 : 0
    color.copy(inner).lerp(outer, Math.min(1, y * 1.1 + vein))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

// Venusaur's great back flower: broad pink petals that unfurl above the body over a ring of drooping fronds,
// a golden stamen heart, and pulses of warm light that ripple outward when it releases pollen.
export function giantFlower(
  ctx: FxContext,
  view: UnitView,
  options: { size?: number; pulses?: number[]; delay?: number; duration?: number } = {},
): void {
  const size = options.size ?? 0.5
  const duration = options.duration ?? 1600
  const pulses = options.pulses ?? [0.3]
  const group = new THREE.Group()
  const petals: THREE.Group[] = []
  for (let index = 0; index < 5; index++) {
    const yaw = new THREE.Group()
    yaw.rotation.y = (index / 5) * Math.PI * 2
    const tilt = new THREE.Group()
    tilt.add(
      new THREE.Mesh(
        petalGeometry(size * 0.42, size),
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.6,
          emissive: '#831843',
          emissiveIntensity: 0.25,
          transparent: true,
        }),
      ),
    )
    yaw.add(tilt)
    petals.push(tilt)
    group.add(yaw)
  }
  const fronds: THREE.Group[] = []
  for (let index = 0; index < 4; index++) {
    const yaw = new THREE.Group()
    yaw.rotation.y = (index / 4) * Math.PI * 2 + Math.PI / 4
    const tilt = new THREE.Group()
    const frond = leafMesh('#166534', size * 0.55)
    frond.geometry.rotateX(Math.PI / 2).translate(0, size * 0.55, 0)
    tilt.add(frond)
    yaw.add(tilt)
    fronds.push(tilt)
    group.add(yaw)
  }
  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(size * 0.16, 14, 10),
    standard('#facc15', { emissive: '#ca8a04', emissiveIntensity: 0.6 }),
  )
  heart.position.y = size * 0.06
  const stamens = Array.from({ length: 10 }, (_, index) => {
    const stamen = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.035, 6, 5),
      glow('#fde047', 0.7),
    )
    const angle = (index / 10) * Math.PI * 2
    stamen.position.set(Math.cos(angle) * size * 0.2, size * 0.16, Math.sin(angle) * size * 0.2)
    group.add(stamen)
    return stamen
  })
  const corona = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2),
    glow('#fbbf24', 0.5),
  )
  group.add(heart, corona)
  fx(ctx, options.delay ?? 0, duration, group, (p, now) => {
    group.position
      .copy(view.root.position)
      .add(view.pose.offset)
      .setY(view.height + 0.02 + view.pose.lift)
    const open = easeOutCubic(phaseOf(p, 0, 0.3))
    const close = easeInOut(phaseOf(p, 0.86, 1))
    const breathe = pulses.reduce(
      (sum, at) => sum + 0.08 * Math.sin(Math.PI * phaseOf(p, at, at + 0.15)),
      0,
    )
    petals.forEach((petal, index) => {
      petal.rotation.x = 0.15 + 1.05 * open * (1 - close) + Math.sin(now * 0.004 + index) * 0.04
    })
    fronds.forEach((frond) => {
      frond.rotation.x = 0.4 + 1.1 * open * (1 - close)
    })
    group.rotation.y = p * 0.5
    group.scale.setScalar(Math.max(0.01, (0.35 + 0.65 * open) * (1 - close * 0.7) * (1 + breathe)))
    stamens.forEach((stamen, index) => {
      stamen.position.y = size * (0.14 + 0.03 * Math.sin(now * 0.01 + index))
    })
    const ring = pulses.reduce((best, at) => {
      const local = phaseOf(p, at, at + 0.3)
      return local > 0 && local < 1 ? local : best
    }, 0)
    corona.visible = ring > 0
    corona.scale.setScalar(size * (0.4 + ring * 2.4))
    ;(corona.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ring)
    setOpacity(heart, 1 - close)
  })
}

// Healing pollen: golden motes burst from a point in a rising spiral; most arc over and rain gently onto each
// ally, the rest drift away on the air and linger.
export function pollenBurst(
  ctx: FxContext,
  from: PointSource,
  allies: UnitView[],
  options: { count?: number; travel?: number; delay?: number; duration?: number } = {},
): void {
  const count = Math.max(12, Math.round((options.count ?? 70) * ctx.particleScale))
  const travel = options.travel ?? 0.5
  const cloud = colorPoints(count, 0.075)
  const palette = ['#fde047', '#fef08a', '#facc15', '#f9a8d4', '#bbf7d0'].map(
    (hex) => new THREE.Color(hex),
  )
  const seeds = Array.from({ length: count }, (_, index) => ({
    ally: allies.length && index % 4 !== 3 ? allies[index % allies.length] : undefined,
    launch: Math.random() * 0.4,
    angle: Math.random() * Math.PI * 2,
    arc: 0.9 + Math.random() * 0.7,
    reach: 0.8 + Math.random() * 1.6,
    color: palette[index % palette.length],
    phase: Math.random() * 10,
  }))
  const origin = new THREE.Vector3()
  const peak = new THREE.Vector3()
  const goal = new THREE.Vector3()
  const cursor = new THREE.Vector3()
  let resolved = false
  fx(ctx, options.delay ?? 0, options.duration ?? 1300, cloud.points, (p, now) => {
    if (!resolved) {
      origin.copy(resolvePoint(from))
      resolved = true
    }
    seeds.forEach((seed, index) => {
      const local = (p - seed.launch) / travel
      if (local < 0) return
      let brightness = Math.min(1, local * 6)
      if (seed.ally) {
        seed.ally.focusPoint(goal, 0.7)
        const k = Math.min(1, local)
        peak
          .lerpVectors(origin, goal, 0.5)
          .add(cursor.set(Math.cos(seed.angle) * 0.5, seed.arc, Math.sin(seed.angle) * 0.5))
        const a = (1 - k) * (1 - k)
        const b = 2 * (1 - k) * k
        const c = k * k
        cursor.set(
          origin.x * a + peak.x * b + goal.x * c,
          origin.y * a + peak.y * b + goal.y * c,
          origin.z * a + peak.z * b + goal.z * c,
        )
        const settle = Math.max(0, local - 1)
        cursor.x += Math.cos(seed.angle + now * 0.006) * 0.25 * Math.min(1, settle * 3)
        cursor.z += Math.sin(seed.angle + now * 0.006) * 0.25 * Math.min(1, settle * 3)
        cursor.y -= settle * 0.4
        brightness *= 1 - Math.min(1, settle * 1.2)
      } else {
        const t = Math.min(1.8, local)
        const a = seed.angle + t * 2.5
        cursor.set(
          origin.x + Math.cos(a) * seed.reach * easeOutCubic(Math.min(1, t)),
          origin.y + 0.5 * Math.sin(Math.min(1, t) * Math.PI * 0.5) - Math.max(0, t - 1) * 0.3,
          origin.z + Math.sin(a) * seed.reach * easeOutCubic(Math.min(1, t)),
        )
        brightness *= 1 - phaseOf(t, 1, 1.8)
      }
      brightness *= 0.75 + 0.25 * Math.sin(now * 0.02 + seed.phase)
      cloud.positions.set([cursor.x, cursor.y, cursor.z], index * 3)
      cloud.colors.set(
        [seed.color.r * brightness, seed.color.g * brightness, seed.color.b * brightness],
        index * 3,
      )
    })
    cloud.geometry.attributes.position.needsUpdate = true
    cloud.geometry.attributes.color.needsUpdate = true
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

function leafBlade(length: number, width: number, color: ColorInput): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(width, length * 0.45, 0, length)
  shape.quadraticCurveTo(-width, length * 0.45, 0, 0)
  const geometry = new THREE.ShapeGeometry(shape, 8)
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index) / width
    position.setZ(index, -0.25 * x * x * width)
  }
  geometry.computeVertexNormals()
  return new THREE.Mesh(
    geometry,
    standard(color, { roughness: 0.55, emissive: color, emissiveIntensity: 0.18, opacity: 0.98 }),
  )
}

// A rosette of leaves unfurling like a lotus around a unit's feet, with a soft green ring breathing outward.
export function leafBloom(
  ctx: FxContext,
  view: UnitView,
  options: { size?: number; delay?: number; duration?: number } = {},
): void {
  const size = options.size ?? 0.36
  const group = new THREE.Group()
  const rings = [
    { count: 7, length: size, width: size * 0.34, color: '#16a34a', open: 1.25, offset: 0 },
    {
      count: 7,
      length: size * 0.7,
      width: size * 0.26,
      color: '#4ade80',
      open: 0.75,
      offset: 0.45,
    },
  ]
  const leaves = rings.flatMap((ring) =>
    Array.from({ length: ring.count }, (_, index) => {
      const yaw = new THREE.Group()
      yaw.rotation.y = (index / ring.count) * Math.PI * 2 + ring.offset
      const tilt = new THREE.Group()
      tilt.add(leafBlade(ring.length, ring.width, ring.color))
      tilt.position.z = size * 0.12
      yaw.add(tilt)
      group.add(yaw)
      return { tilt, open: ring.open, lag: ring.offset * 0.2 }
    }),
  )
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2),
    glow('#86efac', 0.55),
  )
  pulse.position.y = 0.02
  group.add(pulse)
  fx(ctx, options.delay ?? 0, options.duration ?? 1100, group, (p, now) => {
    group.position.copy(view.root.position).setY(0.06)
    const close = easeInOut(phaseOf(p, 0.8, 1))
    leaves.forEach(({ tilt, open, lag }) => {
      const unfurl = easeOutCubic(phaseOf(p, lag, lag + 0.3))
      const overshoot = 0.12 * Math.sin(Math.PI * phaseOf(p, lag + 0.2, lag + 0.45))
      tilt.rotation.x =
        0.1 + (open + overshoot) * unfurl * (1 - close) + Math.sin(now * 0.005) * 0.03
    })
    group.rotation.y = p * 0.7
    group.scale.setScalar(Math.max(0.01, 1 - close * 0.6))
    const fade = 1 - phaseOf(p, 0.88, 1)
    setOpacity(group, fade)
    const ring = phaseOf(p, 0.15, 0.7)
    pulse.scale.setScalar(0.2 + ring * 0.9)
    ;(pulse.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.sin(Math.PI * ring) * fade
  })
}
