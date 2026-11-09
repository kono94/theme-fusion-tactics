import * as THREE from 'three'
import type { RenderEffectPriority } from '../../../animations/renderPolicy'
import { easeInOut, type UnitView } from '../../unitView'
import { glow, starGeometry, type ColorInput, type FxContext } from '../primitives'
import {
  billboard,
  bodyPoint,
  fadeInOut,
  flat,
  flatDirection,
  fx,
  lit,
  phase,
  resolvePoint,
  setOpacity,
  standard,
  type PointSource,
} from './shared'

export type PointFn = () => THREE.Vector3

export const metal = (color: ColorInput, roughness = 0.3) =>
  standard(color, { metalness: 0.85, roughness, emissive: color, emissiveIntensity: 0.12 })

export interface HoverOptions {
  delay?: number
  duration?: number
  // Fraction of the effect spent growing in and fading out.
  grow?: number
  fade?: number
  face?: boolean
  scale?: number
  update?: (p: number, now: number) => void
  priority?: RenderEffectPriority
}

// Holds a prop at a live anchor: grows in, optionally faces the camera, runs a custom update, fades out.
export function hover(
  ctx: FxContext,
  object: THREE.Object3D,
  anchor: PointSource,
  options: HoverOptions = {},
): void {
  const grow = options.grow ?? 0.15
  const fade = options.fade ?? 0.25
  const scale = options.scale ?? 1
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 600,
    object,
    (p, now) => {
      object.position.copy(resolvePoint(anchor))
      if (options.face) billboard(ctx, object)
      object.scale.setScalar(Math.max(0.01, scale * easeInOut(phase(p, 0, grow))))
      options.update?.(p, now)
      setOpacity(object, 1 - phase(p, 1 - fade, 1))
    },
    options.priority,
  )
}

// A live ground point at fraction `t` from the caster's tile to `overshoot` past the target.
export function linePoint(
  source: UnitView,
  target: UnitView,
  t: number,
  overshoot = 1,
  height = 0.06,
): PointFn {
  const out = new THREE.Vector3()
  const direction = new THREE.Vector3()
  return () => {
    flatDirection(source, target, direction)
    const length = source.root.position.distanceTo(target.root.position) + overshoot
    return out
      .copy(source.root.position)
      .addScaledVector(direction, length * t)
      .setY(height)
  }
}

export function starMesh(color: ColorInput, size: number, points = 5, solid = false): THREE.Mesh {
  return new THREE.Mesh(
    starGeometry(points, size, size * 0.45),
    solid ? lit(color, 0.45, 0.4) : glow(color, 0.85),
  )
}

// Four-point ice diamond (Glaceon's head and body markings).
export function diamondMesh(color: ColorInput, size: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(size, 0),
    standard(color, { emissive: color, emissiveIntensity: 0.35, roughness: 0.15, opacity: 0.85 }),
  )
  mesh.scale.set(0.6, 1.3, 0.35)
  return mesh
}

export interface RingOptions {
  material: () => THREE.Material
  radius?: number
  tube?: number
  heightFactor?: number
  tilt?: number
  spin?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// A torus that wraps a unit's body, spins and breathes: Aqua Ring, Umbreon's rings, Milotic's tail loop.
export function bodyRing(ctx: FxContext, view: UnitView, options: RingOptions): void {
  const radius = options.radius ?? 0.5
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, options.tube ?? 0.045, 10, 48),
    options.material(),
  )
  const holder = new THREE.Group()
  holder.add(ring)
  const center = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 900,
    holder,
    (p, now) => {
      holder.position.copy(bodyPoint(view, options.heightFactor ?? 0.45, center))
      ring.rotation.set(Math.PI / 2 + (options.tilt ?? 0.25) * Math.sin(now * 0.004), 0, 0)
      holder.rotation.y = p * (options.spin ?? 4)
      const grow = easeInOut(phase(p, 0, 0.2))
      holder.scale.setScalar(Math.max(0.01, grow * (1 + 0.05 * Math.sin(now * 0.012))))
      setOpacity(holder, fadeInOut(p, 0.08, 0.25))
    },
    options.priority,
  )
}

export interface DropOptions {
  build: () => THREE.Object3D
  height?: number
  delay?: number
  duration?: number
  tumble?: number
  priority?: RenderEffectPriority
}

// Drops a prop from overhead onto a live point, accelerating; returns nothing, lands at delay + duration * 0.8.
export function drop(ctx: FxContext, point: PointSource, options: DropOptions): void {
  const object = options.build()
  const height = options.height ?? 2.6
  const landed = new THREE.Vector3()
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 500,
    object,
    (p) => {
      const fall = phase(p, 0, 0.8)
      landed.copy(resolvePoint(point))
      object.position.copy(landed)
      object.position.y += height * (1 - fall * fall)
      object.rotation.set(fall * (options.tumble ?? 2), fall * 1.3, 0)
      setOpacity(object, 1 - phase(p, 0.85, 1))
    },
    options.priority,
  )
}

export interface ClawOptions {
  color: ColorInput
  count?: number
  size?: number
  angle?: number
  delay?: number
  duration?: number
  priority?: RenderEffectPriority
}

