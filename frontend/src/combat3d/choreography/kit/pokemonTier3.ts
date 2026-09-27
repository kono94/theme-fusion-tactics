import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, orbit, ringMesh, type ColorInput, type FxContext } from '../primitives'
import {
  billboard,
  bodyPoint,
  fadeInOut,
  fx,
  phase,
  resolvePoint,
  scaledCount,
  setOpacity,
  standard,
  tube,
  type PointSource,
} from './shared'

const UP = new THREE.Vector3(0, 1, 0)

export const lit = (color: ColorInput, emissiveIntensity = 0.25, roughness = 0.5) =>
  standard(color, { emissive: color, emissiveIntensity, roughness })

export interface VineOptions {
  color: ColorInput
  delay?: number
  duration?: number
  thickness?: number
  sway?: number
  overhead?: number
  side?: number
  priority?: RenderEffectPriority
}

// Bellsprout-line vine: a tapered tube that rears up on an S-curve, lashes flat onto the target at the
// halfway mark (the crack), then recoils.
export function vine(
  ctx: FxContext,
  source: UnitView,
  target: UnitView,
  options: VineOptions,
): void {
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const side = new THREE.Vector3()
  const sway = options.sway ?? 0.3
  const overhead = options.overhead ?? 0.4
  tube(ctx, {
    material: lit(options.color, 0.2, 0.7),
    delay: options.delay,
    duration: options.duration ?? 420,
    radius: options.thickness ?? 0.045,
    controlPoints: 8,
    taper: true,
    priority: options.priority,
    opacity: (p) => fadeInOut(p, 0.05, 0.15),
    path: (p, points) => {
      bodyPoint(source, 0.5, from)
      target.focusPoint(to, 0.55)
      side.subVectors(to, from).cross(UP).normalize()
      const reach = p < 0.5 ? easeInOut(p / 0.5) : 1 - easeInOut((p - 0.5) / 0.5)
      const rear = 1 - easeInOut(phase(p, 0.2, 0.5))
      points.forEach((point, index) => {
        const t = (index / (points.length - 1)) * Math.max(0.05, reach)
        point.lerpVectors(from, to, t)
        point.y += Math.sin(Math.PI * t) * overhead * rear
        point.addScaledVector(
          side,
          Math.sin(t * Math.PI * 2 + p * 8) * sway * (1 - reach * 0.6) +
            (options.side ?? 0) * Math.sin(Math.PI * t),
        )
      })
    },
  })
}

// Crab pincer: two curved blades hinged at the origin (tips meet at +x when closed); `setOpen` in [0, 1].
export function makePincer(
  color: ColorInput,
  size: number,
): { group: THREE.Group; setOpen: (open: number) => void } {
  const group = new THREE.Group()
  const hinges = [1, -1].map((flip) => {
    const hinge = new THREE.Group()
    const blade = new THREE.Mesh(
      new THREE.TorusGeometry(size, size * 0.28, 8, 18, Math.PI * 0.8),
      lit(color, 0.3, 0.35),
    )
    blade.position.x = size
    blade.scale.y = flip
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.16, size * 0.5, 6),
      lit('#fff7ed', 0.4),
    )
    tooth.position.set(size * 0.1, flip * size * 0.25, 0)
    tooth.rotation.z = flip > 0 ? Math.PI : 0
    blade.add(tooth)
    hinge.add(blade)
    group.add(hinge)
    return { hinge, flip }
  })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(size * 0.55, 12, 8), lit(color, 0.25)))
  return {
    group,
    setOpen: (open) => hinges.forEach(({ hinge, flip }) => (hinge.rotation.z = flip * open * 0.7)),
  }
}

export interface SnapOptions {
  color: ColorInput
  size?: number
  delay?: number
  duration?: number
  snapAt?: number
  lift?: number
  priority?: RenderEffectPriority
}

// A pincer that hovers over the target gaping wide, then snaps shut at `snapAt` (fraction of duration).
export function pincerSnap(ctx: FxContext, target: UnitView, options: SnapOptions): void {
  const size = options.size ?? 0.3
  const pincer = makePincer(options.color, size)
  const snapAt = options.snapAt ?? 0.6
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 600,
    pincer.group,
    (p, now) => {
      target.focusPoint(pincer.group.position, 0.6)
      pincer.group.position.y += (options.lift ?? 0.15) * (1 - phase(p, 0, snapAt))
      billboard(ctx, pincer.group)
      pincer.group.rotateZ(Math.PI)
      pincer.group.translateX(-size)
      const open =
        p < snapAt ? easeInOut(phase(p, 0, snapAt * 0.7)) : 1 - phase(p, snapAt, snapAt + 0.06)
      pincer.setOpen(Math.max(0, open) * (1 + 0.04 * Math.sin(now * 0.08)))
      pincer.group.scale.setScalar(0.6 + 0.4 * phase(p, 0, 0.2))
      setOpacity(pincer.group, 1 - phase(p, 0.85, 1))
    },
    options.priority ?? 'ability',
  )
}

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

export interface RingCageOptions {
  color: ColorInput
  count?: number
  radius?: number
  tube?: number
  heightFactor?: number
  turns?: number
  delay?: number
  duration?: number
}

// Gyroscope of tilted rings enclosing a unit (psychic hold, Aqua Ring veil), composed on the shared `orbit`.
export function ringCage(ctx: FxContext, view: UnitView, options: RingCageOptions): void {
  const count = options.count ?? 3
  orbit(ctx, view, {
    color: options.color,
    count,
    radius: 0.001,
    heightFactor: options.heightFactor ?? 0.55,
    turns: options.turns ?? 1.2,
    delay: options.delay,
    duration: options.duration,
    build: (index) => {
      const gimbal = new THREE.Group()
      const ring = ringMesh(options.color, options.radius ?? 0.5, options.tube ?? 0.03)
      ring.rotation.x = Math.PI / 2 + ((index / count) * Math.PI - Math.PI / 2) * 0.9
      gimbal.add(ring)
      return gimbal
    },
  })
}