// Parallel claw streaks that rip across a point facing the camera.
export function clawMarks(ctx: FxContext, point: PointSource, options: ClawOptions): void {
  const count = options.count ?? 3
  const size = options.size ?? 0.5
  const group = new THREE.Group()
  const inner = new THREE.Group()
  inner.rotation.z = options.angle ?? -0.8
  group.add(inner)
  const streaks = Array.from({ length: count }, (_, index) => {
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size * 0.06).translate(size / 2, 0, 0),
      glow(options.color, 0.85),
    )
    streak.position.set(-size / 2, (index - (count - 1) / 2) * size * 0.2, 0)
    inner.add(streak)
    return streak
  })
  fx(
    ctx,
    options.delay ?? 0,
    options.duration ?? 320,
    group,
    (p) => {
      group.position.copy(resolvePoint(point))
      billboard(ctx, group)
      streaks.forEach((streak, index) => {
        streak.scale.x = Math.max(0.01, easeInOut(phase(p, index * 0.08, 0.45 + index * 0.08)))
      })
      setOpacity(group, 1 - phase(p, 0.55, 1))
    },
    options.priority,
  )
}

// Ghostly fist or claw-hand silhouette for Dusknoir; a material factory gives each mesh its own material.
export function ghostHand(size: number, color: ColorInput, opacity = 0.85): THREE.Group {
  const group = new THREE.Group()
  const palm = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), flat(color, opacity))
  palm.scale.set(1, 0.85, 0.7)
  group.add(palm)
  for (let index = 0; index < 4; index++) {
    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.32, 10, 8),
      flat(color, opacity),
    )
    knuckle.position.set((index - 1.5) * size * 0.45, size * 0.35, size * 0.55)
    group.add(knuckle)
  }
  const wisp = new THREE.Mesh(
    new THREE.ConeGeometry(size * 0.7, size * 2.2, 10, 1, true).rotateX(Math.PI / 2),
    flat(color, opacity * 0.5),
  )
  wisp.position.z = -size * 1.4
  group.add(wisp)
  return group
}

// A single glowing eye: dark socket, red iris (Duskull, Dusclops, Dusknoir).
export function ghostEye(size: number, iris: ColorInput = '#ef4444'): THREE.Group {
  const group = new THREE.Group()
  const socket = new THREE.Mesh(new THREE.CircleGeometry(size * 1.5, 24), flat('#111827', 0.75))
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(size, 24), glow(iris, 0.8))
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(size * 0.35, 16), flat('#450a0a', 0.9))
  glowDisc.position.z = 0.01
  pupil.position.z = 0.02
  group.add(socket, glowDisc, pupil)
  return group
}

// Psychic crescent blade (Psycho Cut, Gallade's elbows): a thin swept arc with a bright inner edge.
export function psyBlade(color: ColorInput, edge: ColorInput, size: number): THREE.Group {
  const group = new THREE.Group()
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(size * 0.75, size, 28, 1, 0, Math.PI),
    glow(color, 0.75),
  )
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(size * 0.9, size * 0.97, 28, 1, 0.2, Math.PI - 0.4),
    glow(edge, 0.6),
  )
  group.add(outer, inner)
  return group
}

// Cottony cloud tuft (Swablu and Altaria wings).
export function cottonPuff(size: number, color: ColorInput = '#f8fafc'): THREE.Group {
  const group = new THREE.Group()
  const offsets: [number, number, number][] = [
    [0, 0, 1],
    [-0.7, -0.15, 0.75],
    [0.7, -0.1, 0.8],
    [-0.3, 0.45, 0.7],
    [0.35, 0.4, 0.65],
  ]
  for (const [x, y, s] of offsets) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(size * s, 12, 8),
      standard(color, { roughness: 0.95, opacity: 0.95 }),
    )
    puff.position.set(x * size, y * size, 0)
    group.add(puff)
  }
  return group
}

// Shark jaw silhouette with rows of teeth that bites shut (Sharpedo's Crunch).
export function sharkJaw(
  size: number,
  gum: ColorInput,
  tooth: ColorInput,
): {
  group: THREE.Group
  upper: THREE.Group
  lower: THREE.Group
} {
  const group = new THREE.Group()
  const halves = [1, -1].map((sign) => {
    const half = new THREE.Group()
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.85, size, 28, 1, sign > 0 ? 0 : Math.PI, Math.PI),
      standard(gum, { roughness: 0.6 }),
    )
    half.add(arc)
    for (let index = 0; index < 7; index++) {
      const angle = (sign > 0 ? 0 : Math.PI) + ((index + 0.5) / 7) * Math.PI
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.07, size * 0.28, 6),
        standard(tooth, { roughness: 0.3 }),
      )
      fang.position.set(Math.cos(angle) * size * 0.8, Math.sin(angle) * size * 0.8, 0.01)
      fang.rotation.z = angle + Math.PI / 2
      half.add(fang)
    }
    group.add(half)
    return half
  })
  return { group, upper: halves[0], lower: halves[1] }
}

// Moon disc with a soft crater shading (Umbreon's Moonlight).
export function moonMesh(size: number): THREE.Group {
  const group = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), lit('#fef9c3', 0.55, 0.8))
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(size * 1.15, size * 1.5, 40),
    glow('#fde68a', 0.25),
  )
  const crater = new THREE.Mesh(new THREE.CircleGeometry(size * 0.25, 16), flat('#e7e5b5', 0.7))
  crater.position.set(size * 0.3, size * 0.2, size * 1.01)
  group.add(disc, halo, crater)
  return group
}
